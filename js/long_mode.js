/**
 * CodeDrop Long Practice
 * Long-form typing trainer for Korean, English, mixed text, and user-provided passages.
 */

const LongPractice = (() => {
    const CUSTOM_STORAGE_KEY = 'codedrop_long_text_packs_v1';
    const longState = {
        packs: [],
        target: '',
        source: '',
        startedAt: 0,
        completed: false,
        pendingPackId: ''
    };

    const ui = {};

    function $(id) {
        return document.getElementById(id);
    }

    function bindUi() {
        ui.screen = $('long-practice-screen');
        ui.home = $('long-home');
        ui.packSelect = $('long-pack-select');
        ui.meta = $('long-pack-meta');
        ui.customText = $('long-custom-text');
        ui.start = $('long-start');
        ui.reset = $('long-reset');
        ui.status = $('long-status');
        ui.progress = $('long-progress');
        ui.accuracy = $('long-accuracy');
        ui.wpm = $('long-wpm');
        ui.source = $('long-source');
        ui.passage = $('long-passage');
        ui.input = $('long-input');
    }

    function userPacks() {
        try {
            const parsed = JSON.parse(localStorage.getItem(CUSTOM_STORAGE_KEY) || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    function saveUserPacks(packs) {
        localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(packs.slice(0, 40)));
    }

    function normalizeText(text) {
        return String(text || '')
            .replace(/\r\n?/g, '\n')
            .replace(/[ \t]+\n/g, '\n')
            .trim();
    }

    function isTemplatePack(pack) {
        return pack?.type === 'template';
    }

    function sourceLabel(pack) {
        if (!pack) return 'PACK';
        const source = pack.source || 'PRACTICE';
        const providerId = pack.providerId || pack.userId || '';
        return providerId ? `${source} · ${providerId}` : source;
    }

    function defaultCustomPlaceholder() {
        return '사용자가 직접 입력한 글을 연습하려면 여기에 붙여넣으세요. 저작권 있는 가사는 기본팩에 넣지 않고, 이 개인 연습 슬롯에서만 다룹니다.';
    }

    function applyCustomPlaceholder(pack) {
        if (!ui.customText) return;
        ui.customText.placeholder = isTemplatePack(pack)
            ? (pack.promptText || '이 템플릿은 원문을 포함하지 않습니다. 연습할 텍스트를 직접 붙여넣으세요.')
            : defaultCustomPlaceholder();
    }

    function buildPackList() {
        const builtIn = Array.isArray(window.LONG_TEXT_PACKS) ? window.LONG_TEXT_PACKS : [];
        longState.packs = [
            ...builtIn,
            ...userPacks().map(pack => ({ ...pack, group: 'User', source: 'USER PROVIDED' }))
        ];
    }

    function populatePackSelect() {
        if (!ui.packSelect) return;
        const desiredValue = longState.pendingPackId || ui.packSelect.value || '';
        buildPackList();
        ui.packSelect.innerHTML = '';

        const groups = new Map();
        longState.packs.forEach(pack => {
            const group = pack.group || 'Practice';
            if (!groups.has(group)) groups.set(group, []);
            groups.get(group).push(pack);
        });

        groups.forEach((packs, group) => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = group;
            packs.forEach(pack => {
                const option = document.createElement('option');
                option.value = pack.id;
                option.textContent = pack.title || pack.label || pack.id;
                optgroup.appendChild(option);
            });
            ui.packSelect.appendChild(optgroup);
        });

        const customOption = document.createElement('option');
        customOption.value = '__custom__';
        customOption.textContent = '직접 붙여넣기 / User-provided text';
        ui.packSelect.appendChild(customOption);

        const hasDesiredValue = Array.from(ui.packSelect.options).some(option => option.value === desiredValue);
        if (desiredValue && hasDesiredValue) {
            ui.packSelect.value = desiredValue;
        }
    }

    function selectedPack() {
        return longState.packs.find(pack => pack.id === ui.packSelect?.value) || null;
    }

    function updatePackMeta() {
        const pack = selectedPack();
        if (!ui.meta) return;
        applyCustomPlaceholder(pack);
        if (!pack) {
            ui.meta.textContent = '직접 입력 텍스트는 개인 연습용입니다. 기본팩에는 저작권 있는 가사를 번들하지 않습니다.';
            return;
        }
        if (isTemplatePack(pack)) {
            ui.meta.textContent = `${pack.title || pack.label} · ${sourceLabel(pack)} · 원문은 직접 붙여넣기 슬롯에서만 사용합니다. 기본팩에는 포함하지 않습니다.`;
            return;
        }
        const tags = Array.isArray(pack.tags) ? pack.tags.join(' · ') : '';
        ui.meta.textContent = `${pack.label || pack.title} · ${sourceLabel(pack)}${tags ? ` · ${tags}` : ''}`;
    }

    function resetSelectedTarget() {
        const pack = selectedPack();
        longState.target = isTemplatePack(pack) ? '' : normalizeText(pack?.text || '');
        longState.source = isTemplatePack(pack) ? 'USER PROVIDED' : sourceLabel(pack);
        longState.startedAt = 0;
        longState.completed = false;
        if (ui.input) {
            ui.input.value = '';
            ui.input.disabled = true;
        }
        renderPassage('');
        updateStats();
        setStatus(isTemplatePack(pack) ? 'PASTE TEXT TO START' : 'READY');
    }

    function handlePackChange() {
        longState.pendingPackId = ui.packSelect?.value || '';
        updatePackMeta();
        resetSelectedTarget();
    }

    function selectPack(id, resetTarget = true) {
        if (!id) return false;
        bindUi();
        longState.pendingPackId = id;
        populatePackSelect();
        const selected = ui.packSelect?.value === id;
        if (selected && resetTarget) {
            resetSelectedTarget();
        }
        updatePackMeta();
        return selected;
    }

    function setStatus(text, danger = false) {
        if (!ui.status) return;
        ui.status.textContent = text;
        ui.status.style.color = danger ? 'var(--danger-color)' : 'var(--secondary-neon)';
    }

    function renderPassage(input = '') {
        if (!ui.passage) return;
        const fragment = document.createDocumentFragment();
        const target = longState.target || '';
        const typed = String(input || '');

        for (let index = 0; index < target.length; index += 1) {
            const span = document.createElement('span');
            const char = target[index];
            span.textContent = char;
            if (index < typed.length) {
                span.className = `long-char ${typed[index] === char ? 'ok' : 'miss'}`;
            } else if (index === typed.length) {
                span.className = 'long-char cursor';
            } else {
                span.className = 'long-char';
            }
            fragment.appendChild(span);
        }

        ui.passage.replaceChildren(fragment);
    }

    function calculateStats(input) {
        const typed = String(input || '');
        const target = longState.target || '';
        const totalTyped = typed.length;
        let correct = 0;
        for (let i = 0; i < totalTyped; i += 1) {
            if (typed[i] === target[i]) correct += 1;
        }
        const accuracy = totalTyped === 0 ? 100 : Math.round((correct / totalTyped) * 100);
        const minutes = longState.startedAt ? Math.max((Date.now() - longState.startedAt) / 60000, 0.01) : 0.01;
        const wpm = Math.round((correct / 5) / minutes);
        return { correct, totalTyped, accuracy, wpm };
    }

    function updateStats() {
        const input = ui.input?.value || '';
        const stats = calculateStats(input);
        if (ui.progress) ui.progress.textContent = `${Math.min(input.length, longState.target.length)}/${longState.target.length}`;
        if (ui.accuracy) ui.accuracy.textContent = `${stats.accuracy}%`;
        if (ui.wpm) ui.wpm.textContent = String(Number.isFinite(stats.wpm) ? stats.wpm : 0);
        if (ui.source) ui.source.textContent = longState.source || 'PACK';
    }

    function start() {
        const pack = selectedPack();
        const customText = normalizeText(ui.customText?.value || '');
        const usesCustomText = ui.packSelect?.value === '__custom__' || isTemplatePack(pack);
        const text = usesCustomText ? customText : normalizeText(pack?.text || customText);

        if (isTemplatePack(pack) && !customText) {
            setStatus('이 템플릿은 직접 붙여넣은 텍스트가 있어야 시작할 수 있습니다.', true);
            ui.customText?.focus();
            return;
        }

        if (!text || text.length < 20) {
            setStatus('20자 이상의 장문 텍스트가 필요합니다.', true);
            if (usesCustomText) ui.customText?.focus();
            return;
        }

        longState.target = text;
        longState.source = usesCustomText ? 'USER PROVIDED' : sourceLabel(pack);
        longState.startedAt = Date.now();
        longState.completed = false;
        if (ui.input) {
            ui.input.value = '';
            ui.input.disabled = false;
            ui.input.focus();
        }
        renderPassage('');
        updateStats();
        setStatus('PRACTICE RUNNING');
    }

    function reset() {
        longState.startedAt = Date.now();
        longState.completed = false;
        if (ui.input) ui.input.value = '';
        renderPassage('');
        updateStats();
        setStatus(longState.target ? 'RESET' : 'READY');
        ui.input?.focus();
    }

    function handleInput() {
        if (!longState.target) return;
        const value = ui.input.value;
        if (!longState.startedAt) longState.startedAt = Date.now();
        renderPassage(value);
        updateStats();

        if (!longState.completed && value === longState.target) {
            longState.completed = true;
            setStatus('COMPLETE · 정확히 입력했습니다');
        } else if (longState.completed && value !== longState.target) {
            longState.completed = false;
            setStatus('PRACTICE RUNNING');
        }
    }

    function open() {
        bindUi();
        populatePackSelect();
        updatePackMeta();
        if (ui.screen) {
            ui.screen.classList.remove('hidden');
            ui.screen.setAttribute('aria-hidden', 'false');
        }
        document.getElementById('start-screen')?.classList.add('hidden');
        window.syncCodeDropChrome?.();
        if (!longState.target) {
            resetSelectedTarget();
        }
    }

    function close() {
        if (ui.screen) {
            ui.screen.classList.add('hidden');
            ui.screen.setAttribute('aria-hidden', 'true');
        }
        document.getElementById('start-screen')?.classList.remove('hidden');
        window.syncCodeDropChrome?.();
    }

    function saveUserPack(pack) {
        const text = normalizeText(pack?.text);
        if (!text) return null;
        const title = String(pack.title || 'User Long Pack').slice(0, 60) || 'User Long Pack';
        const label = String(pack.label || pack.title || title).slice(0, 80) || title;
        const existing = userPacks();
        const duplicate = existing.find(saved =>
            normalizeText(saved.text) === text &&
            String(saved.title || '').trim().toLowerCase() === title.trim().toLowerCase()
        );
        if (duplicate?.id) {
            const next = [duplicate, ...existing.filter(saved => saved.id !== duplicate.id)];
            saveUserPacks(next);
            longState.pendingPackId = duplicate.id;
            populatePackSelect();
            if (ui.packSelect) ui.packSelect.value = duplicate.id;
            updatePackMeta();
            return duplicate.id;
        }

        const id = `user_${Date.now()}`;
        const providerId = `manual_${Date.now().toString(36)}`;
        const next = [{
            id,
            title,
            label,
            text,
            tags: Array.isArray(pack.tags) ? pack.tags.slice(0, 8) : ['user-provided'],
            source: 'USER PROVIDED',
            providerId
        }, ...existing];
        saveUserPacks(next);
        longState.pendingPackId = id;
        populatePackSelect();
        if (ui.packSelect) ui.packSelect.value = id;
        updatePackMeta();
        return id;
    }

    function init() {
        bindUi();
        if (!ui.screen || ui.screen.dataset.bound === 'true') return;
        ui.screen.dataset.bound = 'true';
        populatePackSelect();
        ui.packSelect?.addEventListener('change', handlePackChange);
        ui.start?.addEventListener('click', start);
        ui.reset?.addEventListener('click', reset);
        ui.home?.addEventListener('click', () => {
            close();
            window.CodeDropRouter?.navigate?.('home');
        });
        ui.input?.addEventListener('input', handleInput);
        updatePackMeta();
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }

    return {
        open,
        close,
        selectPack,
        saveUserPack,
        refresh: populatePackSelect
    };
})();

if (typeof window !== 'undefined') {
    window.LongPractice = LongPractice;
}
