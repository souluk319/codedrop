/**
 * CodeDrop Long Practice
 * Long-form typing trainer for Korean, English, mixed text, and user-provided passages.
 */

const LongPractice = (() => {
    const CUSTOM_STORAGE_KEY = 'codedrop_long_text_packs_v1';
    const longState = {
        packs: [],
        fullText: '',
        units: [],
        unitIndex: 0,
        completedChars: 0,
        completedCorrect: 0,
        target: '',
        source: '',
        startedAt: 0,
        completed: false,
        pendingPackId: '',
        advanceTimer: 0,
        lastKeySoundAt: 0
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

    function normalizePracticePunctuation(text) {
        return String(text || '')
            .replace(/\u00a0/g, ' ')
            .replace(/[‘’‚‛ʼ`´＇]/g, "'")
            .replace(/[“”„‟＂]/g, '"')
            .replace(/[‐‑‒–—―]/g, '-')
            .replace(/…/g, '...');
    }

    function isLyricsStopword(text) {
        const token = String(text || '')
            .trim()
            .replace(/[#[\](){}【】（）［］｛｝·ㆍ.。!！?？:：-]/g, ' ')
            .replace(/\s+/g, ' ')
            .toLowerCase();
        if (!token) return true;
        return /^(?:intro|outro|verse|pre chorus|post chorus|chorus|hook|bridge|refrain|interlude|repeat|instrumental|ad lib|adlib|rap|dance break|break|x\s*\d+|\d+\s*x|후렴|벌스|버스|인트로|아웃트로|브릿지|브리지|코러스|훅|반복|간주|전주|후주|랩|댄스 브레이크)(?:\s*\d+)?$/i.test(token);
    }

    function trimBracketShell(text) {
        return String(text || '')
            .replace(/^[\s[\](){}【】（）［］｛｝]+|[\s[\](){}【】（）［］｛｝]+$/g, '')
            .trim();
    }

    function cleanLyricsText(text) {
        const stageLinePattern = /^\s*(?:\[[^\]]+\]|\([^)]{1,80}\)|\{[^}]{1,80}\}|【[^】]{1,80}】|（[^）]{1,80}）|［[^］]{1,80}］|｛[^｝]{1,80}｝)\s*$/;
        return normalizeText(normalizePracticePunctuation(text))
            .split('\n')
            .map(line => {
                let next = line
                    .replace(/\b\d{1,2}:\d{2}(?:\.\d{1,3})?\b/g, ' ')
                    .replace(/[♪♫♬※]/g, ' ')
                    .replace(/^\s*(?:lyrics?|official lyrics?|romanized|translation|english translation|hangul|가사|번역|로마자)\s*[:：-]?\s*$/i, '');

                if (stageLinePattern.test(next)) {
                    const inner = trimBracketShell(next);
                    if (isLyricsStopword(inner)) return '';
                }

                next = next.replace(/[\[({【（［｛]\s*([^\])}】）］｝]{1,80}?)\s*[\])}】）］｝]/g, (match, inner) => {
                    const clean = String(inner || '').trim();
                    return isLyricsStopword(clean) ? ' ' : ` ${clean} `;
                });

                return next
                    .replace(/^\s*(?:intro|outro|verse|pre[-\s]?chorus|post[-\s]?chorus|chorus|hook|bridge|refrain|interlude|후렴|벌스|인트로|아웃트로|브릿지|브리지|코러스|훅)\s*\d*\s*[:：-]\s*/i, '')
                    .replace(/[ \t]{2,}/g, ' ')
                    .trim();
            })
            .filter(Boolean)
            .join('\n')
            .replace(/[ \t]{2,}/g, ' ')
            .trim();
    }

    function cleanUserProvidedText(text) {
        const stageLinePattern = /^\s*(?:\[[^\]]+\]|\([^)]{1,80}\)|\{[^}]{1,80}\}|【[^】]{1,80}】|（[^）]{1,80}）|［[^］]{1,80}］|｛[^｝]{1,80}｝)\s*$/;
        return normalizeText(normalizePracticePunctuation(text))
            .split('\n')
            .map(line => {
                let next = line
                    .replace(/\b\d{1,2}:\d{2}(?:\.\d{1,3})?\b/g, ' ')
                    .replace(/[♪♫♬※]/g, ' ');

                if (stageLinePattern.test(next)) {
                    const inner = trimBracketShell(next);
                    if (isLyricsStopword(inner)) return '';
                }

                next = next.replace(/[\[({【（［｛]\s*([^\])}】）］｝]{1,120}?)\s*[\])}】）］｝]/g, (match, inner) => {
                    const clean = String(inner || '').trim();
                    return isLyricsStopword(clean) ? ' ' : ` ${clean} `;
                });

                return next
                    .replace(/[ \t]{2,}/g, ' ')
                    .replace(/\s+([,.;:!?])/g, '$1')
                    .trim();
            })
            .filter(Boolean)
            .join('\n')
            .replace(/[ \t]{2,}/g, ' ')
            .trim();
    }

    function preprocessPracticeText(text, pack, options = {}) {
        if (pack?.preprocess === 'lyrics') {
            return cleanLyricsText(text);
        }
        if (options.userProvided || isUserProvidedPack(pack)) {
            return cleanUserProvidedText(text);
        }
        return normalizeText(text);
    }

    function isUserProvidedPack(pack) {
        if (!pack) return false;
        const tags = Array.isArray(pack.tags) ? pack.tags : [];
        return (
            pack.preprocess === 'user-provided' ||
            pack.source === 'USER PROVIDED' ||
            tags.includes('user-provided') ||
            String(pack.providerId || '').startsWith('manual_') ||
            String(pack.id || '').startsWith('user_')
        );
    }

    function comparableChar(char) {
        return normalizePracticePunctuation(char);
    }

    function comparableText(text) {
        return Array.from(String(text || '')).map(comparableChar).join('');
    }

    function sanitizeUnitInput(value) {
        return String(value || '').replace(/\r?\n/g, ' ');
    }

    function splitPracticeUnits(text) {
        const normalized = normalizeText(text);
        if (!normalized) return [];

        const roughUnits = normalized
            .split(/\n+/)
            .flatMap(line => {
                const clean = line.trim();
                if (!clean) return [];
                if (clean.length <= 150) return [clean];
                const sentences = clean.match(/[^.!?。！？]+[.!?。！？]?/g) || [clean];
                return sentences.map(sentence => sentence.trim()).filter(Boolean);
            });

        const units = [];
        roughUnits.forEach(unit => {
            if (unit.length <= 170) {
                units.push(unit);
                return;
            }

            let chunk = '';
            unit.split(/\s+/).forEach(word => {
                const next = chunk ? `${chunk} ${word}` : word;
                if (next.length > 150 && chunk) {
                    units.push(chunk);
                    chunk = word;
                } else {
                    chunk = next;
                }
            });
            if (chunk) units.push(chunk);
        });

        return units.filter(Boolean);
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
        const usesCustomText = ui.packSelect?.value === '__custom__';
        longState.fullText = usesCustomText || isTemplatePack(pack) ? '' : preprocessPracticeText(pack?.text || '', pack);
        longState.units = [];
        longState.unitIndex = 0;
        longState.completedChars = 0;
        longState.completedCorrect = 0;
        longState.target = '';
        longState.source = isTemplatePack(pack) ? 'USER PROVIDED' : sourceLabel(pack);
        longState.startedAt = 0;
        longState.completed = false;
        window.clearTimeout(longState.advanceTimer);
        if (ui.input) {
            ui.input.value = '';
            ui.input.disabled = true;
        }
        renderPassage('');
        updateStats();
        setStatus(usesCustomText || isTemplatePack(pack) ? 'PASTE TEXT TO START' : 'READY');
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
        const typed = sanitizeUnitInput(input);

        for (let index = 0; index < target.length; index += 1) {
            const span = document.createElement('span');
            const char = target[index];
            span.textContent = char;
            if (index < typed.length) {
                span.className = `long-char ${comparableChar(typed[index]) === comparableChar(char) ? 'ok' : 'miss'}`;
            } else if (index === typed.length) {
                span.className = 'long-char cursor';
            } else {
                span.className = 'long-char';
            }
            fragment.appendChild(span);
        }

        ui.passage.replaceChildren(fragment);
    }

    function countCorrectChars(input, target = longState.target || '') {
        const typed = comparableText(sanitizeUnitInput(input));
        const expected = comparableText(target);
        let correct = 0;
        for (let i = 0; i < typed.length; i += 1) {
            if (typed[i] === expected[i]) correct += 1;
        }
        return correct;
    }

    function isUnitReadyToComplete(input, target = longState.target || '') {
        return sanitizeUnitInput(input).length >= String(target || '').length;
    }

    function calculateStats(input) {
        const typed = String(input || '');
        const totalTyped = typed.length;
        const correct = countCorrectChars(typed);
        const allTyped = longState.completedChars + totalTyped;
        const allCorrect = longState.completedCorrect + correct;
        const accuracy = allTyped === 0 ? 100 : Math.round((allCorrect / allTyped) * 100);
        const minutes = longState.startedAt ? Math.max((Date.now() - longState.startedAt) / 60000, 0.01) : 0.01;
        const wpm = Math.round((allCorrect / 5) / minutes);
        return { correct, totalTyped, accuracy, wpm };
    }

    function updateStats() {
        const input = ui.input?.value || '';
        const stats = calculateStats(input);
        const totalLength = longState.units.reduce((sum, unit) => sum + unit.length, 0) || longState.target.length;
        const progress = Math.min(longState.completedChars + input.length, totalLength);
        if (ui.progress) ui.progress.textContent = `${progress}/${totalLength}`;
        if (ui.accuracy) ui.accuracy.textContent = `${stats.accuracy}%`;
        if (ui.wpm) ui.wpm.textContent = String(Number.isFinite(stats.wpm) ? stats.wpm : 0);
        if (ui.source) {
            const current = longState.units.length ? ` ${longState.unitIndex + 1}/${longState.units.length}` : '';
            ui.source.textContent = `${longState.source || 'PACK'}${current}`;
        }
    }

    function setCurrentUnit(index) {
        longState.unitIndex = Math.max(0, Math.min(index, longState.units.length - 1));
        longState.target = longState.units[longState.unitIndex] || '';
        longState.completed = false;
        if (ui.input) {
            ui.input.value = '';
            ui.input.disabled = !longState.target;
            ui.input.focus();
        }
        renderPassage('');
        updateStats();
    }

    function completeCurrentUnit() {
        if (longState.completed) return;

        const currentTarget = longState.target || '';
        const value = sanitizeUnitInput(ui.input?.value || '');
        const correct = countCorrectChars(value, currentTarget);
        longState.completed = true;
        longState.completedChars += currentTarget.length;
        longState.completedCorrect += correct;
        if (ui.input) {
            ui.input.value = '';
            ui.input.disabled = true;
        }
        renderPassage(currentTarget);
        updateStats();
        if (typeof window.sfx !== 'undefined') window.sfx.playSuccess?.();

        const isLast = longState.unitIndex >= longState.units.length - 1;
        if (isLast) {
            if (ui.input) ui.input.disabled = true;
            setStatus('COMPLETE · 모든 문장을 입력했습니다');
            return;
        }

        setStatus(`NEXT LINE ${longState.unitIndex + 2}/${longState.units.length}`);
        window.clearTimeout(longState.advanceTimer);
        longState.advanceTimer = window.setTimeout(() => {
            setCurrentUnit(longState.unitIndex + 1);
            setStatus('PRACTICE RUNNING');
        }, 520);
    }

    function start() {
        const pack = selectedPack();
        const rawCustomText = ui.customText?.value || '';
        const customText = preprocessPracticeText(rawCustomText, pack, { userProvided: true });
        const usesCustomText = ui.packSelect?.value === '__custom__' || isTemplatePack(pack);
        const text = usesCustomText ? customText : preprocessPracticeText(pack?.text || customText, pack);

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

        longState.fullText = text;
        longState.units = splitPracticeUnits(text);
        longState.unitIndex = 0;
        longState.completedChars = 0;
        longState.completedCorrect = 0;
        longState.target = longState.units[0] || text;
        longState.source = usesCustomText
            ? (pack?.preprocess === 'lyrics' ? 'USER PROVIDED · LYRICS CLEAN' : 'USER PROVIDED')
            : sourceLabel(pack);
        longState.startedAt = Date.now();
        longState.completed = false;
        window.clearTimeout(longState.advanceTimer);
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
        window.clearTimeout(longState.advanceTimer);
        longState.startedAt = Date.now();
        longState.completed = false;
        longState.completedChars = 0;
        longState.completedCorrect = 0;
        longState.unitIndex = 0;
        if (longState.fullText && !longState.units.length) {
            longState.units = splitPracticeUnits(longState.fullText);
        }
        if (longState.units.length) {
            longState.target = longState.units[0];
        }
        if (ui.input) {
            ui.input.value = '';
            ui.input.disabled = !longState.target;
        }
        renderPassage('');
        updateStats();
        setStatus(longState.target ? 'RESET' : 'READY');
        ui.input?.focus();
    }

    function isAudibleKey(key) {
        return key === 'Enter' || key === 'Backspace' || key === ' ' || String(key || '').length === 1;
    }

    function playLongTypingSound(key = 'a') {
        if (!window.sfx || typeof window.sfx.playKey !== 'function') return;
        window.sfx.playKey(key);
        longState.lastKeySoundAt = Date.now();
    }

    function handleKeydown(event) {
        if (!longState.target || ui.input?.disabled) return;
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        if (event.key === 'Process' || event.isComposing) return;
        if (event.key === 'Enter') {
            event.preventDefault();
            playLongTypingSound(event.key);
            setStatus('제시어를 끝까지 입력하면 자동으로 다음 제시어로 넘어갑니다.');
            return;
        }
        if (!isAudibleKey(event.key)) return;
        playLongTypingSound(event.key);
    }

    function handleInput(event) {
        if (!longState.target) return;
        const value = sanitizeUnitInput(ui.input.value);
        if (ui.input.value !== value) {
            ui.input.value = value;
        }
        if (!longState.startedAt) longState.startedAt = Date.now();
        if (event && event.inputType !== 'insertFromPaste' && Date.now() - longState.lastKeySoundAt > 35) {
            const key = event.inputType?.startsWith('delete') ? 'Backspace' : (event.data === ' ' ? ' ' : 'a');
            playLongTypingSound(key);
        }
        renderPassage(value);
        updateStats();

        if (isUnitReadyToComplete(value)) {
            completeCurrentUnit();
        } else if (longState.completed) {
            longState.completed = false;
            setStatus('PRACTICE RUNNING');
        } else {
            setStatus('PRACTICE RUNNING');
        }
    }

    function open(options = {}) {
        bindUi();
        populatePackSelect();
        if (options.packId) {
            selectPack(options.packId, true);
        }
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
        if (options.autoStart) {
            window.setTimeout(start, 0);
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
        const text = preprocessPracticeText(pack?.text, pack, { userProvided: true });
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
            providerId,
            preprocess: pack.preprocess || 'user-provided'
        }, ...existing];
        saveUserPacks(next);
        longState.pendingPackId = id;
        populatePackSelect();
        if (ui.packSelect) ui.packSelect.value = id;
        updatePackMeta();
        return id;
    }

    function listPacks() {
        bindUi();
        buildPackList();
        return longState.packs.map(pack => ({ ...pack }));
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
        ui.input?.addEventListener('keydown', handleKeydown);
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
        refresh: populatePackSelect,
        listPacks
    };
})();

if (typeof window !== 'undefined') {
    window.LongPractice = LongPractice;
}
