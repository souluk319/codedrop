/**
 * CodeDrop - 학습 모드 엔진 (초심자 커리큘럼)
 *
 * 흐름: 커리큘럼 픽커 → 개념 카드 → 따라치기(스캐폴딩 페이드) →
 *       시뮬레이션 터미널 출력 + 해설 → 미니퀴즈(기존 시나리오 문제) → 요약
 *
 * 순차 언락: 직전 레슨을 완료해야 다음 레슨이 열립니다.
 * 사용: LearnMode.openPicker() / LearnMode.startLesson(id)
 */

const LearnMode = (() => {

    const LEARN_API_BASE = (typeof window !== 'undefined' && window.CODEDROP_API_BASE) || '/games/codedrop';

    const $ = (id) => document.getElementById(id);
    const ui = {};

    // ---------- 진행도 스토어 ----------
    const LearnProgress = (() => {
        const KEY = 'codedrop_learn_progress';
        const VERSION = 1;
        let memoryData = null;

        function emptyData() {
            return { v: VERSION, lessons: {}, last: null };
        }

        function normalizeData(data) {
            if (!data || data.v !== VERSION || !data.lessons || typeof data.lessons !== 'object' || Array.isArray(data.lessons)) {
                return emptyData();
            }

            const normalized = emptyData();
            if (data.last !== null && data.last !== undefined) {
                if (typeof data.last !== 'string') return emptyData();
                normalized.last = data.last;
            }

            for (const [id, entry] of Object.entries(data.lessons)) {
                if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return emptyData();
                if (entry.done !== true && entry.done !== false) return emptyData();

                const quizBest = Math.max(0, Number(entry.quizBest) || 0);
                const quizTotal = Math.max(0, Number(entry.quizTotal) || 0);
                const peeks = Math.max(0, Number(entry.peeks) || 0);
                const at = Math.max(0, Number(entry.at) || 0);
                normalized.lessons[id] = {
                    done: entry.done === true,
                    quizBest: Math.min(quizBest, quizTotal || quizBest),
                    quizTotal,
                    peeks,
                    at
                };
            }

            return normalized;
        }

        function load() {
            if (memoryData) return normalizeData(memoryData);
            try {
                return normalizeData(JSON.parse(localStorage.getItem(KEY)));
            } catch (e) { /* 손상 → 리셋 */ }
            return emptyData();
        }

        function save(data) {
            const normalized = normalizeData(data);
            memoryData = normalized;
            try {
                localStorage.setItem(KEY, JSON.stringify(normalized));
            } catch (e) {
                console.warn('Learn progress will stay in memory for this session:', e);
            }
        }

        function markVisit(lessonId) {
            const data = load();
            data.last = lessonId;
            save(data);
        }

        function complete(lessonId, quizBest, quizTotal, peeks) {
            const data = load();
            const prev = data.lessons[lessonId] || {};
            data.lessons[lessonId] = {
                done: true,
                quizBest: Math.max(prev.quizBest || 0, quizBest),
                quizTotal,
                peeks,
                at: Date.now()
            };
            data.last = lessonId;
            save(data);
        }

        function isDone(lessonId) {
            const data = load();
            return Boolean(data.lessons[lessonId] && data.lessons[lessonId].done === true);
        }

        function reset() {
            memoryData = null;
            localStorage.removeItem(KEY);
        }

        return { load, markVisit, complete, isDone, reset };
    })();

    // ---------- 커리큘럼 헬퍼 ----------

    function tracks() {
        return (typeof LESSON_TRACKS !== 'undefined') ? LESSON_TRACKS : [];
    }

    // [{lesson, track}] 순서 평탄화
    function flatLessons() {
        const flat = [];
        tracks().forEach(track => {
            track.lessons.forEach(lesson => flat.push({ lesson, track }));
        });
        return flat;
    }

    function findLesson(lessonId) {
        return flatLessons().find(item => item.lesson.id === lessonId) || null;
    }

    function isUnlocked(lessonId) {
        const flat = flatLessons();
        const idx = flat.findIndex(item => item.lesson.id === lessonId);
        if (idx === -1) return false;
        if (idx === 0) return true;
        return LearnProgress.isDone(flat[idx - 1].lesson.id);
    }

    // 다음 미완료(=이어서 학습할) 레슨
    function nextLesson() {
        return flatLessons().find(item => !LearnProgress.isDone(item.lesson.id)) || null;
    }

    function progress() {
        const flat = flatLessons();
        const done = flat.filter(item => LearnProgress.isDone(item.lesson.id)).length;
        const next = nextLesson();
        return {
            done,
            total: flat.length,
            next: next ? { id: next.lesson.id, title: next.lesson.title, track: next.track.title } : null
        };
    }

    function lessonsForCategory(cat) {
        return flatLessons()
            .filter(item => lessonCategories(item.lesson).includes(cat))
            .map(item => ({ id: item.lesson.id, title: item.lesson.title }));
    }

    function lessonCategories(lesson) {
        const cats = Array.isArray(lesson.categories) ? lesson.categories.slice() : [];
        if (lesson.quizFrom && !cats.includes(lesson.quizFrom)) cats.push(lesson.quizFrom);
        return cats;
    }

    function focusNextAction() {
        if (window.innerWidth >= 720 && window.innerHeight >= 700) {
            ui.nextBtn.focus();
        }
    }

    function resumeLesson() {
        const data = LearnProgress.load();
        if (data.last && !LearnProgress.isDone(data.last) && isUnlocked(data.last)) {
            const last = findLesson(data.last);
            if (last) return last;
        }
        return nextLesson();
    }

    // ---------- 세션 상태 ----------

    const session = {
        lesson: null,
        track: null,
        phase: 'intro',      // 'intro' | 'step' | 'quiz' | 'summary'
        stepIdx: 0,
        answered: false,     // 현재 스텝/퀴즈 완료 여부 (Enter → 다음)
        peeked: false,       // 현재 hint 스텝에서 정답 보기 사용
        stepHintOpen: false,
        peekCount: 0,
        quizList: [],
        quizIdx: 0,
        quizCorrect: 0,
        quizWrongAttempts: 0,
        quizHintUsed: false,
        quizHintOpen: false,
        missed: [],          // 퀴즈 오답/스킵 → 요약 리뷰
        reviewingStage: false,
        navReturn: null,
        chat: [],
        chatBusy: false,
        chatSubmitting: false,
        chatRequestSeq: 0,
        chatActiveRequestId: 0,
        chatAbort: null,
        chatActiveMessage: null,
        chatStoppedByUser: false,
        chatAutoStick: true,
        chatInternalScroll: false
    };

    function cacheEls() {
        ui.screen = $('learn-screen');
        ui.picker = $('learn-picker');
        ui.pickerProgress = $('learn-picker-progress');
        ui.pickerHome = $('learn-picker-home');
        ui.continueBtn = $('learn-continue-btn');
        ui.trackList = $('learn-track-list');

        ui.card = $('learn-card');
        ui.lessonTitle = $('learn-lesson-title');
        ui.progress = $('learn-progress');
        ui.quitBtn = $('learn-quit');
        ui.prevStepBtn = $('learn-prev-step');
        ui.nextStepBtn = $('learn-next-step');
        ui.introWrap = $('learn-intro-wrap');
        ui.intro = $('learn-intro');
        ui.beginBtn = $('learn-begin-btn');
        ui.workWrap = $('learn-work-wrap');
        ui.desc = $('learn-desc');
        ui.target = $('learn-target');
        ui.input = $('learn-input');
        ui.output = $('learn-output');
        ui.feedback = $('learn-feedback');
        ui.peekBtn = $('learn-peek');
        ui.hintBtn = $('learn-hint');
        ui.skipBtn = $('learn-skip');
        ui.nextBtn = $('learn-next');
        ui.chatPanel = $('learn-chat-panel');
        ui.chatTitle = $('learn-chat-title');
        ui.chatEngine = $('learn-chat-engine');
        ui.chatEngineShell = $('learn-chat-engine-shell');
        ui.chatEngineToggle = $('learn-chat-engine-toggle');
        ui.chatEngineLabel = $('learn-chat-engine-label');
        ui.chatEngineMenu = $('learn-chat-engine-menu');
        ui.chatRoute = $('learn-chat-route');
        ui.chatStatus = $('learn-chat-status');
        ui.chatContext = $('learn-chat-context');
        ui.chatLog = $('learn-chat-log');
        ui.chatBottom = $('learn-chat-bottom');
        ui.chatForm = $('learn-chat-form');
        ui.chatInput = $('learn-chat-input');
        ui.chatSend = $('learn-chat-send');
        ui.chatClear = $('learn-chat-clear');

        ui.summary = $('learn-summary');
        ui.summaryTitle = $('learn-summary-title');
        ui.summaryStats = $('learn-summary-stats');
        ui.summaryReview = $('learn-summary-review');
        ui.retryQuizBtn = $('learn-retry-quiz');
        ui.nextLessonBtn = $('learn-next-lesson');
        ui.listBtn = $('learn-list-btn');
        ui.homeBtn = $('learn-home');
    }

    function ensureEls() {
        const required = [
            'screen', 'picker', 'pickerProgress', 'pickerHome', 'continueBtn', 'trackList',
            'card', 'lessonTitle', 'progress', 'quitBtn', 'prevStepBtn', 'nextStepBtn', 'introWrap', 'intro', 'beginBtn',
            'workWrap', 'desc', 'target', 'input', 'output', 'feedback', 'peekBtn',
            'hintBtn', 'skipBtn', 'nextBtn', 'chatPanel', 'chatTitle', 'chatEngine', 'chatEngineShell',
            'chatEngineToggle', 'chatEngineLabel', 'chatEngineMenu', 'chatStatus', 'chatContext',
            'chatLog', 'chatBottom', 'chatForm', 'chatInput', 'chatSend', 'chatClear',
            'summary', 'summaryTitle', 'summaryStats',
            'summaryReview', 'retryQuizBtn', 'nextLessonBtn', 'listBtn', 'homeBtn'
        ];
        const missing = required.filter(key => !ui[key]);
        if (missing.length > 0) {
            console.error('LearnMode DOM is incomplete:', missing.join(', '));
            return false;
        }
        return true;
    }

    // ---------- 이벤트 ----------

    let eventsBound = false;
    function bindEvents() {
        if (eventsBound) return;
        if (!ensureEls()) return;
        eventsBound = true;

        ui.input.addEventListener('input', () => {
            if (session.phase === 'step' && !session.answered) {
                renderTarget();
            }
        });

        ui.input.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            e.stopPropagation(); // 전역 Enter-to-start 차단
            if (session.answered) {
                advance();
            } else if (session.phase === 'step') {
                checkStep();
            } else if (session.phase === 'quiz' && ui.input.value.trim()) {
                checkQuiz();
            }
        });

        ui.chatForm.addEventListener('submit', sendChat);
        ui.chatEngine.addEventListener('change', () => {
            chatEngineOverride = normalizeChatEngineValue(ui.chatEngine.value);
            syncChatEngineUi();
            ui.chatStatus.textContent = chatEngineStatus('READY');
        });
        ui.chatEngineToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleChatEngineMenu();
        });
        ui.chatEngineMenu.addEventListener('click', (e) => {
            const option = e.target.closest('[data-engine]');
            if (!option) return;
            setChatEngine(option.dataset.engine);
        });
        document.addEventListener('click', (e) => {
            if (!ui.chatEngineShell || ui.chatEngineShell.contains(e.target)) return;
            closeChatEngineMenu();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeChatEngineMenu();
        });
        window.addEventListener('codedrop:llm-status', e => updateChatRouteStatus(e.detail));
        ui.chatInput.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitChatForm();
            }
        });
        ui.chatClear.addEventListener('click', () => resetChat(true));
        ui.chatLog.addEventListener('scroll', handleChatScroll);
        ui.chatLog.addEventListener('click', handleChatLogClick);
        ui.chatBottom.addEventListener('click', () => scrollChatToBottom(true));

        ui.pickerHome.addEventListener('click', quit);
        ui.continueBtn.addEventListener('click', () => {
            const next = resumeLesson();
            if (next) startLesson(next.lesson.id);
        });
        ui.quitBtn.addEventListener('click', showPicker);
        ui.prevStepBtn.addEventListener('click', goPrevStage);
        ui.nextStepBtn.addEventListener('click', goNextStage);
        ui.beginBtn.addEventListener('click', beginSteps);
        ui.peekBtn.addEventListener('click', peekAnswer);
        ui.hintBtn.addEventListener('click', showLearnHint);
        ui.skipBtn.addEventListener('click', skipQuiz);
        ui.nextBtn.addEventListener('click', advance);
        ui.retryQuizBtn.addEventListener('click', retryQuiz);
        ui.nextLessonBtn.addEventListener('click', () => {
            const next = nextLesson();
            if (next) startLesson(next.lesson.id);
            else showPicker();
        });
        ui.listBtn.addEventListener('click', showPicker);
        ui.homeBtn.addEventListener('click', quit);
    }

    // ---------- LLM 질문 패널 ----------

    const CHAT_HISTORY_LIMIT = 16;
    let chatEngineOverride = null;
    const CHAT_ENGINE_LABELS = {
        kugnus: 'KUGNUS SERVER',
        gemini: 'GEMINI 2.5 FLASH',
        openai: 'GPT 5.4 MINI'
    };

    function normalizeChatEngineValue(value) {
        return value === 'openai' || value === 'gemini' || value === 'kugnus' ? value : 'kugnus';
    }

    function preferredChatEngine() {
        return normalizeChatEngineValue(chatEngineOverride);
    }

    function chatEngineLabel() {
        return CHAT_ENGINE_LABELS[normalizeChatEngineValue(ui.chatEngine && ui.chatEngine.value)] || CHAT_ENGINE_LABELS.kugnus;
    }

    function chatTitleLabel() {
        return chatEngineLabel();
    }

    function routeDisplayLabel(route) {
        const value = String(route || '').toLowerCase();
        if (value === 'direct') return 'LOCAL DIRECT';
        return value ? value.toUpperCase() : '';
    }

    function chatRouteLabel(meta = null) {
        if (!ui.chatEngine || ui.chatEngine.value !== 'kugnus') return '';
        const route = meta && typeof meta.route === 'string' && meta.route
            ? meta.route
            : (window.CodeDropLlmStatus && typeof window.CodeDropLlmStatus.snapshot === 'function'
                ? window.CodeDropLlmStatus.snapshot().route
                : '');
        return route ? ` ${routeDisplayLabel(route)}` : '';
    }

    function chatEngineStatus(status, meta = null) {
        return `${chatEngineLabel()}${chatRouteLabel(meta)} ${status}`;
    }

    function updateChatRouteStatus(meta = null) {
        if (!ui.chatRoute) return;
        ui.chatRoute.classList.remove('warn', 'danger');
        const engine = normalizeChatEngineValue(ui.chatEngine && ui.chatEngine.value);
        if (engine === 'openai') {
            ui.chatRoute.textContent = 'FALLBACK ROUTE: GPT 5.4 MINI';
            ui.chatRoute.classList.add('warn');
            return;
        }
        if (engine === 'gemini') {
            ui.chatRoute.textContent = 'GOOGLE ROUTE: GEMINI API';
            return;
        }

        const snapshot = window.CodeDropLlmStatus && typeof window.CodeDropLlmStatus.snapshot === 'function'
            ? window.CodeDropLlmStatus.snapshot()
            : {};
        const status = meta || snapshot;
        if (status.checking) {
            ui.chatRoute.textContent = 'KUGNUS ROUTE: CHECKING';
            ui.chatRoute.classList.add('warn');
            return;
        }
        if (status.ok === false) {
            ui.chatRoute.textContent = `KUGNUS ROUTE: OFFLINE${status.reason ? ` · ${status.reason}` : ''}`;
            ui.chatRoute.classList.add('danger');
            return;
        }

        const route = routeDisplayLabel(status.route) || 'UNKNOWN';
        const provider = status.provider ? ` · ${String(status.provider).toUpperCase()}` : '';
        ui.chatRoute.textContent = `KUGNUS ROUTE: ${route}${provider}`;
        ui.chatRoute.classList.toggle('warn', route !== 'GATEWAY');
    }

    function syncChatEngineUi() {
        if (!ui.chatEngine) return;
        const engine = normalizeChatEngineValue(ui.chatEngine.value);
        ui.chatEngine.value = engine;
        if (ui.chatTitle) ui.chatTitle.textContent = `ASK TO ${chatTitleLabel()}`;
        if (ui.chatEngineLabel) ui.chatEngineLabel.textContent = chatEngineLabel();
        updateChatRouteStatus();
        if (ui.chatEngineMenu) {
            ui.chatEngineMenu.querySelectorAll('[data-engine]').forEach(option => {
                const selected = option.dataset.engine === engine;
                option.setAttribute('aria-selected', selected ? 'true' : 'false');
                option.toggleAttribute('disabled', false);
            });
        }
    }

    function openChatEngineMenu() {
        if (!ui.chatEngineShell || !ui.chatEngineMenu || !ui.chatEngineToggle) return;
        ui.chatEngineShell.classList.add('open');
        ui.chatEngineMenu.classList.remove('hidden');
        ui.chatEngineToggle.setAttribute('aria-expanded', 'true');
    }

    function closeChatEngineMenu() {
        if (!ui.chatEngineShell || !ui.chatEngineMenu || !ui.chatEngineToggle) return;
        ui.chatEngineShell.classList.remove('open');
        ui.chatEngineMenu.classList.add('hidden');
        ui.chatEngineToggle.setAttribute('aria-expanded', 'false');
    }

    function toggleChatEngineMenu() {
        if (!ui.chatEngineMenu) return;
        if (ui.chatEngineMenu.classList.contains('hidden')) openChatEngineMenu();
        else closeChatEngineMenu();
    }

    function setChatEngine(engine) {
        if (engine !== 'openai' && engine !== 'kugnus' && engine !== 'gemini') return;
        ui.chatEngine.value = engine;
        ui.chatEngine.dispatchEvent(new Event('change'));
        closeChatEngineMenu();
        ui.chatEngineToggle.focus();
    }

    function submitChatForm() {
        if (typeof ui.chatForm.requestSubmit === 'function') {
            ui.chatForm.requestSubmit();
            return;
        }
        ui.chatForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }

    async function offerKugnusFallbackIfNeeded() {
        if (!ui.chatEngine || ui.chatEngine.value !== 'kugnus') return false;
        const helper = window.CodeDropLlmStatus;
        if (!helper || typeof helper.maybeSwitchFromOfflineKugnus !== 'function') return false;

        const shouldSwitch = await helper.maybeSwitchFromOfflineKugnus('learn');
        if (!shouldSwitch) return false;

        ui.chatEngine.value = 'openai';
        chatEngineOverride = 'openai';
        syncChatEngineUi();
        ui.chatStatus.textContent = chatEngineStatus('READY');
        return true;
    }

    function setChatBusy(busy) {
        session.chatBusy = busy;
        ui.chatInput.disabled = busy;
        ui.chatSend.disabled = false;
        ui.chatSend.textContent = busy ? 'STOP' : 'ASK';
        ui.chatSend.classList.toggle('stop', busy);
        ui.chatStatus.textContent = busy ? chatEngineStatus('THINKING') : chatEngineStatus('READY');
    }

    function chatStorageKey() {
        const lessonId = session.lesson ? session.lesson.id : 'general';
        return `codedrop_learn_chat_history_${lessonId}`;
    }

    function normalizeChatEntries(value) {
        if (!Array.isArray(value)) return [];
        const entries = value
            .map(item => ({
                role: item && item.role === 'assistant' ? 'assistant' : 'user',
                content: typeof item?.content === 'string' ? item.content.slice(0, 5000) : '',
                question: typeof item?.question === 'string' ? item.question.slice(0, 1200) : ''
            }))
            .filter(item => item.content);
        const cleaned = [];
        entries.forEach(item => {
            if (isObsoleteKugnusRouteEntry(item)) {
                const previous = cleaned[cleaned.length - 1];
                if (previous && previous.role === 'user'
                    && (!item.question || previous.content.trim() === item.question.trim())) {
                    cleaned.pop();
                }
                return;
            }
            const previous = cleaned[cleaned.length - 1];
            if (item.role === 'user' && previous && previous.role === 'user') {
                cleaned[cleaned.length - 1] = item;
                return;
            }
            cleaned.push(item);
        });
        return cleaned
            .slice(-CHAT_HISTORY_LIMIT);
    }

    function isObsoleteKugnusRouteEntry(item) {
        if (!item || item.role !== 'assistant') return false;
        const content = String(item.content || '');
        return /\bLOCAL DIRECT\b/i.test(content)
            || /\bOPENAI GATEWAY\b/i.test(content)
            || /\bProvider:\s*OLLAMA\b/i.test(content)
            || /\b경로:\s*LOCAL DIRECT\b/i.test(content);
    }

    function loadChatHistory() {
        try {
            const raw = JSON.parse(localStorage.getItem(chatStorageKey()));
            session.chat = normalizeChatEntries(raw);
            if (Array.isArray(raw) && raw.length !== session.chat.length) persistChatHistory();
        } catch (e) {
            session.chat = [];
        }
    }

    function persistChatHistory() {
        const entries = normalizeChatEntries(session.chat);
        session.chat = entries;
        try {
            if (entries.length === 0) localStorage.removeItem(chatStorageKey());
            else localStorage.setItem(chatStorageKey(), JSON.stringify(entries));
        } catch (e) {
            console.warn('Learn chat history will stay in memory for this session:', e);
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
        const body = msg.querySelector('.learn-chat-body');
        msg._rawText = text;
        if (msg.dataset.role === 'assistant') {
            renderMarkdownInto(body, text, streaming);
        } else {
            body.textContent = text;
        }
        maybeStickChat();
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

    function appendChat(role, text, options = {}) {
        const msg = document.createElement('div');
        msg.className = 'learn-chat-msg ' + role;
        msg.dataset.role = role;
        msg._rawText = text || '';
        msg._question = options.question || '';

        const body = document.createElement('div');
        body.className = 'learn-chat-body';
        msg.appendChild(body);

        if (role === 'assistant') {
            if (options.streaming) msg.classList.add('streaming');
            msg.appendChild(createAssistantActions(options.question || ''));
            setChatMessageContent(msg, text || '', Boolean(options.streaming));
        } else {
            setChatMessageContent(msg, text || '', false);
        }

        ui.chatLog.appendChild(msg);
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

    function isChatAtBottom() {
        if (!ui.chatLog) return true;
        return ui.chatLog.scrollHeight - ui.chatLog.scrollTop - ui.chatLog.clientHeight < 28;
    }

    function updateBottomButton() {
        if (!ui.chatBottom) return;
        const show = !session.chatAutoStick && !isChatAtBottom();
        ui.chatBottom.classList.toggle('hidden', !show);
    }

    function handleChatScroll() {
        if (session.chatInternalScroll) return;
        session.chatAutoStick = isChatAtBottom();
        updateBottomButton();
    }

    function scrollChatToBottom(force = false) {
        if (!ui.chatLog || (!force && !session.chatAutoStick)) {
            updateBottomButton();
            return;
        }
        session.chatAutoStick = true;
        session.chatInternalScroll = true;
        ui.chatLog.scrollTop = ui.chatLog.scrollHeight;
        requestAnimationFrame(() => {
            ui.chatLog.scrollTop = ui.chatLog.scrollHeight;
            session.chatInternalScroll = false;
            updateBottomButton();
        });
    }

    function maybeStickChat(force = false) {
        if (force) session.chatAutoStick = true;
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
                // 권한/브라우저 정책으로 지연되면 즉시 입력 필드 fallback으로 내려간다.
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
        if (!action || session.chatBusy) return;
        const msg = action.closest('.learn-chat-msg');
        const question = action.dataset.question || msg?._question || '';

        if (action.dataset.action === 'copy') {
            copyText(msg?._rawText || '').then(() => flashButton(action, 'COPIED')).catch(() => flashButton(action, 'ERR'));
            return;
        }

        if ((action.dataset.action === 'retry' || action.dataset.action === 'regenerate') && question) {
            sendChatText(question, { fromAction: action.dataset.action });
        }
    }

    function resetChat(shouldFocus = false) {
        if (session.chatBusy) stopChat();
        session.chat = [];
        persistChatHistory();
        renderChatHistory();
        ui.chatInput.value = '';
        ui.chatStatus.textContent = chatEngineStatus('READY');
        if (shouldFocus) ui.chatInput.focus();
    }

    function renderChatHistory() {
        session.chatAutoStick = true;
        ui.chatStatus.textContent = chatEngineStatus('READY');
        ui.chatLog.replaceChildren();
        appendChat('system', `${chatEngineLabel()}가 현재 레슨 화면을 같이 보고 답합니다. 막히는 명령, 플래그, 왜 쓰는지 물어보세요.`);
        session.chat.forEach(entry => appendChat(entry.role, entry.content, { question: entry.question || '' }));
        scrollChatToBottom(true);
    }

    function updateChatContext() {
        if (!ui.chatContext || !session.lesson) return;
        const phaseLabel = session.phase === 'quiz' ? '퀴즈' : (session.phase === 'step' ? '스텝' : '개념');
        ui.chatContext.textContent = `${session.lesson.title} · ${phaseLabel} · ${ui.progress.textContent || '-'}`;
    }

    function updateLessonNav() {
        if (!ui.prevStepBtn || !ui.nextStepBtn || !session.lesson) return;

        let canPrev = false;
        let canNext = false;
        let nextLabel = '다음 →';

        if (session.phase === 'intro') {
            canPrev = false;
            canNext = true;
            nextLabel = '학습 시작 →';
        } else if (session.phase === 'step') {
            canPrev = session.stepIdx > 0 || Boolean(session.lesson.intro);
            canNext = session.answered;
            const lastStep = session.stepIdx + 1 >= session.lesson.steps.length;
            nextLabel = lastStep
                ? (session.quizList.length > 0 ? '미니퀴즈 →' : '결과 보기')
                : '다음 스텝 →';
        } else if (session.phase === 'quiz') {
            canPrev = session.quizIdx > 0 || session.lesson.steps.length > 0 || Boolean(session.lesson.intro);
            canNext = session.answered;
            nextLabel = session.quizIdx + 1 >= session.quizList.length ? '결과 보기' : '다음 문제 →';
        } else {
            canPrev = false;
            canNext = false;
        }

        if (session.reviewingStage && session.navReturn && canNext) {
            nextLabel = '보던 단계로 →';
        }

        ui.prevStepBtn.disabled = !canPrev;
        ui.nextStepBtn.disabled = !canNext;
        ui.nextStepBtn.textContent = nextLabel;
    }

    function currentChatContext() {
        const ctx = {
            lessonTitle: session.lesson ? session.lesson.title : '',
            trackTitle: session.track ? session.track.title : '',
            phase: session.phase,
            progress: ui.progress ? ui.progress.textContent : '',
            prompt: '',
            command: '',
            output: '',
            explanation: '',
            hint: ''
        };

        if (!session.lesson) return ctx;

        if (session.phase === 'intro') {
            ctx.prompt = session.lesson.intro;
            return ctx;
        }

        if (session.phase === 'step') {
            const step = currentStep();
            if (!step) return ctx;
            ctx.prompt = step.desc;
            ctx.command = step.cmd;
            ctx.output = step.output;
            ctx.explanation = step.explain;
            ctx.hint = step.hint || '';
            return ctx;
        }

        if (session.phase === 'quiz') {
            const q = currentQuiz();
            if (!q) return ctx;
            ctx.prompt = q.scenario;
            ctx.command = q.canonical;
            ctx.explanation = q.explain;
            ctx.hint = q.hint || '';
        }

        return ctx;
    }

    function stopChat() {
        session.chatStoppedByUser = true;
        if (session.chatAbort) session.chatAbort.abort();
        ui.chatStatus.textContent = chatEngineStatus('STOPPING');
    }

    async function readChatStream(res, onEvent) {
        if (!res.body) throw new Error('Streaming response is unavailable');
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        function consume(line) {
            const trimmed = line.trim();
            if (!trimmed) return;
            const evt = JSON.parse(trimmed);
            onEvent(evt);
        }

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let newlineIndex;
            while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, newlineIndex);
                buffer = buffer.slice(newlineIndex + 1);
                consume(line);
            }
        }

        buffer += decoder.decode();
        if (buffer.trim()) consume(buffer);
    }

    async function sendChat(e) {
        e.preventDefault();
        if (session.chatBusy) {
            stopChat();
            return;
        }
        if (session.chatSubmitting) return;

        const message = ui.chatInput.value.trim();
        if (!message) return;
        await sendChatText(message);
    }

    async function sendChatText(message) {
        if (session.chatBusy || session.chatSubmitting) return;
        session.chatSubmitting = true;
        const requestId = ++session.chatRequestSeq;
        session.chatActiveRequestId = requestId;
        let pending = null;
        let finalStatus = '';

        try {
            await offerKugnusFallbackIfNeeded();
            if (requestId !== session.chatActiveRequestId) return;

            const history = session.chat
                .filter(entry => entry.role === 'user' || entry.role === 'assistant')
                .slice(-8)
                .map(entry => ({ role: entry.role, content: entry.content }));

            appendChat('user', message);
            ui.chatInput.value = '';

            pending = appendChat('assistant', '', { question: message, streaming: true });
            session.chatActiveMessage = pending;
            session.chatStoppedByUser = false;
            session.chatAbort = new AbortController();
            setChatBusy(true);
            let answer = '';
            let gotDone = false;

            const res = await fetch(`${LEARN_API_BASE}/api/learn-chat/stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: session.chatAbort.signal,
                body: JSON.stringify({
                    message,
                    engine: ui.chatEngine.value,
                    history,
                    context: currentChatContext()
                })
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'LLM request failed');
            }

            await readChatStream(res, evt => {
                if (requestId !== session.chatActiveRequestId) return;
                if (evt.event === 'meta') {
                    ui.chatStatus.textContent = chatEngineStatus('STREAMING', evt);
                    updateChatRouteStatus(evt);
                    return;
                }
                if (evt.event === 'delta') {
                    answer += evt.text || '';
                    setChatMessageContent(pending, answer, true);
                    return;
                }
                if (evt.event === 'error') {
                    throw new Error(evt.error || 'LLM request failed');
                }
                if (evt.event === 'done') {
                    gotDone = true;
                    if (evt.answer) answer = evt.answer;
                }
            });

            if (requestId !== session.chatActiveRequestId) return;
            if (!gotDone && !answer.trim()) throw new Error('Empty LLM response');
            finishAssistantMessage(pending, answer.trim(), message);
            session.chat.push({ role: 'user', content: message });
            session.chat.push({ role: 'assistant', content: answer.trim(), question: message });
            session.chat = session.chat.slice(-CHAT_HISTORY_LIMIT);
            persistChatHistory();
        } catch (err) {
            if (err.name === 'AbortError' && session.chatStoppedByUser) {
                if (pending) stopAssistantMessage(pending);
                finalStatus = chatEngineStatus('STOPPED');
            } else {
                if (pending) failAssistantMessage(pending, err.message, message);
                finalStatus = chatEngineStatus('OFFLINE');
            }
        } finally {
            if (session.chatActiveRequestId === requestId) {
                if (session.chatActiveMessage === pending) session.chatActiveMessage = null;
                session.chatAbort = null;
                session.chatStoppedByUser = false;
                session.chatSubmitting = false;
                setChatBusy(false);
                if (finalStatus) ui.chatStatus.textContent = finalStatus;
            }
            ui.chatInput.focus();
        }
    }

    function showChatPanel() {
        ui.chatEngine.value = preferredChatEngine();
        syncChatEngineUi();
        ui.screen.classList.add('learn-session-active');
        ui.chatPanel.classList.remove('hidden');
        updateChatContext();
        loadChatHistory();
        renderChatHistory();
    }

    function hideChatPanel() {
        if (session.chatBusy) stopChat();
        closeChatEngineMenu();
        ui.screen.classList.remove('learn-session-active');
        if (ui.chatPanel) ui.chatPanel.classList.add('hidden');
    }

    // ---------- 픽커 ----------

    function openPicker() {
        cacheEls();
        if (!ensureEls()) return;
        bindEvents();
        renderPicker();

        ui.card.classList.add('hidden');
        ui.summary.classList.add('hidden');
        hideChatPanel();
        ui.picker.classList.remove('hidden');
        ui.screen.classList.remove('hidden');
    }

    function renderPicker() {
        const p = progress();
        const resume = resumeLesson();
        ui.pickerProgress.textContent = `${p.done} / ${p.total} 레슨 완료`;
        ui.continueBtn.textContent = resume
            ? `이어서 학습: ${resume.lesson.title}`
            : '커리큘럼 완주';
        ui.continueBtn.disabled = !resume;

        ui.trackList.innerHTML = '';
        tracks().forEach(track => {
            const head = document.createElement('div');
            head.className = 'learn-track-head';
            head.textContent = track.title;
            const sub = document.createElement('span');
            sub.className = 'learn-track-sub';
            sub.textContent = track.subtitle;
            head.appendChild(sub);
            ui.trackList.appendChild(head);

            track.lessons.forEach(lesson => {
                const row = document.createElement('div');
                row.className = 'learn-lesson-row';
                const done = LearnProgress.isDone(lesson.id);
                const unlocked = isUnlocked(lesson.id);
                if (done) row.classList.add('done');
                else if (!unlocked) row.classList.add('locked');

                const state = document.createElement('span');
                state.className = 'learn-lesson-state';
                state.textContent = done ? 'OK' : (unlocked ? '>' : '--');

                const title = document.createElement('span');
                title.textContent = lesson.title;

                const quiz = document.createElement('span');
                quiz.className = 'learn-lesson-quiz';
                const rec = LearnProgress.load().lessons[lesson.id];
                quiz.textContent = rec && rec.done
                    ? `퀴즈 ${rec.quizBest}/${rec.quizTotal}`
                    : `${lesson.steps.length}스텝 · 퀴즈 ${lesson.quizCount}`;

                row.append(state, title, quiz);
                if (unlocked) {
                    row.addEventListener('click', () => startLesson(lesson.id));
                }
                ui.trackList.appendChild(row);
            });
        });
    }

    // ---------- 레슨 흐름 ----------

    function startLesson(lessonId) {
        const found = findLesson(lessonId);
        if (!found || !isUnlocked(lessonId)) return;

        cacheEls();
        if (!ensureEls()) return;
        bindEvents();

        session.lesson = found.lesson;
        session.track = found.track;
        session.phase = 'intro';
        session.stepIdx = 0;
        session.answered = false;
        session.peeked = false;
        session.peekCount = 0;
        session.quizIdx = 0;
        session.quizCorrect = 0;
        session.missed = [];
        session.quizList = buildQuizList(found.lesson);
        session.reviewingStage = false;
        session.navReturn = null;

        LearnProgress.markVisit(lessonId);

        ui.picker.classList.add('hidden');
        ui.summary.classList.add('hidden');
        ui.card.classList.remove('hidden');
        ui.screen.classList.remove('hidden');

        ui.lessonTitle.textContent = found.lesson.title;
        ui.progress.textContent = '개념';
        ui.intro.textContent = found.lesson.intro;
        ui.introWrap.classList.remove('hidden');
        ui.workWrap.classList.add('hidden');
        updateLessonNav();
        showChatPanel();
    }

    function buildQuizList(lesson) {
        if (typeof SCENARIO_PACKS === 'undefined' || typeof StudyCore === 'undefined') return [];
        const pack = SCENARIO_PACKS[lesson.quizFrom];
        if (!pack) return [];
        if (lesson.quizIds) {
            return lesson.quizIds
                .map(qid => pack.questions.find(q => q.id === qid))
                .filter(Boolean);
        }
        return StudyCore.shuffle(pack.questions).slice(0, lesson.quizCount);
    }

    function beginSteps() {
        session.phase = 'step';
        session.stepIdx = 0;
        ui.introWrap.classList.add('hidden');
        ui.workWrap.classList.remove('hidden');
        renderStep();
    }

    function showIntroPhase() {
        session.phase = 'intro';
        session.answered = false;
        session.peeked = false;
        session.stepHintOpen = false;
        session.quizHintOpen = false;
        session.reviewingStage = false;
        ui.progress.textContent = '개념';
        ui.intro.textContent = session.lesson.intro;
        ui.introWrap.classList.remove('hidden');
        ui.workWrap.classList.add('hidden');
        updateChatContext();
        updateLessonNav();
        ui.beginBtn.focus();
    }

    function currentStep() {
        return session.lesson.steps[session.stepIdx];
    }

    // 스캐폴드 결정: 데이터 명시 > 기본 규칙(앞 60% full)
    function stepScaffold(step, idx) {
        if (step.scaffold) return step.scaffold;
        const fullCount = Math.ceil(session.lesson.steps.length * 0.6);
        return idx < fullCount ? 'full' : 'hint';
    }

    function renderStep(options = {}) {
        const review = Boolean(options.review);
        const step = currentStep();
        session.reviewingStage = review;
        session.answered = review;
        session.peeked = review;
        session.stepHintOpen = false;

        ui.progress.textContent = `스텝 ${session.stepIdx + 1} / ${session.lesson.steps.length}`;
        ui.desc.textContent = step.desc;
        updateChatContext();

        const scaffold = stepScaffold(step, session.stepIdx);
        ui.target.classList.remove('hidden');

        ui.input.value = review ? step.cmd : '';
        ui.input.disabled = review;
        ui.input.classList.remove('correct', 'wrong');
        ui.input.classList.toggle('correct', review);
        ui.input.placeholder = '명령어를 그대로 입력 후 Enter';
        if (!review) ui.input.focus();

        ui.output.classList.add('hidden');
        ui.feedback.className = 'scenario-feedback hidden';
        ui.feedback.innerHTML = '';

        const hasStepHint = scaffold === 'hint' && Boolean(step.hint);
        ui.peekBtn.classList.toggle('hidden', review || scaffold !== 'hint');
        ui.peekBtn.disabled = false;
        ui.peekBtn.textContent = '정답 보기';
        ui.hintBtn.classList.toggle('hidden', review || !hasStepHint);
        ui.hintBtn.disabled = false;
        ui.hintBtn.textContent = '힌트';
        ui.skipBtn.classList.add('hidden');
        ui.nextBtn.classList.add('hidden');

        renderTarget();

        if (review) {
            ui.output.textContent = `$ ${step.cmd}\n${step.output}`;
            ui.output.classList.remove('hidden');

            ui.feedback.className = 'scenario-feedback correct';
            ui.feedback.innerHTML = '';
            const title = document.createElement('div');
            title.className = 'fb-title';
            title.textContent = '복습 중';
            const explain = document.createElement('div');
            explain.className = 'fb-explain';
            explain.textContent = step.explain;
            ui.feedback.append(title, explain);

            ui.nextBtn.classList.remove('hidden');
            const lastStep = session.stepIdx + 1 >= session.lesson.steps.length;
            ui.nextBtn.textContent = lastStep
                ? (session.quizList.length > 0 ? '미니퀴즈 →' : '결과 보기')
                : '다음 →';
        }

        updateLessonNav();
    }

    // 따라치기 per-char 컬러링. masked=true면 미입력 구간을 · 로 마스킹
    function renderTarget() {
        const step = currentStep();
        const cmd = step.cmd;
        const input = ui.input.value;
        const masked = stepScaffold(step, session.stepIdx) === 'hint' && !session.peeked;

        ui.target.innerHTML = '';
        for (let i = 0; i < cmd.length; i++) {
            const span = document.createElement('span');
            if (i < input.length) {
                span.className = input[i] === cmd[i] ? 'ok' : 'bad';
                span.textContent = cmd[i] === ' ' ? ' ' : cmd[i];
                if (span.className === 'bad' && input[i] !== ' ') {
                    // 오타 위치에 실제 입력 문자를 보여줘 무엇이 틀렸는지 인지시킴
                    span.textContent = input[i];
                }
            } else {
                span.className = 'rest';
                if (cmd[i] === ' ') {
                    span.textContent = ' ';
                } else {
                    span.textContent = masked ? '·' : cmd[i];
                }
            }
            ui.target.appendChild(span);
        }
        // 초과 입력 표시
        for (let i = cmd.length; i < input.length; i++) {
            const span = document.createElement('span');
            span.className = 'bad';
            span.textContent = input[i] === ' ' ? ' ' : input[i];
            ui.target.appendChild(span);
        }
    }

    function peekAnswer() {
        if (session.phase !== 'step' || session.answered) return;
        session.peeked = !session.peeked;
        if (session.peeked) session.peekCount++;
        ui.peekBtn.textContent = session.peeked ? '정답 닫기' : '정답 보기';
        renderTarget();
        ui.input.focus();
    }

    function showLearnHint() {
        if (session.phase === 'step') {
            showStepHint();
            return;
        }
        showQuizHint();
    }

    function showStepHint() {
        if (session.phase !== 'step' || session.answered) return;
        const step = currentStep();
        const scaffold = stepScaffold(step, session.stepIdx);
        if (scaffold !== 'hint' || !step.hint) return;

        if (session.stepHintOpen) {
            session.stepHintOpen = false;
            ui.hintBtn.textContent = '힌트';
            ui.feedback.className = 'scenario-feedback hidden';
            ui.feedback.innerHTML = '';
            ui.input.focus();
            return;
        }

        session.stepHintOpen = true;
        ui.hintBtn.textContent = '힌트 닫기';
        ui.feedback.className = 'scenario-feedback hint-msg';
        ui.feedback.innerHTML = '';
        const hint = document.createElement('div');
        hint.textContent = `힌트: ${step.hint}`;
        ui.feedback.appendChild(hint);
        updateLessonNav();
        ui.input.focus();
    }

    function checkStep() {
        const step = currentStep();
        const match = StudyCore.normalizeCmd(ui.input.value) === StudyCore.normalizeCmd(step.cmd);

        if (!match) {
            if (typeof sfx !== 'undefined') sfx.playFail();
            ui.input.classList.remove('wrong');
            void ui.input.offsetWidth;
            ui.input.classList.add('wrong');
            renderTarget();
            return;
        }

        session.answered = true;
        if (typeof sfx !== 'undefined') sfx.playSuccess();

        ui.input.disabled = true;
        ui.input.classList.remove('wrong');
        ui.input.classList.add('correct');

        // 시뮬레이션 터미널 출력 + 해설 (깨달음 구간)
        ui.output.textContent = `$ ${step.cmd}\n${step.output}`;
        ui.output.classList.remove('hidden');

        ui.feedback.className = 'scenario-feedback correct';
        ui.feedback.innerHTML = '';
        const explain = document.createElement('div');
        explain.className = 'fb-explain';
        explain.textContent = step.explain;
        ui.feedback.appendChild(explain);

        ui.peekBtn.classList.add('hidden');
        ui.hintBtn.classList.add('hidden');
        ui.nextBtn.classList.remove('hidden');
        const lastStep = session.stepIdx + 1 >= session.lesson.steps.length;
        ui.nextBtn.textContent = lastStep
            ? (session.quizList.length > 0 ? '미니퀴즈 →' : '결과 보기')
            : '다음 →';
        updateLessonNav();
        focusNextAction();
    }

    // ---------- 미니퀴즈 (blind 단계 — 기존 시나리오 문제 재사용) ----------

    function beginQuiz() {
        session.phase = 'quiz';
        session.quizIdx = 0;
        session.quizCorrect = 0;
        session.missed = [];
        ui.introWrap.classList.add('hidden');
        ui.workWrap.classList.remove('hidden');
        renderQuiz();
    }

    function currentQuiz() {
        return session.quizList[session.quizIdx];
    }

    function renderQuiz(options = {}) {
        const review = Boolean(options.review);
        const q = currentQuiz();
        session.reviewingStage = review;
        session.answered = review;
        session.quizWrongAttempts = 0;
        session.quizHintUsed = review;
        session.quizHintOpen = false;

        ui.progress.textContent = `퀴즈 ${session.quizIdx + 1} / ${session.quizList.length}`;
        ui.desc.textContent = q.scenario;
        updateChatContext();
        ui.target.classList.add('hidden'); // blind — 명령이 보이지 않음

        ui.input.value = review ? q.canonical : '';
        ui.input.disabled = review;
        ui.input.classList.remove('correct', 'wrong');
        ui.input.classList.toggle('correct', review);
        ui.input.placeholder = '배운 명령을 기억해 입력 후 Enter';
        if (!review) ui.input.focus();

        ui.output.classList.add('hidden');
        ui.feedback.className = 'scenario-feedback hidden';
        ui.feedback.innerHTML = '';

        ui.peekBtn.classList.add('hidden');
        ui.hintBtn.classList.toggle('hidden', review);
        ui.hintBtn.disabled = false;
        ui.hintBtn.textContent = '힌트';
        ui.skipBtn.classList.toggle('hidden', review);
        ui.nextBtn.classList.add('hidden');

        if (review) {
            quizFeedback('correct', '복습 중', q);
            showQuizNext();
        }

        updateLessonNav();
    }

    function quizFeedback(kind, title, q) {
        ui.feedback.className = 'scenario-feedback ' + kind;
        ui.feedback.innerHTML = '';
        const titleEl = document.createElement('div');
        titleEl.className = 'fb-title';
        titleEl.textContent = title;
        const cmdEl = document.createElement('div');
        cmdEl.className = 'fb-canonical';
        cmdEl.textContent = q.canonical;
        const explainEl = document.createElement('div');
        explainEl.className = 'fb-explain';
        explainEl.textContent = q.explain;
        ui.feedback.append(titleEl, cmdEl, explainEl);
    }

    function showQuizNext() {
        ui.hintBtn.classList.add('hidden');
        ui.skipBtn.classList.add('hidden');
        ui.nextBtn.classList.remove('hidden');
        ui.nextBtn.textContent = session.quizIdx + 1 >= session.quizList.length ? '결과 보기' : '다음 →';
        updateLessonNav();
        focusNextAction();
    }

    function checkQuiz() {
        const q = currentQuiz();
        if (StudyCore.isCorrect(ui.input.value, q)) {
            session.answered = true;
            session.quizCorrect++;
            const dirty = session.quizWrongAttempts > 0 || session.quizHintUsed;
            StudyStats.record(q.id, dirty ? 'dirty' : 'correct-clean');
            if (dirty) session.missed.push(q);

            if (typeof sfx !== 'undefined') sfx.playSuccess();
            ui.input.disabled = true;
            ui.input.classList.remove('wrong');
            ui.input.classList.add('correct');
            quizFeedback('correct', '정답!', q);
            showQuizNext();
        } else {
            session.quizWrongAttempts++;
            session.quizHintOpen = false;
            ui.hintBtn.textContent = '힌트';
            if (typeof sfx !== 'undefined') sfx.playFail();
            ui.input.classList.remove('wrong');
            void ui.input.offsetWidth;
            ui.input.classList.add('wrong');

            ui.feedback.className = 'scenario-feedback wrong-msg';
            ui.feedback.innerHTML = '';
            const msg = document.createElement('div');
            msg.textContent = `오답입니다. 다시 시도하세요. (오답 ${session.quizWrongAttempts}회)`;
            ui.feedback.appendChild(msg);
            updateLessonNav();
        }
    }

    function showQuizHint() {
        if (session.phase !== 'quiz' || session.answered) return;
        const q = currentQuiz();
        if (!q.hint) return;

        if (session.quizHintOpen) {
            session.quizHintOpen = false;
            ui.hintBtn.textContent = '힌트';
            ui.feedback.className = 'scenario-feedback hidden';
            ui.feedback.innerHTML = '';
            ui.input.focus();
            return;
        }

        session.quizHintUsed = true;
        session.quizHintOpen = true;
        ui.hintBtn.textContent = '힌트 닫기';
        ui.feedback.className = 'scenario-feedback hint-msg';
        ui.feedback.innerHTML = '';
        const hint = document.createElement('div');
        hint.textContent = `힌트: ${q.hint}`;
        ui.feedback.appendChild(hint);
        updateLessonNav();
        ui.input.focus();
    }

    function skipQuiz() {
        if (session.phase !== 'quiz' || session.answered) return;
        const q = currentQuiz();
        session.answered = true;
        session.missed.push(q);
        StudyStats.record(q.id, 'skip');

        ui.input.disabled = true;
        quizFeedback('skipped', '건너뜀', q);
        showQuizNext();
        updateLessonNav();
    }

    // ---------- 진행/요약 ----------

    function goPrevStage() {
        if (!session.lesson || ui.prevStepBtn.disabled) return;

        if (session.phase === 'step') {
            if (session.stepIdx > 0) {
                session.navReturn = {
                    phase: 'step',
                    idx: session.stepIdx,
                    review: session.answered
                };
                session.stepIdx--;
                ui.introWrap.classList.add('hidden');
                ui.workWrap.classList.remove('hidden');
                renderStep({ review: true });
            } else {
                showIntroPhase();
            }
            return;
        }

        if (session.phase === 'quiz') {
            if (session.quizIdx > 0) {
                session.navReturn = {
                    phase: 'quiz',
                    idx: session.quizIdx,
                    review: session.answered
                };
                session.quizIdx--;
                ui.introWrap.classList.add('hidden');
                ui.workWrap.classList.remove('hidden');
                renderQuiz({ review: true });
            } else if (session.lesson.steps.length > 0) {
                session.navReturn = {
                    phase: 'quiz',
                    idx: session.quizIdx,
                    review: session.answered
                };
                session.phase = 'step';
                session.stepIdx = session.lesson.steps.length - 1;
                ui.introWrap.classList.add('hidden');
                ui.workWrap.classList.remove('hidden');
                renderStep({ review: true });
            } else {
                showIntroPhase();
            }
        }
    }

    function returnToNavTarget() {
        if (!session.reviewingStage || !session.navReturn) return false;

        const target = session.navReturn;
        session.navReturn = null;

        if (target.phase === 'step') {
            session.phase = 'step';
            session.stepIdx = Math.max(0, Math.min(target.idx, session.lesson.steps.length - 1));
            ui.introWrap.classList.add('hidden');
            ui.workWrap.classList.remove('hidden');
            renderStep({ review: Boolean(target.review) });
            return true;
        }

        if (target.phase === 'quiz' && session.quizList.length > 0) {
            session.phase = 'quiz';
            session.quizIdx = Math.max(0, Math.min(target.idx, session.quizList.length - 1));
            ui.introWrap.classList.add('hidden');
            ui.workWrap.classList.remove('hidden');
            renderQuiz({ review: Boolean(target.review) });
            return true;
        }

        return false;
    }

    function goNextStage() {
        if (!session.lesson || ui.nextStepBtn.disabled) return;

        if (session.phase === 'intro') {
            beginSteps();
            return;
        }

        if (session.answered) {
            advance();
        }
    }

    function advance() {
        if (!session.answered) return;

        if (returnToNavTarget()) return;

        if (session.phase === 'step') {
            session.stepIdx++;
            if (session.stepIdx < session.lesson.steps.length) {
                renderStep();
            } else if (session.quizList.length > 0) {
                beginQuiz();
            } else {
                endLesson();
            }
        } else if (session.phase === 'quiz') {
            session.quizIdx++;
            if (session.quizIdx < session.quizList.length) {
                renderQuiz();
            } else {
                endLesson();
            }
        }
    }

    // 퀴즈만 재도전 (스텝 통과 상태 유지)
    function retryQuiz() {
        ui.summary.classList.add('hidden');
        ui.card.classList.remove('hidden');
        beginQuiz();
    }

    function endLesson() {
        session.phase = 'summary';
        const quizTotal = session.quizList.length;
        const passLine = Math.ceil(quizTotal / 2);
        const passed = quizTotal === 0 || session.quizCorrect >= passLine;

        if (passed) {
            LearnProgress.complete(session.lesson.id, session.quizCorrect, quizTotal, session.peekCount);
        }

        ui.card.classList.add('hidden');
        ui.summary.classList.remove('hidden');
        hideChatPanel();

        ui.summaryTitle.textContent = passed ? 'LESSON COMPLETE' : 'ALMOST THERE';
        ui.summaryTitle.style.color = passed ? 'var(--success-color)' : 'var(--danger-color)';

        ui.summaryStats.innerHTML = '';
        addStat('스텝', `${session.lesson.steps.length} 완료`);
        addStat('정답 보기', `${session.peekCount}회`);
        addStat('퀴즈', quizTotal === 0 ? '-' : `${session.quizCorrect} / ${quizTotal}`,
            passed ? '--success-color' : '--danger-color');

        ui.summaryReview.innerHTML = '';
        if (!passed) {
            const note = document.createElement('div');
            note.className = 'review-title';
            note.style.color = 'var(--danger-color)';
            note.textContent = `퀴즈 ${passLine}개 이상 맞히면 다음 레슨이 열립니다 — 한 번 더!`;
            ui.summaryReview.appendChild(note);
        }
        if (session.missed.length > 0) {
            const title = document.createElement('div');
            title.className = 'review-title';
            title.textContent = '복습이 필요한 문제';
            ui.summaryReview.appendChild(title);
            session.missed.forEach(q => {
                const item = document.createElement('div');
                item.className = 'review-item';
                const sc = document.createElement('div');
                sc.className = 'review-scenario';
                sc.textContent = q.scenario;
                const ans = document.createElement('div');
                ans.className = 'review-answer';
                ans.textContent = q.canonical;
                item.append(sc, ans);
                ui.summaryReview.appendChild(item);
            });
        } else if (passed) {
            const perfect = document.createElement('div');
            perfect.className = 'review-title';
            perfect.style.color = 'var(--success-color)';
            perfect.textContent = quizTotal === 0 ? '레슨 완주!' : '퀴즈 전부 클린 통과 — 완벽!';
            ui.summaryReview.appendChild(perfect);
        }

        ui.retryQuizBtn.classList.toggle('hidden', passed || quizTotal === 0);
        const next = nextLesson();
        ui.nextLessonBtn.classList.toggle('hidden', !(passed && next));
        if (passed && next) {
            ui.nextLessonBtn.textContent = `다음 레슨: ${next.lesson.title}`;
        }
    }

    function addStat(label, value, colorVar) {
        const item = document.createElement('div');
        item.className = 'stat-item';
        const l = document.createElement('div');
        l.className = 'stat-label';
        l.textContent = label;
        const v = document.createElement('div');
        v.className = 'stat-value';
        v.style.fontSize = '1.4rem';
        if (colorVar) v.style.color = `var(${colorVar})`;
        v.textContent = value;
        item.append(l, v);
        ui.summaryStats.appendChild(item);
    }

    function showPicker() {
        ui.card.classList.add('hidden');
        ui.summary.classList.add('hidden');
        hideChatPanel();
        renderPicker();
        ui.picker.classList.remove('hidden');
    }

    function quit() {
        if (document.activeElement && typeof document.activeElement.blur === 'function') {
            document.activeElement.blur();
        }
        ui.screen.classList.add('hidden');
        hideChatPanel();
        document.getElementById('start-screen').classList.remove('hidden');
        if (typeof fetchLeaderboard === 'function') fetchLeaderboard();
    }

    function resetProgress() {
        LearnProgress.reset();
    }

    return { openPicker, startLesson, quit, progress, nextLesson, lessonsForCategory, isUnlocked, resetProgress };
})();
