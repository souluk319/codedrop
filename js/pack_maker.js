/**
 * CodeDrop Pack Maker
 * Search-grounded custom data pack builder for DROP mode.
 */

const PackMaker = (() => {
    const STORAGE_KEY = 'codedrop_pack_maker_draft';
    const CHAT_LIMIT = 8;

    const stateRef = {
        draft: { title: '', description: '', items: [] },
        chat: [],
        mine: [],
        public: [],
        busy: false,
        abort: null,
        autoStick: true
    };

    const ui = {};

    function $(id) {
        return document.getElementById(id);
    }

    function authHeaders() {
        return state.userToken ? { Authorization: `Bearer ${state.userToken}` } : {};
    }

    function customPackValue(id) {
        return `PACK_${id}`;
    }

    function escapeText(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function packIdFromValue(value) {
        const match = String(value || '').match(/^PACK_(\d+)$/);
        return match ? match[1] : null;
    }

    function renderStatus(text, danger = false) {
        if (!ui.status) return;
        ui.status.textContent = text;
        ui.status.classList.toggle('danger', danger);
    }

    function setBusy(busy) {
        stateRef.busy = busy;
        if (ui.send) {
            ui.send.textContent = busy ? 'STOP' : 'ASK';
            ui.send.classList.toggle('stop', busy);
        }
        if (ui.input) ui.input.disabled = busy;
        if (busy) renderStatus('SEARCHING + STREAMING');
    }

    function clearNode(node) {
        while (node && node.firstChild) node.removeChild(node.firstChild);
    }

    function appendChat(role, text) {
        if (!ui.chatLog) return null;
        const msg = document.createElement('div');
        msg.className = `pack-maker-msg ${role}`;
        const label = document.createElement('div');
        label.className = 'pack-maker-msg-label';
        label.textContent = role === 'user' ? 'YOU' : role === 'system' ? 'SYSTEM' : 'PACK MAKER';
        const body = document.createElement('div');
        body.className = 'pack-maker-msg-body';
        body.textContent = text || '';
        msg.append(label, body);
        ui.chatLog.appendChild(msg);
        scrollChat();
        return body;
    }

    function scrollChat(force = false) {
        if (!ui.chatLog) return;
        if (force || stateRef.autoStick) ui.chatLog.scrollTop = ui.chatLog.scrollHeight;
    }

    function persistDraft() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stateRef.draft));
        } catch (e) {
            // local draft restore is best effort only.
        }
    }

    function loadDraftFromStorage() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (saved && Array.isArray(saved.items)) {
                stateRef.draft = normalizeDraft(saved);
            }
        } catch (e) {
            stateRef.draft = { title: '', description: '', items: [] };
        }
    }

    function normalizeSource(source) {
        const url = escapeText(source && source.url);
        if (!/^https?:\/\//i.test(url)) return null;
        return {
            title: escapeText(source.title) || url,
            url,
            snippet: escapeText(source.snippet)
        };
    }

    function normalizeDraft(draft) {
        const seen = new Set();
        const items = Array.isArray(draft.items) ? draft.items : [];
        return {
            id: draft.id || null,
            title: escapeText(draft.title).slice(0, 60),
            description: escapeText(draft.description).slice(0, 240),
            status: draft.status || 'draft',
            items: items.map(item => {
                const term = escapeText(item.term || item.text || item.word).slice(0, 80);
                const desc = escapeText(item.desc || item.description || item.explain).slice(0, 180);
                const key = term.toLowerCase();
                if (!term || !desc || seen.has(key)) return null;
                seen.add(key);
                const sources = (Array.isArray(item.sources) ? item.sources : [])
                    .map(normalizeSource)
                    .filter(Boolean)
                    .slice(0, 3);
                return { term, desc, sources };
            }).filter(Boolean).slice(0, 120)
        };
    }

    function collectDraftFromEditor() {
        const rows = Array.from(ui.itemBody.querySelectorAll('tr'));
        const items = rows.map(row => {
            const term = row.querySelector('[data-field="term"]').value;
            const desc = row.querySelector('[data-field="desc"]').value;
            const url = row.querySelector('[data-field="url"]').value;
            const title = row.querySelector('[data-field="sourceTitle"]').value;
            const snippet = row.querySelector('[data-field="snippet"]').value;
            return {
                term,
                desc,
                sources: url ? [{ title, url, snippet }] : []
            };
        });

        stateRef.draft = normalizeDraft({
            ...stateRef.draft,
            title: ui.title.value,
            description: ui.description.value,
            items
        });
        persistDraft();
        return stateRef.draft;
    }

    function renderDraft(options = {}) {
        if (!ui.title || !ui.itemBody) return;
        const updateStatus = options.updateStatus !== false;
        ui.title.value = stateRef.draft.title || '';
        ui.description.value = stateRef.draft.description || '';
        clearNode(ui.itemBody);

        stateRef.draft.items.forEach((item, index) => addItemRow(item, index));
        if (updateStatus) renderStatus(`${stateRef.draft.items.length}/120 ITEMS`);
        persistDraft();
    }

    function makeInput(value, field, placeholder) {
        const input = document.createElement('input');
        input.value = value || '';
        input.dataset.field = field;
        input.placeholder = placeholder;
        input.addEventListener('input', () => {
            renderStatus('UNSAVED DRAFT');
        });
        return input;
    }

    function addItemRow(item = {}, index = 0) {
        const row = document.createElement('tr');
        const source = (item.sources || [])[0] || {};

        const orderCell = document.createElement('td');
        orderCell.className = 'pack-maker-order';
        orderCell.textContent = String(index + 1).padStart(2, '0');

        const termCell = document.createElement('td');
        termCell.appendChild(makeInput(item.term, 'term', 'term'));

        const descCell = document.createElement('td');
        descCell.appendChild(makeInput(item.desc, 'desc', '한줄 설명'));

        const sourceCell = document.createElement('td');
        sourceCell.className = 'pack-maker-source-cell';
        sourceCell.appendChild(makeInput(source.url, 'url', 'https://source'));
        sourceCell.appendChild(makeInput(source.title, 'sourceTitle', 'source title'));
        sourceCell.appendChild(makeInput(source.snippet, 'snippet', 'snippet'));

        const actionCell = document.createElement('td');
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'btn-small pack-maker-row-btn';
        del.textContent = 'DEL';
        del.addEventListener('click', () => {
            row.remove();
            renumberRows();
            collectDraftFromEditor();
            renderStatus('UNSAVED DRAFT');
        });
        actionCell.appendChild(del);

        row.append(orderCell, termCell, descCell, sourceCell, actionCell);
        ui.itemBody.appendChild(row);
    }

    function renumberRows() {
        Array.from(ui.itemBody.querySelectorAll('.pack-maker-order')).forEach((cell, index) => {
            cell.textContent = String(index + 1).padStart(2, '0');
        });
    }

    function injectPack(pack) {
        if (!pack || !Array.isArray(pack.items)) return;
        const key = customPackValue(pack.id);
        WORD_PACKS[key] = pack.items.map(item => item.term);
        pack.items.forEach(item => {
            WORD_DESCS[item.term] = item.desc;
        });
    }

    async function loadPackDetail(id) {
        if (!state.userToken) return null;
        const res = await fetch(`/api/packs/${id}`, { headers: authHeaders() });
        if (!res.ok) throw new Error('Pack load failed');
        const data = await res.json();
        injectPack(data.pack);
        return data.pack;
    }

    function appendPackOptions(group, packs, labelSuffix = '') {
        packs.forEach(pack => {
            const opt = document.createElement('option');
            opt.value = customPackValue(pack.id);
            const status = pack.status && pack.status !== 'approved' ? ` · ${pack.status.toUpperCase()}` : '';
            opt.textContent = `${pack.title}${status}${labelSuffix}`;
            opt.dataset.customPack = 'true';
            group.appendChild(opt);
        });
    }

    function renderPackOptions() {
        const select = document.getElementById('pack-select');
        if (!select) return;
        select.querySelectorAll('[data-custom-pack-group="true"]').forEach(group => group.remove());

        if (stateRef.mine.length) {
            const mine = document.createElement('optgroup');
            mine.label = 'My Packs';
            mine.dataset.customPackGroup = 'true';
            appendPackOptions(mine, stateRef.mine);
            select.appendChild(mine);
        }

        const publicOnly = stateRef.public.filter(pack => !stateRef.mine.some(mine => mine.id === pack.id));
        if (publicOnly.length) {
            const pub = document.createElement('optgroup');
            pub.label = 'Public Packs';
            pub.dataset.customPackGroup = 'true';
            appendPackOptions(pub, publicOnly, ' · PUBLIC');
            select.appendChild(pub);
        }
    }

    async function refreshPacks() {
        if (!state.userToken) {
            stateRef.mine = [];
            stateRef.public = [];
            renderPackOptions();
            return;
        }

        try {
            const [mineRes, publicRes] = await Promise.all([
                fetch('/api/packs?scope=mine', { headers: authHeaders() }),
                fetch('/api/packs?scope=public', { headers: authHeaders() })
            ]);
            if (!mineRes.ok || !publicRes.ok) throw new Error('Pack list failed');
            stateRef.mine = (await mineRes.json()).packs || [];
            stateRef.public = (await publicRes.json()).packs || [];
            renderPackOptions();
        } catch (err) {
            console.warn('Custom packs unavailable:', err.message);
        }
    }

    async function handlePackSelection() {
        const select = document.getElementById('pack-select');
        const id = packIdFromValue(select && select.value);
        if (!id || WORD_PACKS[customPackValue(id)]) {
            fetchLeaderboard();
            return;
        }
        try {
            await loadPackDetail(id);
            fetchLeaderboard();
        } catch (err) {
            renderLeaderboardMessage('CUSTOM PACK LOAD FAILED', 'var(--danger-color)');
        }
    }

    function open() {
        if (!ui.screen) return;
        els.screens.start.classList.add('hidden');
        ui.screen.classList.remove('hidden');
        syncOverlayChrome();
        refreshPacks();
        renderDraft({ updateStatus: Boolean(state.userToken) });
        if (!state.userToken) {
            renderStatus('REMOTE LOGIN REQUIRED', true);
        }
        ui.input.focus();
    }

    function close() {
        if (stateRef.busy) stopChat();
        ui.screen.classList.add('hidden');
        els.screens.start.classList.remove('hidden');
        syncOverlayChrome();
        fetchLeaderboard();
    }

    function stopChat() {
        if (stateRef.abort) stateRef.abort.abort();
        setBusy(false);
        renderStatus('STOPPED');
    }

    async function readStream(res, onEvent) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        const consume = line => {
            const trimmed = line.trim();
            if (!trimmed) return;
            onEvent(JSON.parse(trimmed));
        };

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let index;
            while ((index = buffer.indexOf('\n')) !== -1) {
                consume(buffer.slice(0, index));
                buffer = buffer.slice(index + 1);
            }
        }

        buffer += decoder.decode();
        if (buffer.trim()) consume(buffer);
    }

    async function sendChat(e) {
        e.preventDefault();
        if (stateRef.busy) {
            stopChat();
            return;
        }

        if (!state.userToken) {
            appendChat('system', 'PACK MAKER는 서버 저장/검색 기능이라 원격 로그인 토큰이 필요합니다.');
            renderStatus('REMOTE LOGIN REQUIRED', true);
            return;
        }

        const message = ui.input.value.trim();
        if (!message) return;
        ui.input.value = '';
        collectDraftFromEditor();

        stateRef.chat.push({ role: 'user', content: message });
        stateRef.chat = stateRef.chat.slice(-CHAT_LIMIT);
        appendChat('user', message);
        const assistantBody = appendChat('assistant', '');
        stateRef.abort = new AbortController();
        setBusy(true);
        let answer = '';

        try {
            const res = await fetch('/api/pack-maker/chat/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                signal: stateRef.abort.signal,
                body: JSON.stringify({
                    message,
                    engine: ui.engine.value,
                    history: stateRef.chat.slice(-CHAT_LIMIT),
                    draft: stateRef.draft
                })
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Pack Maker request failed');
            }

            await readStream(res, evt => {
                if (evt.event === 'search') {
                    appendChat('system', `검색 결과 ${evt.results?.length || 0}개를 draft 근거로 사용합니다.`);
                    return;
                }
                if (evt.event === 'delta') {
                    answer += evt.text || '';
                    assistantBody.textContent = answer;
                    scrollChat();
                    return;
                }
                if (evt.event === 'draft') {
                    stateRef.draft = normalizeDraft(evt.draft);
                    renderDraft();
                    return;
                }
                if (evt.event === 'error') throw new Error(evt.error || 'Pack Maker failed');
            });

            stateRef.chat.push({ role: 'assistant', content: answer.trim() });
            stateRef.chat = stateRef.chat.slice(-CHAT_LIMIT);
            renderStatus('DRAFT READY');
        } catch (err) {
            if (err.name === 'AbortError') {
                appendChat('system', '생성을 중단했습니다.');
            } else {
                appendChat('system', err.message);
                renderStatus('GENERATION FAILED', true);
            }
        } finally {
            stateRef.abort = null;
            setBusy(false);
            ui.input.focus();
        }
    }

    async function savePack(submitForReview = false) {
        if (!state.userToken) {
            renderStatus('REMOTE LOGIN REQUIRED', true);
            return;
        }

        const draft = collectDraftFromEditor();
        if (draft.items.length < 10) {
            renderStatus('MIN 10 VALID ITEMS REQUIRED', true);
            return;
        }

        renderStatus(submitForReview ? 'SUBMITTING REVIEW' : 'SAVING');
        try {
            const res = await fetch('/api/packs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ ...draft, submitForReview })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Pack save failed');
            stateRef.draft = normalizeDraft(data.pack);
            stateRef.draft.id = data.pack.id;
            stateRef.draft.status = data.pack.status;
            injectPack(data.pack);
            await refreshPacks();
            const select = document.getElementById('pack-select');
            if (select) {
                select.value = customPackValue(data.pack.id);
                fetchLeaderboard();
            }
            renderDraft();
            renderStatus(submitForReview ? 'PENDING PUBLIC REVIEW' : 'SAVED TO MY PACKS');
        } catch (err) {
            renderStatus(err.message, true);
        }
    }

    function bind() {
        ui.screen = $('pack-maker-screen');
        ui.openBtn = $('pack-maker-btn');
        ui.closeBtn = $('pack-maker-close');
        ui.engine = $('pack-maker-engine');
        ui.form = $('pack-maker-chat-form');
        ui.input = $('pack-maker-input');
        ui.send = $('pack-maker-send');
        ui.chatLog = $('pack-maker-chat-log');
        ui.status = $('pack-maker-status');
        ui.title = $('pack-maker-title');
        ui.description = $('pack-maker-description');
        ui.itemBody = $('pack-maker-items-body');
        ui.addItem = $('pack-maker-add-item');
        ui.save = $('pack-maker-save');
        ui.submit = $('pack-maker-submit');

        if (!ui.screen || !ui.openBtn) return;
        ui.openBtn.addEventListener('click', open);
        ui.closeBtn.addEventListener('click', close);
        ui.form.addEventListener('submit', sendChat);
        [ui.title, ui.description].forEach(field => {
            field.addEventListener('input', () => renderStatus('UNSAVED DRAFT'));
        });
        ui.addItem.addEventListener('click', () => {
            addItemRow({}, ui.itemBody.children.length);
            renderStatus('UNSAVED DRAFT');
        });
        ui.save.addEventListener('click', () => savePack(false));
        ui.submit.addEventListener('click', () => savePack(true));
        ui.chatLog.addEventListener('scroll', () => {
            stateRef.autoStick = ui.chatLog.scrollHeight - ui.chatLog.scrollTop - ui.chatLog.clientHeight < 32;
        });

        const select = document.getElementById('pack-select');
        if (select) select.addEventListener('change', handlePackSelection);
        window.addEventListener('codedrop:auth', refreshPacks);

        loadDraftFromStorage();
        renderDraft();
        refreshPacks();
    }

    window.addEventListener('load', bind);

    return {
        open,
        refreshPacks,
        loadPackDetail,
        injectPack
    };
})();

window.PackMaker = PackMaker;
