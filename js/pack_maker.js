/**
 * CodeDrop Pack Maker
 * Search-grounded custom data pack builder for DROP mode.
 */

const PackMaker = (() => {
    const STORAGE_KEY = 'codedrop_pack_maker_draft_v2';
    const CHAT_STORAGE_KEY = 'codedrop_pack_maker_chat_history';
    const SCOPED_STORAGE_VERSION = 'v3';
    const CHAT_LIMIT = 8;
    const CHAT_HISTORY_LIMIT = 24;

    const stateRef = {
        draft: { title: '', description: '', items: [] },
        chat: [],
        mine: [],
        public: [],
        busy: false,
        abort: null,
        activeMessage: null,
        stopByUser: false,
        autoStick: true,
        internalScroll: false,
        engine: null,
        authNoticeShown: false
    };

    const ui = {};

    function $(id) {
        return document.getElementById(id);
    }

    function authHeaders() {
        return state.userToken ? { Authorization: `Bearer ${state.userToken}` } : {};
    }

    function storageScope() {
        if (!state.userToken) return '';
        const id = String(state.userId || state.nickname || 'user')
            .replace(/[^a-z0-9_-]/gi, '_')
            .slice(0, 48);
        return `${SCOPED_STORAGE_VERSION}:${id}`;
    }

    function draftStorageKey() {
        const scope = storageScope();
        return scope ? `${STORAGE_KEY}:${scope}` : '';
    }

    function chatStorageKey() {
        const scope = storageScope();
        return scope ? `${CHAT_STORAGE_KEY}:${scope}` : '';
    }

    async function refreshExpiredSession() {
        const helper = window.CodeDropAuth;
        if (!helper || typeof helper.refreshServerSession !== 'function') return false;
        return helper.refreshServerSession();
    }

    async function fetchPackMakerStream(message, history = []) {
        const body = {
            message,
            engine: ui.engine.value,
            history,
            draft: stateRef.draft
        };
        const options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            signal: stateRef.abort.signal,
            body: JSON.stringify(body)
        };
        let res = await fetch('/api/pack-maker/chat/stream', options);

        if (res.status === 401) {
            if (await refreshExpiredSession()) {
                res = await fetch('/api/pack-maker/chat/stream', {
                    ...options,
                    headers: { 'Content-Type': 'application/json', ...authHeaders() }
                });
            } else {
                const err = new Error('LOGIN_REQUIRED');
                err.code = 'AUTH_REQUIRED';
                throw err;
            }
        }

        return res;
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

    function t(key, replacements = {}) {
        if (window.CodeDropI18n && typeof window.CodeDropI18n.t === 'function') {
            return window.CodeDropI18n.t(key, replacements);
        }
        return key;
    }

    function preferredEngine() {
        return stateRef.engine === 'openai' || stateRef.engine === 'kugnus' ? stateRef.engine : 'kugnus';
    }

    function engineLabel() {
        return ui.engine && ui.engine.value === 'openai' ? 'GPT 5.4 MINI' : 'KUGNUS SERVER';
    }

    function engineRouteLabel(meta = null) {
        if (!ui.engine || ui.engine.value !== 'kugnus') return '';
        const route = meta && typeof meta.route === 'string' && meta.route
            ? meta.route
            : (window.CodeDropLlmStatus && typeof window.CodeDropLlmStatus.snapshot === 'function'
                ? window.CodeDropLlmStatus.snapshot().route
                : '');
        return route ? ` ${route.toUpperCase()}` : '';
    }

    function engineStatus(status, meta = null) {
        return `${engineLabel()}${engineRouteLabel(meta)} ${status}`;
    }

    function compactPrompt(message) {
        return String(message || '').replace(/\s+/g, '').trim();
    }

    function isLocalPackGenerationRequest(message) {
        const text = escapeText(message);
        const compact = compactPrompt(text);
        if (!text) return false;
        if (/^(되냐|돼|가능|가능해|가능한가|되나|되나요|테스트|test|help|도움|안녕|hi|hello)[?!.。]*$/i.test(compact)) {
            return false;
        }

        const hasCreateVerb = /(만들|생성|제작|작성|뽑|추출|정리|초안|추천|부탁|make|create|generate|draft|build)/i.test(text);
        const hasPackWord = /(?:팩|데이터팩|\bpack\b|\bdata\s*pack\b)/i.test(text);
        const hasTermHint = /(?:단어|용어|고유명사|명령어|커맨드|부품|키워드|어휘|\bterms?\b|\bitems?\b|\bwords?\b|\bvocab(?:ulary)?\b|\bglossary\b|\bcommands?\b)/i.test(text);
        const hasCount = /(\d{1,3})\s*(?:개|단어|용어|terms?|items?|words?)/i.test(text);
        return hasCreateVerb && (hasPackWord || hasTermHint || hasCount);
    }

    function localBriefResponse(message) {
        if (/[가-힣]/.test(message || '')) {
            return [
                '됩니다. 다만 Pack Maker는 일반 대화보다 **데이터팩 생성 요청**에 맞춰져 있습니다.',
                '',
                '한 문장에 아래 4가지를 넣으면 KUGNUS SERVER가 검색 근거를 보고 초안을 만듭니다.',
                '- 도메인: 자동차 정비, EX280, 회계, 병원 행정 등',
                '- 언어: 한글 또는 영어',
                '- 개수: 10-120개',
                '- 팩 이름: 카 파츠 팩처럼 저장될 이름',
                '',
                '예: 자동차 정비소에 취직하는데 한글 자동차부품 단어 50개로 카 파츠 팩 만들어줘'
            ].join('\n');
        }

        return [
            'Yes. Pack Maker is for **data pack generation requests**, not open-ended chat.',
            '',
            'Include the domain, term language, item count, and pack name.',
            'Example: Make a Korean car-parts pack with 50 common auto repair terms.'
        ].join('\n');
    }

    function updateEngineRouteStatus(meta = null) {
        if (!ui.route) return;
        ui.route.classList.remove('warn', 'danger');
        if (!ui.engine || ui.engine.value === 'openai') {
            ui.route.textContent = 'FALLBACK ROUTE: GPT 5.4 MINI';
            ui.route.classList.add('warn');
            return;
        }

        const snapshot = window.CodeDropLlmStatus && typeof window.CodeDropLlmStatus.snapshot === 'function'
            ? window.CodeDropLlmStatus.snapshot()
            : {};
        const status = meta || snapshot;
        if (status.checking) {
            ui.route.textContent = 'KUGNUS ROUTE: CHECKING';
            ui.route.classList.add('warn');
            return;
        }
        if (status.ok === false) {
            ui.route.textContent = `KUGNUS ROUTE: OFFLINE${status.reason ? ` · ${status.reason}` : ''}`;
            ui.route.classList.add('danger');
            return;
        }

        const route = status.route ? String(status.route).toUpperCase() : 'UNKNOWN';
        const provider = status.provider ? ` · ${String(status.provider).toUpperCase()}` : '';
        ui.route.textContent = `KUGNUS ROUTE: ${route}${provider}`;
        ui.route.classList.toggle('warn', route !== 'GATEWAY');
    }

    function setEngine(engine) {
        if (!ui.engine) return;
        ui.engine.value = engine === 'openai' ? 'openai' : 'kugnus';
        stateRef.engine = ui.engine.value;
        updateEngineRouteStatus();
    }

    async function offerKugnusFallbackIfNeeded() {
        if (!ui.engine || ui.engine.value !== 'kugnus') return false;
        const helper = window.CodeDropLlmStatus;
        if (!helper || typeof helper.maybeSwitchFromOfflineKugnus !== 'function') return false;

        const shouldSwitch = await helper.maybeSwitchFromOfflineKugnus('pack-maker');
        if (!shouldSwitch) return false;

        setEngine('openai');
        renderStatus(engineStatus('READY'));
        return true;
    }

    function setBusy(busy) {
        stateRef.busy = busy;
        if (ui.send) {
            ui.send.textContent = busy ? t('packMaker.stop') : t('packMaker.ask');
            ui.send.classList.toggle('stop', busy);
        }
        if (ui.input) ui.input.disabled = busy;
        if (busy) renderStatus('SEARCHING + STREAMING');
    }

    function clearNode(node) {
        while (node && node.firstChild) node.removeChild(node.firstChild);
    }

    function normalizeChatEntries(value) {
        if (!Array.isArray(value)) return [];
        return value
            .map(item => ({
                role: item && item.role === 'assistant' ? 'assistant' : 'user',
                content: typeof item?.content === 'string' ? item.content.slice(0, 5000) : '',
                question: typeof item?.question === 'string' ? item.question.slice(0, 1200) : ''
            }))
            .filter(item => item.content)
            .slice(-CHAT_HISTORY_LIMIT);
    }

    function loadChatHistory() {
        const key = chatStorageKey();
        if (!key) {
            stateRef.chat = [];
            return;
        }
        try {
            stateRef.chat = normalizeChatEntries(JSON.parse(localStorage.getItem(key)));
        } catch (e) {
            stateRef.chat = [];
        }
    }

    function persistChatHistory() {
        const entries = normalizeChatEntries(stateRef.chat);
        stateRef.chat = entries;
        const key = chatStorageKey();
        if (!key) return;
        try {
            if (entries.length === 0) localStorage.removeItem(key);
            else localStorage.setItem(key, JSON.stringify(entries));
        } catch (e) {
            console.warn('Pack Maker chat history will stay in memory for this session:', e);
        }
    }

    function safeLink(url) {
        try {
            const parsed = new URL(url, window.location.origin);
            return ['http:', 'https:', 'mailto:'].includes(parsed.protocol) ? parsed.href : '';
        } catch (e) {
            return '';
        }
    }

    function appendInline(parent, text) {
        const token = /(`[^`\n]+`|\*\*[^*\n]+?\*\*|\*[^*\n]+?\*|\[[^\]\n]+\]\([^)]+\))/g;
        let index = 0;
        let match;

        function appendText(value) {
            if (value) parent.appendChild(document.createTextNode(value));
        }

        while ((match = token.exec(text)) !== null) {
            appendText(text.slice(index, match.index));
            const raw = match[0];

            if (raw.startsWith('`')) {
                const code = document.createElement('code');
                code.textContent = raw.slice(1, -1);
                parent.appendChild(code);
            } else if (raw.startsWith('**')) {
                const strong = document.createElement('strong');
                appendInline(strong, raw.slice(2, -2));
                parent.appendChild(strong);
            } else if (raw.startsWith('*')) {
                const em = document.createElement('em');
                appendInline(em, raw.slice(1, -1));
                parent.appendChild(em);
            } else {
                const linkMatch = raw.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
                const href = linkMatch ? safeLink(linkMatch[2].trim()) : '';
                if (href) {
                    const link = document.createElement('a');
                    link.href = href;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    appendInline(link, linkMatch[1]);
                    parent.appendChild(link);
                } else {
                    appendText(raw);
                }
            }
            index = match.index + raw.length;
        }

        appendText(text.slice(index));
    }

    function splitTableRow(line) {
        return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
    }

    function isTableSeparator(line) {
        const cells = splitTableRow(line);
        return cells.length > 1 && cells.every(cell => /^:?-{3,}:?$/.test(cell));
    }

    function appendCodeBlock(fragment, codeText, lang) {
        const wrap = document.createElement('div');
        wrap.className = 'learn-chat-code-wrap';
        const copy = document.createElement('button');
        copy.className = 'learn-chat-copy-code';
        copy.type = 'button';
        copy.textContent = 'COPY';
        copy._copyText = codeText;
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        if (lang) code.dataset.lang = lang;
        code.textContent = codeText;
        pre.appendChild(code);
        wrap.append(copy, pre);
        fragment.appendChild(wrap);
    }

    function appendTable(fragment, headerLine, separatorLine, bodyLines) {
        if (!isTableSeparator(separatorLine)) return false;
        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');
        splitTableRow(headerLine).forEach(cell => {
            const th = document.createElement('th');
            appendInline(th, cell);
            headRow.appendChild(th);
        });
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        bodyLines.forEach(line => {
            const row = document.createElement('tr');
            splitTableRow(line).forEach(cell => {
                const td = document.createElement('td');
                appendInline(td, cell);
                row.appendChild(td);
            });
            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        fragment.appendChild(table);
        return true;
    }

    function renderMarkdownInto(target, markdown, streaming = false) {
        const text = String(markdown || '').replace(/\r\n/g, '\n');
        const lines = text.split('\n');
        const fragment = document.createDocumentFragment();
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];
            const trimmed = line.trim();

            if (!trimmed) {
                i++;
                continue;
            }

            const fence = trimmed.match(/^```([A-Za-z0-9_-]*)\s*$/);
            if (fence) {
                const codeLines = [];
                i++;
                while (i < lines.length && !lines[i].trim().startsWith('```')) {
                    codeLines.push(lines[i]);
                    i++;
                }
                if (i < lines.length) i++;
                appendCodeBlock(fragment, codeLines.join('\n'), fence[1] || '');
                continue;
            }

            const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
            if (heading) {
                const h = document.createElement(`h${heading[1].length}`);
                appendInline(h, heading[2].trim());
                fragment.appendChild(h);
                i++;
                continue;
            }

            if (/^>\s?/.test(trimmed)) {
                const quote = document.createElement('blockquote');
                const quoteLines = [];
                while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
                    quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
                    i++;
                }
                appendInline(quote, quoteLines.join(' '));
                fragment.appendChild(quote);
                continue;
            }

            const bullet = trimmed.match(/^[-*]\s+(.+)$/);
            const numbered = trimmed.match(/^\d+\.\s+(.+)$/);
            if (bullet || numbered) {
                const list = document.createElement(numbered ? 'ol' : 'ul');
                while (i < lines.length) {
                    const current = lines[i].trim();
                    const itemMatch = numbered ? current.match(/^\d+\.\s+(.+)$/) : current.match(/^[-*]\s+(.+)$/);
                    if (!itemMatch) break;
                    const li = document.createElement('li');
                    appendInline(li, itemMatch[1]);
                    list.appendChild(li);
                    i++;
                }
                fragment.appendChild(list);
                continue;
            }

            if (line.includes('|') && lines[i + 1] && isTableSeparator(lines[i + 1])) {
                const bodyLines = [];
                i += 2;
                while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
                    bodyLines.push(lines[i]);
                    i++;
                }
                appendTable(fragment, line, lines[i - bodyLines.length - 1], bodyLines);
                continue;
            }

            const paraLines = [];
            while (i < lines.length) {
                const current = lines[i];
                const currentTrimmed = current.trim();
                if (!currentTrimmed) break;
                if (/^```/.test(currentTrimmed) || /^(#{1,3})\s+/.test(currentTrimmed) || /^>\s?/.test(currentTrimmed) ||
                    /^[-*]\s+/.test(currentTrimmed) || /^\d+\.\s+/.test(currentTrimmed) ||
                    (current.includes('|') && lines[i + 1] && isTableSeparator(lines[i + 1]))) {
                    break;
                }
                paraLines.push(currentTrimmed);
                i++;
            }
            const p = document.createElement('p');
            appendInline(p, paraLines.join(' '));
            fragment.appendChild(p);
        }

        target.replaceChildren(fragment);

        if (streaming) {
            if (!target.childNodes.length) {
                const typing = document.createElement('span');
                typing.className = 'learn-chat-typing';
                typing.textContent = '응답 생성 중';
                target.appendChild(typing);
            } else {
                const caret = document.createElement('span');
                caret.className = 'learn-chat-caret';
                const last = target.lastElementChild;
                if (last && ['P', 'LI', 'H1', 'H2', 'H3', 'BLOCKQUOTE'].includes(last.tagName)) {
                    last.appendChild(caret);
                } else {
                    target.appendChild(caret);
                }
            }
        }
    }

    function createAssistantActions(question) {
        const actions = document.createElement('div');
        actions.className = 'learn-chat-actions';
        [
            ['copy', 'COPY'],
            ['retry', 'RETRY'],
            ['regenerate', 'REGEN']
        ].forEach(([action, label]) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'learn-chat-action';
            btn.dataset.action = action;
            btn.textContent = label;
            if (question) btn.dataset.question = question;
            actions.appendChild(btn);
        });
        return actions;
    }

    function setMessageNote(msg, text) {
        const old = msg.querySelector('.learn-chat-note');
        if (old) old.remove();
        if (!text) return;
        const note = document.createElement('div');
        note.className = 'learn-chat-note';
        note.textContent = text;
        const actions = msg.querySelector('.learn-chat-actions');
        msg.insertBefore(note, actions || null);
    }

    function setChatMessageContent(msg, text, streaming = false) {
        const body = msg.querySelector('.pack-maker-msg-body');
        msg._rawText = text || '';
        if (msg.dataset.role === 'assistant') {
            renderMarkdownInto(body, text, streaming);
        } else {
            body.textContent = text || '';
        }
        maybeStickChat();
    }

    function appendChat(role, text, options = {}) {
        if (!ui.chatLog) return null;
        const msg = document.createElement('div');
        msg.className = `pack-maker-msg ${role}`;
        msg.dataset.role = role;
        msg._rawText = text || '';
        msg._question = options.question || '';
        const label = document.createElement('div');
        label.className = 'pack-maker-msg-label';
        label.textContent = role === 'user' ? 'YOU' : role === 'system' ? 'SYSTEM' : 'PACK MAKER';
        const body = document.createElement('div');
        body.className = 'pack-maker-msg-body';
        if (role === 'assistant') body.classList.add('learn-chat-body');
        msg.append(label, body);
        if (role === 'assistant') {
            if (options.streaming) msg.classList.add('streaming');
            msg.appendChild(createAssistantActions(options.question || ''));
        }
        ui.chatLog.appendChild(msg);
        setChatMessageContent(msg, text || '', Boolean(options.streaming));
        maybeStickChat(true);
        return msg;
    }

    function finishAssistantMessage(msg, text, question) {
        msg.classList.remove('streaming', 'failed', 'stopped');
        msg._question = question || '';
        msg.querySelectorAll('.learn-chat-action').forEach(btn => {
            if (question) btn.dataset.question = question;
        });
        setMessageNote(msg, '');
        setChatMessageContent(msg, text, false);
    }

    function failAssistantMessage(msg, message, question) {
        msg.classList.remove('streaming');
        msg.classList.add('failed');
        msg._question = question || '';
        msg.querySelectorAll('.learn-chat-action').forEach(btn => {
            if (question) btn.dataset.question = question;
        });
        setMessageNote(msg, 'RETRY로 같은 질문을 다시 보낼 수 있습니다.');
        setChatMessageContent(msg, `LLM 연결 실패: ${message}`, false);
    }

    function stopAssistantMessage(msg) {
        msg.classList.remove('streaming');
        msg.classList.add('stopped');
        setMessageNote(msg, '중단됨');
        maybeStickChat();
    }

    function discardAssistantMessage(msg) {
        if (!msg) return;
        msg.remove();
        maybeStickChat();
    }

    async function showRemoteLoginRequired() {
        if (!stateRef.authNoticeShown) {
            appendChat('system', t('packMaker.loginNotice'));
            stateRef.authNoticeShown = true;
        }
        renderStatus(t('packMaker.loginRequired'), true);
        const helper = window.CodeDropAuth;
        if (helper && typeof helper.requireLogin === 'function') {
            return helper.requireLogin(t('packMaker.featureName'));
        }
        return false;
    }

    async function ensureRemoteAuth() {
        if (!state.userToken) {
            await showRemoteLoginRequired();
            return false;
        }

        const session = await fetch('/api/session', {
            headers: authHeaders(),
            cache: 'no-store'
        }).catch(() => null);

        if (session && session.ok) return true;
        if (await refreshExpiredSession()) return Boolean(state.userToken);

        await showRemoteLoginRequired();
        return false;
    }

    function isChatAtBottom() {
        if (!ui.chatLog) return true;
        return ui.chatLog.scrollHeight - ui.chatLog.scrollTop - ui.chatLog.clientHeight < 28;
    }

    function updateBottomButton() {
        if (!ui.chatBottom) return;
        const show = !stateRef.autoStick && !isChatAtBottom();
        ui.chatBottom.classList.toggle('hidden', !show);
    }

    function handleChatScroll() {
        if (stateRef.internalScroll) return;
        stateRef.autoStick = isChatAtBottom();
        updateBottomButton();
    }

    function scrollChatToBottom(force = false) {
        if (!ui.chatLog || (!force && !stateRef.autoStick)) {
            updateBottomButton();
            return;
        }
        stateRef.autoStick = true;
        stateRef.internalScroll = true;
        ui.chatLog.scrollTop = ui.chatLog.scrollHeight;
        requestAnimationFrame(() => {
            ui.chatLog.scrollTop = ui.chatLog.scrollHeight;
            stateRef.internalScroll = false;
            updateBottomButton();
        });
    }

    function maybeStickChat(force = false) {
        if (force) stateRef.autoStick = true;
        scrollChatToBottom(force);
    }

    async function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await Promise.race([
                    navigator.clipboard.writeText(text),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Clipboard timeout')), 800))
                ]);
                return;
            } catch (e) {
                // Fall through to textarea copy for browser permission edge cases.
            }
        }
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        area.remove();
    }

    function flashButton(btn, label = 'OK') {
        const old = btn.textContent;
        btn.textContent = label;
        setTimeout(() => {
            if (btn.isConnected) btn.textContent = old;
        }, 900);
    }

    function handleChatLogClick(e) {
        const copyCode = e.target.closest('.learn-chat-copy-code');
        if (copyCode) {
            copyText(copyCode._copyText || '').then(() => flashButton(copyCode, 'OK')).catch(() => flashButton(copyCode, 'ERR'));
            return;
        }

        const action = e.target.closest('.learn-chat-action');
        if (!action || stateRef.busy) return;
        const msg = action.closest('.pack-maker-msg');
        const question = action.dataset.question || msg?._question || '';

        if (action.dataset.action === 'copy') {
            copyText(msg?._rawText || '').then(() => flashButton(action, 'COPIED')).catch(() => flashButton(action, 'ERR'));
            return;
        }

        if ((action.dataset.action === 'retry' || action.dataset.action === 'regenerate') && question) {
            sendChatText(question);
        }
    }

    function renderChatHistory() {
        if (!ui.chatLog) return;
        stateRef.autoStick = true;
        ui.chatLog.replaceChildren();
        appendChat('system', t('packMaker.chatIntro'));
        stateRef.chat.forEach(entry => appendChat(entry.role, entry.content, { question: entry.question || '' }));
        scrollChatToBottom(true);
    }

    function clearChatHistory() {
        if (stateRef.busy) stopChat();
        stateRef.chat = [];
        persistChatHistory();
        renderChatHistory();
        renderStatus(state.userToken ? engineStatus('READY') : t('packMaker.guestPreview'));
    }

    function answerLocalBrief(message) {
        ui.input.value = '';
        const answer = localBriefResponse(message);
        stateRef.chat.push({ role: 'user', content: message });
        stateRef.chat.push({ role: 'assistant', content: answer, question: message });
        stateRef.chat = stateRef.chat.slice(-CHAT_HISTORY_LIMIT);
        persistChatHistory();
        appendChat('user', message);
        appendChat('assistant', answer, { question: message });
        renderStatus('PACK BRIEF REQUIRED');
    }

    function persistDraft() {
        const key = draftStorageKey();
        if (!key) return;
        try {
            localStorage.setItem(key, JSON.stringify(stateRef.draft));
        } catch (e) {
            // local draft restore is best effort only.
        }
    }

    function loadDraftFromStorage() {
        const key = draftStorageKey();
        if (!key) {
            stateRef.draft = { title: '', description: '', items: [] };
            return;
        }
        try {
            const saved = JSON.parse(localStorage.getItem(key));
            if (saved && Array.isArray(saved.items)) {
                stateRef.draft = normalizeDraft(saved);
            } else {
                stateRef.draft = { title: '', description: '', items: [] };
            }
        } catch (e) {
            stateRef.draft = { title: '', description: '', items: [] };
        }
    }

    function reloadScopedLocalState() {
        loadDraftFromStorage();
        loadChatHistory();
        renderDraft({ updateStatus: Boolean(state.userToken) });
        renderChatHistory();
        if (!state.userToken && ui.screen && !ui.screen.classList.contains('hidden')) {
            renderStatus(t('packMaker.guestPreview'));
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
        if (!await ensureRemoteAuth()) return null;
        const res = await fetch(`/api/packs/${id}`, { headers: authHeaders() });
        if (res.status === 401 && await refreshExpiredSession()) {
            return loadPackDetail(id);
        }
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

        if (window.CodeDropPackSelector && typeof window.CodeDropPackSelector.refresh === 'function') {
            window.CodeDropPackSelector.refresh();
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
            let [mineRes, publicRes] = await Promise.all([
                fetch('/api/packs?scope=mine', { headers: authHeaders() }),
                fetch('/api/packs?scope=public', { headers: authHeaders() })
            ]);
            if ((mineRes.status === 401 || publicRes.status === 401) && await refreshExpiredSession()) {
                [mineRes, publicRes] = await Promise.all([
                    fetch('/api/packs?scope=mine', { headers: authHeaders() }),
                    fetch('/api/packs?scope=public', { headers: authHeaders() })
                ]);
            }
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
        setEngine(preferredEngine());
        updateEngineRouteStatus();
        refreshPacks();
        renderDraft({ updateStatus: Boolean(state.userToken) });
        if (state.userToken) {
            offerKugnusFallbackIfNeeded().catch(err => {
                console.warn('KUGNUS fallback check failed:', err.message);
            });
        } else {
            renderStatus(t('packMaker.guestPreview'));
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
        stateRef.stopByUser = true;
        if (stateRef.abort) stateRef.abort.abort();
        renderStatus(engineStatus('STOPPING'));
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

        const message = ui.input.value.trim();
        if (!message) return;
        await sendChatText(message);
    }

    async function sendChatText(message) {
        if (stateRef.busy) return;
        if (!isLocalPackGenerationRequest(message)) {
            answerLocalBrief(message);
            return;
        }

        if (!await ensureRemoteAuth()) {
            return;
        }

        await offerKugnusFallbackIfNeeded();
        ui.input.value = '';
        collectDraftFromEditor();

        const history = stateRef.chat
            .filter(entry => entry.role === 'user' || entry.role === 'assistant')
            .slice(-CHAT_LIMIT)
            .map(entry => ({ role: entry.role, content: entry.content }));

        stateRef.chat.push({ role: 'user', content: message });
        stateRef.chat = stateRef.chat.slice(-CHAT_HISTORY_LIMIT);
        persistChatHistory();
        appendChat('user', message);
        const pending = appendChat('assistant', '', { question: message, streaming: true });
        stateRef.activeMessage = pending;
        stateRef.stopByUser = false;
        stateRef.abort = new AbortController();
        setBusy(true);
        let answer = '';
        let finalStatus = '';
        let finalStatusDanger = false;

        try {
            const res = await fetchPackMakerStream(message, history);

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Pack Maker request failed');
            }

            await readStream(res, evt => {
                if (evt.event === 'meta') {
                    renderStatus(engineStatus('STREAMING', evt));
                    updateEngineRouteStatus(evt);
                    return;
                }
                if (evt.event === 'status') {
                    finalStatus = evt.text || finalStatus;
                    finalStatusDanger = evt.danger === true;
                    renderStatus(finalStatus, finalStatusDanger);
                    return;
                }
                if (evt.event === 'search') {
                    appendChat('system', t('packMaker.searchResults', { count: evt.results?.length || 0 }));
                    return;
                }
                if (evt.event === 'delta') {
                    answer += evt.text || '';
                    setChatMessageContent(pending, answer, true);
                    return;
                }
                if (evt.event === 'draft') {
                    stateRef.draft = normalizeDraft(evt.draft);
                    renderDraft();
                    if (finalStatus) renderStatus(finalStatus, finalStatusDanger);
                    return;
                }
                if (evt.event === 'error') throw new Error(evt.error || 'Pack Maker failed');
            });

            finishAssistantMessage(pending, answer.trim(), message);
            stateRef.chat.push({ role: 'assistant', content: answer.trim(), question: message });
            stateRef.chat = stateRef.chat.slice(-CHAT_HISTORY_LIMIT);
            persistChatHistory();
            renderStatus(finalStatus || 'DRAFT READY', finalStatusDanger);
        } catch (err) {
            if (err.name === 'AbortError' && stateRef.stopByUser) {
                stopAssistantMessage(pending);
                renderStatus(engineStatus('STOPPED'));
            } else if (err.code === 'AUTH_REQUIRED') {
                discardAssistantMessage(pending);
                await showRemoteLoginRequired();
            } else {
                failAssistantMessage(pending, err.message, message);
                renderStatus(err.message.startsWith('DRAFT SHORT') ? err.message : 'GENERATION FAILED', true);
            }
        } finally {
            if (stateRef.activeMessage === pending) stateRef.activeMessage = null;
            stateRef.abort = null;
            stateRef.stopByUser = false;
            setBusy(false);
            ui.input.focus();
        }
    }

    async function savePack(submitForReview = false) {
        if (!await ensureRemoteAuth()) {
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
                if (window.CodeDropPackSelector && typeof window.CodeDropPackSelector.refresh === 'function') {
                    window.CodeDropPackSelector.refresh();
                }
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
        ui.route = $('pack-maker-route');
        ui.form = $('pack-maker-chat-form');
        ui.input = $('pack-maker-input');
        ui.send = $('pack-maker-send');
        ui.clear = $('pack-maker-clear');
        ui.chatLog = $('pack-maker-chat-log');
        ui.chatBottom = $('pack-maker-chat-bottom');
        ui.status = $('pack-maker-status');
        ui.title = $('pack-maker-title');
        ui.description = $('pack-maker-description');
        ui.itemBody = $('pack-maker-items-body');
        ui.addItem = $('pack-maker-add-item');
        ui.save = $('pack-maker-save');
        ui.submit = $('pack-maker-submit');

        if (!ui.screen || !ui.openBtn) return;
        setEngine(preferredEngine());
        ui.openBtn.addEventListener('click', open);
        ui.closeBtn.addEventListener('click', close);
        ui.form.addEventListener('submit', sendChat);
        ui.input.addEventListener('keydown', e => {
            e.stopPropagation();
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                ui.form.requestSubmit();
            }
        });
        ui.engine.addEventListener('change', () => {
            setEngine(ui.engine.value);
            if (!stateRef.busy) renderStatus(engineStatus('READY'));
        });
        window.addEventListener('codedrop:llm-status', e => updateEngineRouteStatus(e.detail));
        [ui.title, ui.description].forEach(field => {
            field.addEventListener('input', () => renderStatus('UNSAVED DRAFT'));
        });
        ui.addItem.addEventListener('click', () => {
            addItemRow({}, ui.itemBody.children.length);
            renderStatus('UNSAVED DRAFT');
        });
        ui.save.addEventListener('click', () => savePack(false));
        ui.submit.addEventListener('click', () => savePack(true));
        if (ui.clear) ui.clear.addEventListener('click', clearChatHistory);
        if (ui.chatBottom) ui.chatBottom.addEventListener('click', () => scrollChatToBottom(true));
        ui.chatLog.addEventListener('click', handleChatLogClick);
        ui.chatLog.addEventListener('scroll', handleChatScroll);
        window.addEventListener('codedrop:language', () => {
            if (!stateRef.busy && ui.send) ui.send.textContent = t('packMaker.ask');
            if (!state.userToken && ui.screen && !ui.screen.classList.contains('hidden')) {
                renderStatus(t('packMaker.guestPreview'));
            }
            if (!stateRef.busy) renderChatHistory();
        });

        const select = document.getElementById('pack-select');
        if (select) select.addEventListener('change', handlePackSelection);
        window.addEventListener('codedrop:auth', () => {
            reloadScopedLocalState();
            refreshPacks();
        });

        loadDraftFromStorage();
        loadChatHistory();
        renderDraft();
        renderChatHistory();
        refreshPacks();
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', bind, { once: true });
    } else {
        bind();
    }

    return {
        open,
        refreshPacks,
        loadPackDetail,
        injectPack,
        isBusy() {
            return stateRef.busy;
        }
    };
})();

window.PackMaker = PackMaker;
