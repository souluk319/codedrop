/**
 * CodeDrop Long Practice
 * Long-form typing trainer for Korean, English, mixed text, and user-provided passages.
 */

const LongPractice = (() => {
    const CUSTOM_STORAGE_KEY = 'codedrop_long_text_packs_v1';
    const longState = {
        packs: [],
        remotePacks: [],
        fullText: '',
        units: [],
        unitIndex: 0,
        completedChars: 0,
        completedCorrect: 0,
        target: '',
        displayTarget: '',
        source: '',
        unitOptions: {},
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

    function currentLanguage() {
        try {
            return localStorage.getItem('codedrop_language') === 'en' ? 'en' : 'ko';
        } catch (error) {
            return 'ko';
        }
    }

    function normalizedTagList(tags = []) {
        const source = Array.isArray(tags) ? tags : String(tags || '').split(/[,\s]+/);
        const seen = new Set();
        return source
            .map(tag => String(tag || '').trim())
            .filter(Boolean)
            .filter(tag => {
                const key = tag.toLowerCase();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
    }

    function hasNormalizedTag(tags, target) {
        const key = String(target || '').toLowerCase();
        return normalizedTagList(tags).some(tag => tag.toLowerCase() === key);
    }

    function textForLanguage(en, ko) {
        return currentLanguage() === 'en' ? en : ko;
    }

    function localizedStatus(text) {
        const raw = String(text || '');
        if (raw.startsWith('NEXT LINE ')) {
            return `${textForLanguage('NEXT LINE', '다음 문장')} ${raw.slice('NEXT LINE '.length)}`;
        }
        const copy = {
            'READY': ['READY', '준비'],
            'PASTE TEXT TO START': ['PASTE TEXT TO START', '텍스트를 붙여넣고 시작하세요'],
            'PRACTICE RUNNING': ['PRACTICE RUNNING', '연습 진행 중'],
            'NEXT LINE': ['NEXT LINE', '다음 문장'],
            'COMPLETE · 모든 문장을 입력했습니다': ['COMPLETE · All sentences typed', '완료 · 모든 문장을 입력했습니다'],
            '이 템플릿은 직접 붙여넣은 텍스트가 있어야 시작할 수 있습니다.': ['Paste text into this template before starting.', '이 템플릿은 직접 붙여넣은 텍스트가 있어야 시작할 수 있습니다.'],
            '20자 이상의 장문 텍스트가 필요합니다.': ['Long practice text must contain at least 20 characters.', '20자 이상의 장문 텍스트가 필요합니다.'],
            '현재 줄을 끝까지 입력하면 Enter로 다음 줄로 이동합니다.': ['Finish the current line, then press Enter to continue.', '현재 줄을 끝까지 입력하면 Enter로 다음 줄로 이동합니다.']
        };
        const pair = copy[raw];
        return pair ? textForLanguage(pair[0], pair[1]) : raw;
    }

    function applyLanguage() {
        bindUi();
        const subtitle = document.querySelector('.long-subtitle');
        const packLabel = document.querySelector('label[for="long-pack-select"]');
        const statLabels = Array.from(document.querySelectorAll('.long-stat > span'));
        if (subtitle) subtitle.textContent = textForLanguage(
            'A long-form CodeDrop trainer for sentences, proverbs, and passages',
            '문장, 속담, 긴 글을 정확히 따라 치는 CodeDrop 장문 연습장'
        );
        if (ui.home) ui.home.textContent = textForLanguage('HOME', '홈');
        if (packLabel) packLabel.textContent = textForLanguage('Select Sentence Pack', '문장팩 선택');
        if (ui.customText) ui.customText.placeholder = textForLanguage(
            'Paste text you want to practice here. Copyrighted lyrics stay only in this private practice slot.',
            '사용자가 직접 입력한 글을 연습하려면 여기에 붙여넣으세요. 저작권 있는 가사는 이 개인 연습 슬롯에서만 다룹니다.'
        );
        if (ui.start) ui.start.textContent = textForLanguage('START TEXT', '연습 시작');
        if (ui.reset) ui.reset.textContent = textForLanguage('RESET', '초기화');
        if (ui.input) ui.input.placeholder = textForLanguage(
            'Type the passage above exactly.',
            '여기에 위 문장을 그대로 입력합니다.'
        );
        const labels = currentLanguage() === 'en'
            ? ['Progress', 'Accuracy', 'WPM', 'Source']
            : ['진행', '정확도', 'WPM', '출처'];
        statLabels.forEach((label, index) => {
            if (labels[index]) label.textContent = labels[index];
        });
        if (ui.packSelect) populatePackSelect();
        updatePackMeta();
        if (ui.status?.dataset.statusRaw) {
            setStatus(ui.status.dataset.statusRaw, ui.status.dataset.statusDanger === 'true');
        }
    }

    function isPlayableLongPack(pack) {
        if (!pack) return false;
        if (isTemplatePack(pack)) return true;
        return String(pack.text || '').trim().length >= 20;
    }

    function isVisibleLongPack(pack) {
        return Boolean(pack && pack.showInSelector !== false && isPlayableLongPack(pack));
    }

    function selectGroupLabel(group) {
        const key = String(group || '').trim().toLowerCase();
        if (key === 'korean') return textForLanguage('Korean Sentence Packs', '한국어 문장팩');
        if (key === 'english') return textForLanguage('English Sentence Packs', '영어 문장팩');
        if (key === 'mixed') return textForLanguage('Mixed Sentence Packs', '한영 문장팩');
        if (key === 'user templates') return textForLanguage('Direct Input', '직접 입력');
        if (key === 'user' || key === 'my packs') return textForLanguage('My Text Packs', '내 장문팩');
        if (key === 'public packs') return textForLanguage('Public Text Packs', '공개 장문팩');
        return group || textForLanguage('Sentence Packs', '문장팩');
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

    function normalizeLyricsStopwordToken(text) {
        return String(text || '')
            .trim()
            .replace(/[#[\](){}【】（）［］｛｝·ㆍ.。!！?？]/g, ' ')
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .toLowerCase();
    }

    function isLyricsStopword(text) {
        const raw = String(text || '').trim();
        if (!raw) return true;

        const candidates = [
            raw,
            raw.split(/[:：]/)[0]
        ].map(normalizeLyricsStopwordToken);

        return candidates.some(token => {
            if (!token) return false;
            const compact = token.replace(/\s+/g, '');
            return /^(?:intro|outro|verse|prechorus|postchorus|chorus|hook|bridge|refrain|interlude|repeat|instrumental|adlib|rap|dancebreak|break|x\d+|\d+x)(?:\d+)?$/i.test(compact) ||
                /^(?:후렴|벌스|버스|인트로|아웃트로|브릿지|브리지|코러스|훅|반복|간주|전주|후주|랩|댄스브레이크)(?:\d+)?$/i.test(compact);
        });
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
        if (pack?.preprocess === 'structured') {
            return cleanUserProvidedText(text);
        }
        if (options.userProvided || isUserProvidedPack(pack)) {
            return cleanUserProvidedText(text);
        }
        return normalizeText(text);
    }

    function isUserProvidedPack(pack) {
        if (!pack) return false;
        const tags = normalizedTagList(pack.tags);
        const source = String(pack.source || '').toUpperCase();
        return (
            pack.preprocess === 'user-provided' ||
            source.includes('USER PROVIDED') ||
            source.includes('MY PACK') ||
            (source.includes('PUBLIC PACK') && hasNormalizedTag(tags, 'user-provided')) ||
            hasNormalizedTag(tags, 'user-provided') ||
            String(pack.providerId || '').startsWith('manual_') ||
            String(pack.id || '').startsWith('user_')
        );
    }

    function inferUserPackPreprocess(pack) {
        if (pack?.preprocess === 'lyrics' || pack?.preprocess === 'structured' || pack?.preprocess === 'user-provided') {
            return pack.preprocess;
        }
        const tags = normalizedTagList(pack?.tags);
        const haystack = `${pack?.id || ''} ${pack?.title || ''} ${pack?.label || ''} ${pack?.source || ''} ${tags.join(' ')}`;
        if (/lyrics?|가사|song|노래|k-?pop|red\s*-?\s*red|verse|chorus|hook|bridge|pre\s*-?\s*chorus/i.test(haystack)) {
            return 'lyrics';
        }
        return 'user-provided';
    }

    function normalizeSavedUserPack(pack, group = 'User') {
        if (!pack) return pack;
        const tags = normalizedTagList(pack.tags);
        if (!hasNormalizedTag(tags, 'user-provided')) tags.unshift('user-provided');
        const preprocess = inferUserPackPreprocess({ ...pack, tags });
        if (preprocess === 'lyrics' && !hasNormalizedTag(tags, 'lyrics')) tags.push('lyrics');
        return {
            ...pack,
            group: pack.group || group,
            source: pack.source || 'USER PROVIDED',
            providerId: pack.providerId || pack.userId || `manual_${String(pack.id || Date.now()).replace(/^user_/, '')}`,
            tags: tags.slice(0, 10),
            preprocess
        };
    }

    function hydratePracticePack(pack) {
        if (!pack || isTemplatePack(pack) || !pack.text) return pack;
        const shouldClean = pack.preprocess === 'lyrics'
            || pack.preprocess === 'structured'
            || pack.preprocess === 'user-provided'
            || isUserProvidedPack(pack);
        if (!shouldClean) return pack;
        return {
            ...pack,
            text: preprocessPracticeText(pack.text, pack, { userProvided: isUserProvidedPack(pack) })
        };
    }

    function comparableChar(char) {
        return normalizePracticePunctuation(char);
    }

    function comparableText(text) {
        return Array.from(String(text || '')).map(comparableChar).join('');
    }

    function sanitizeUnitInput(value) {
        return normalizePracticePunctuation(value)
            .replace(/\r\n?/g, '\n')
            .replace(/[ \t]*\n+[ \t]*/g, ' ')
            .replace(/[ \t]{2,}/g, ' ');
    }

    function typingTargetFromDisplay(text) {
        return normalizePracticePunctuation(text)
            .replace(/[ \t]*\n+[ \t]*/g, ' ')
            .replace(/[ \t]{2,}/g, ' ')
            .trim();
    }

    function displayLineBreakPositions(text) {
        const positions = [];
        let index = 0;
        for (const char of Array.from(String(text || ''))) {
            if (char === '\n') {
                positions.push(index);
                index += 1;
            } else {
                index += 1;
            }
        }
        return positions;
    }

    function displayTargetLines() {
        return String(longState.displayTarget || '').split('\n').filter(line => line.length > 0);
    }

    function currentLineProgress(input = ui.input?.value || '') {
        const targetLines = displayTargetLines();
        if (targetLines.length <= 1) {
            return {
                hasNextLine: false,
                typedEnough: isUnitReadyToComplete(input),
                lineIndex: 0
            };
        }

        const typedLines = String(input || '').replace(/\r\n?/g, '\n').split('\n');
        const lineIndex = Math.min(Math.max(typedLines.length - 1, 0), targetLines.length - 1);
        const typedLine = normalizePracticePunctuation(typedLines[lineIndex] || '');
        const targetLine = typingTargetFromDisplay(targetLines[lineIndex] || '');
        return {
            hasNextLine: lineIndex < targetLines.length - 1,
            typedEnough: typedLine.length >= targetLine.length,
            lineIndex
        };
    }

    function isAtDisplayLineBreak(input = ui.input?.value || '') {
        const progress = currentLineProgress(input);
        return progress.hasNextLine && progress.typedEnough;
    }

    function insertLongInputText(text) {
        if (!ui.input) return;
        const start = Number.isFinite(ui.input.selectionStart) ? ui.input.selectionStart : ui.input.value.length;
        const end = Number.isFinite(ui.input.selectionEnd) ? ui.input.selectionEnd : start;
        ui.input.setRangeText(text, start, end, 'end');
        handleInput({
            inputType: text === '\n' ? 'insertLineBreak' : 'insertText',
            data: text
        });
    }

    function isLineStructuredText(normalized) {
        const lines = normalized.split('\n').map(line => line.trim()).filter(Boolean);
        if (lines.length < 4) return false;
        const shortLineCount = lines.filter(line => line.length <= 90).length;
        return /\n\s*\n/.test(normalized) || shortLineCount / lines.length >= 0.75;
    }

    function hasMultiplePracticeLines(normalized) {
        return normalized.split('\n').map(line => line.trim()).filter(Boolean).length >= 2;
    }

    function splitLineStructuredUnits(normalized) {
        const units = [];
        const sections = normalized
            .split(/\n\s*\n+/)
            .map(section => section.split('\n').map(line => line.trim()).filter(Boolean))
            .filter(lines => lines.length > 0);

        sections.forEach(lines => {
            const chunkSize = lines.length <= 4 ? lines.length : 4;
            for (let index = 0; index < lines.length; index += chunkSize) {
                const chunk = lines.slice(index, index + chunkSize);
                if (chunk.length) units.push(chunk.join('\n'));
            }
        });

        return units.filter(unit => typingTargetFromDisplay(unit).length > 0);
    }

    function shouldPreserveLineStructure(pack, usesCustomText = false) {
        if (pack?.preprocess === 'lyrics' || pack?.preprocess === 'structured') return true;
        if (pack?.preprocess === 'user-provided' || isUserProvidedPack(pack)) return true;
        if (!usesCustomText) return false;
        const tags = Array.isArray(pack?.tags) ? pack.tags.join(' ') : '';
        return /lyrics?|가사|song|verse|user-provided/i.test(`${pack?.id || ''} ${pack?.title || ''} ${tags}`);
    }

    function splitPracticeUnits(text, options = {}) {
        const normalized = normalizeText(text);
        if (!normalized) return [];

        if (options.preserveLineStructure && (isLineStructuredText(normalized) || hasMultiplePracticeLines(normalized))) {
            const structured = splitLineStructuredUnits(normalized);
            if (structured.length > 0) return structured;
        }

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
        return textForLanguage(
            'Paste text you want to practice here. Copyrighted lyrics stay only in this private practice slot.',
            '사용자가 직접 입력한 글을 연습하려면 여기에 붙여넣으세요. 저작권 있는 가사는 기본팩에 넣지 않고, 이 개인 연습 슬롯에서만 다룹니다.'
        );
    }

    function applyCustomPlaceholder(pack) {
        if (!ui.customText) return;
        ui.customText.placeholder = isTemplatePack(pack)
            ? textForLanguage(
                'This template contains no source text. Paste the text you want to practice.',
                pack.promptText || '이 템플릿은 원문을 포함하지 않습니다. 연습할 텍스트를 직접 붙여넣으세요.'
            )
            : defaultCustomPlaceholder();
    }

    function buildPackList() {
        const builtIn = Array.isArray(window.LONG_TEXT_PACKS) ? window.LONG_TEXT_PACKS : [];
        longState.packs = [
            ...builtIn,
            ...longState.remotePacks.map(pack => normalizeSavedUserPack(pack, pack.group || 'My Packs')),
            ...userPacks().map(pack => normalizeSavedUserPack(pack, 'User'))
        ].map(hydratePracticePack).filter(isPlayableLongPack);
    }

    function isRemoteLongPack(pack) {
        return pack && (pack.kind === 'long' || pack.packKind === 'long') && String(pack.text || '').trim().length > 0;
    }

    function mapRemoteLongPack(pack, group) {
        const id = `remote_${pack.id}`;
        return {
            id,
            remoteId: pack.id,
            title: pack.title || 'Long Practice Pack',
            label: pack.title || 'Long Practice Pack',
            text: pack.text || '',
            tags: Array.isArray(pack.tags) ? pack.tags : [],
            source: group === 'Public Packs' ? 'PUBLIC PACK' : 'MY PACK',
            providerId: pack.ownerNickname || `pack_${pack.id}`,
            preprocess: pack.preprocess || 'user-provided',
            group
        };
    }

    function setRemotePacks(mine = [], publicPacks = []) {
        const seen = new Set();
        const next = [];
        const add = (pack, group) => {
            if (!isRemoteLongPack(pack)) return;
            const key = String(pack.id);
            if (seen.has(key)) return;
            seen.add(key);
            next.push(mapRemoteLongPack(pack, group));
        };
        mine.forEach(pack => add(pack, 'My Packs'));
        publicPacks.forEach(pack => add(pack, 'Public Packs'));
        longState.remotePacks = next;
        populatePackSelect();
    }

    function populatePackSelect() {
        if (!ui.packSelect) return;
        const desiredValue = longState.pendingPackId || ui.packSelect.value || '';
        buildPackList();
        ui.packSelect.innerHTML = '';

        const visiblePacks = longState.packs.filter(isVisibleLongPack);
        const groups = new Map();
        visiblePacks.forEach(pack => {
            const group = pack.group || 'Practice';
            if (!groups.has(group)) groups.set(group, []);
            groups.get(group).push(pack);
        });

        groups.forEach((packs, group) => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = selectGroupLabel(group);
            packs.forEach(pack => {
                const option = document.createElement('option');
                option.value = pack.id;
                option.textContent = pack.title || pack.label || pack.id;
                optgroup.appendChild(option);
            });
            ui.packSelect.appendChild(optgroup);
        });

        const hasDirectInputTemplate = visiblePacks.some(pack => isTemplatePack(pack));
        if (!hasDirectInputTemplate) {
            const customOption = document.createElement('option');
            customOption.value = '__custom__';
            customOption.textContent = textForLanguage('Paste your own text', '직접 붙여넣기');
            ui.packSelect.appendChild(customOption);
        }

        const hasDesiredValue = Array.from(ui.packSelect.options).some(option => option.value === desiredValue);
        if (desiredValue && hasDesiredValue) {
            ui.packSelect.value = desiredValue;
        } else if (currentLanguage() === 'en') {
            const englishPack = visiblePacks.find(pack => String(pack.group || '').toLowerCase() === 'english');
            if (englishPack) ui.packSelect.value = englishPack.id;
        }
    }

    function selectedPack() {
        const pack = longState.packs.find(candidate => candidate.id === ui.packSelect?.value) || null;
        return pack ? hydratePracticePack(pack) : null;
    }

    function updatePackMeta() {
        const pack = selectedPack();
        if (!ui.meta) return;
        applyCustomPlaceholder(pack);
        if (!pack) {
            ui.meta.textContent = textForLanguage(
                'Direct-input text is private practice content. Copyrighted lyrics are never bundled in official packs.',
                '직접 입력 텍스트는 개인 연습용입니다. 기본팩에는 저작권 있는 가사를 번들하지 않습니다.'
            );
            return;
        }
        if (isTemplatePack(pack)) {
            ui.meta.textContent = `${pack.title || pack.label} · ${sourceLabel(pack)} · ${textForLanguage(
                'Paste the source into the private slot; it is not included in official packs.',
                '원문은 직접 붙여넣기 슬롯에서만 사용합니다. 기본팩에는 포함하지 않습니다.'
            )}`;
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
        longState.unitOptions = { preserveLineStructure: shouldPreserveLineStructure(pack, usesCustomText || isTemplatePack(pack)) };
        longState.unitIndex = 0;
        longState.completedChars = 0;
        longState.completedCorrect = 0;
        longState.target = '';
        longState.displayTarget = '';
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
        ui.status.dataset.statusRaw = String(text || '');
        ui.status.dataset.statusDanger = String(Boolean(danger));
        ui.status.textContent = localizedStatus(text);
        ui.status.style.color = danger ? 'var(--danger-color)' : 'var(--secondary-neon)';
    }

    function renderPassage(input = '') {
        if (!ui.passage) return;
        const fragment = document.createDocumentFragment();
        const displayTarget = longState.displayTarget || longState.target || '';
        const target = longState.target || typingTargetFromDisplay(displayTarget);
        const typed = sanitizeUnitInput(input);
        let typedIndex = 0;

        for (const char of Array.from(displayTarget)) {
            if (char === '\n') {
                const spacer = document.createElement('span');
                const expected = ' ';
                if (typedIndex < typed.length) {
                    spacer.className = `long-char line-space ${comparableChar(typed[typedIndex]) === expected ? 'ok' : 'miss'}`;
                } else if (typedIndex === typed.length) {
                    spacer.className = 'long-char line-space cursor';
                } else {
                    spacer.className = 'long-char line-space';
                }
                spacer.textContent = ' ';
                fragment.appendChild(spacer);
                fragment.appendChild(document.createElement('br'));
                typedIndex += 1;
                continue;
            }

            const span = document.createElement('span');
            const expected = target[typedIndex] || char;
            span.textContent = char;
            if (typedIndex < typed.length) {
                span.className = `long-char ${comparableChar(typed[typedIndex]) === comparableChar(expected) ? 'ok' : 'miss'}`;
            } else if (typedIndex === typed.length) {
                span.className = 'long-char cursor';
            } else {
                span.className = 'long-char';
            }
            fragment.appendChild(span);
            typedIndex += 1;
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
        const totalLength = longState.units.reduce((sum, unit) => sum + typingTargetFromDisplay(unit).length, 0) || longState.target.length;
        const progress = Math.min(longState.completedChars + sanitizeUnitInput(input).length, totalLength);
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
        longState.displayTarget = longState.units[longState.unitIndex] || '';
        longState.target = typingTargetFromDisplay(longState.displayTarget);
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
        const rawValue = ui.input?.value || '';
        const value = sanitizeUnitInput(rawValue);
        const correct = countCorrectChars(value, currentTarget);
        longState.completed = true;
        longState.completedChars += currentTarget.length;
        longState.completedCorrect += correct;
        if (ui.input) {
            ui.input.value = '';
            ui.input.disabled = true;
        }
        renderPassage(rawValue || currentTarget);
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
        const unitOptions = {
            preserveLineStructure: shouldPreserveLineStructure(pack, usesCustomText)
        };

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
        longState.unitOptions = unitOptions;
        longState.units = splitPracticeUnits(text, unitOptions);
        longState.unitIndex = 0;
        longState.completedChars = 0;
        longState.completedCorrect = 0;
        longState.displayTarget = longState.units[0] || text;
        longState.target = typingTargetFromDisplay(longState.displayTarget);
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
            longState.units = splitPracticeUnits(longState.fullText, longState.unitOptions);
        }
        if (longState.units.length) {
            longState.displayTarget = longState.units[0];
            longState.target = typingTargetFromDisplay(longState.displayTarget);
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

    function playLongTypingSound(eventOrKey = 'a') {
        if (window.CodeDropTypingSfx?.play) {
            window.CodeDropTypingSfx.play(eventOrKey, { source: 'long', force: true });
            longState.lastKeySoundAt = Date.now();
            return;
        }
        const key = eventOrKey && typeof eventOrKey === 'object' ? eventOrKey.key : eventOrKey;
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
            playLongTypingSound(event);
            const value = ui.input?.value || '';
            const lineProgress = currentLineProgress(value);
            const atDisplayLineBreak = isAtDisplayLineBreak(value);
            if (isUnitReadyToComplete(value) || (!atDisplayLineBreak && !lineProgress.hasNextLine && lineProgress.typedEnough)) {
                completeCurrentUnit();
                return;
            }
            if (atDisplayLineBreak) {
                insertLongInputText('\n');
                setStatus('NEXT LINE');
                return;
            }
            setStatus('현재 줄을 끝까지 입력하면 Enter로 다음 줄로 이동합니다.');
            return;
        }
        if (!isAudibleKey(event.key)) return;
        playLongTypingSound(event);
    }

    function handleInput(event) {
        if (!longState.target) return;
        const value = ui.input?.value || '';
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
        applyLanguage();
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
        const normalizedPack = normalizeSavedUserPack(pack || {}, 'User');
        const text = preprocessPracticeText(normalizedPack.text, normalizedPack, { userProvided: true });
        if (!text) return null;
        const title = String(normalizedPack.title || 'User Long Pack').slice(0, 60) || 'User Long Pack';
        const label = String(normalizedPack.label || normalizedPack.title || title).slice(0, 80) || title;
        const existing = userPacks();
        const duplicate = existing.find(saved =>
            normalizeText(saved.text) === text &&
            String(saved.title || '').trim().toLowerCase() === title.trim().toLowerCase()
        );
        if (duplicate?.id) {
            const next = [
                normalizeSavedUserPack({ ...duplicate, text }, 'User'),
                ...existing.filter(saved => saved.id !== duplicate.id)
            ];
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
            tags: normalizedPack.tags,
            source: 'USER PROVIDED',
            providerId,
            preprocess: normalizedPack.preprocess
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
        window.addEventListener('codedrop:language', applyLanguage);
        applyLanguage();
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
        setRemotePacks,
        refresh: populatePackSelect,
        listPacks
    };
})();

if (typeof window !== 'undefined') {
    window.LongPractice = LongPractice;
}
