/**
 * CODE RED — story-driven OpenShift incident operating mode.
 * Independent from ScenarioMode: one incident falls while a multi-step
 * observe → diagnose → remediate → verify command chain is completed.
 */
const CodeRedMode = (() => {
    const PREF_STORY = 'codedrop_code_red_story_enabled';
    const PREF_DIFFICULTY = 'codedrop_code_red_difficulty';
    const PROGRESS_KEY = 'codedrop_code_red_progress';
    const BEST_KEY = 'codedrop_code_red_best';
    const IMPACT_POSITION = 84;
    const START_POSITION = 10;
    const BASE_FALL_RATE = 0.86;
    const ASSISTED_STEP_MS = 1200;
    const DIFFICULTY_IDS = new Set(['TRAINEE', 'OPERATOR', 'SRE']);
    const RESPONSE_PHASES = ['signal', 'evidence', 'hypothesis', 'action', 'verify'];

    const ui = {};
    const session = {
        active: false,
        bound: false,
        phase: 'idle',
        chapter: null,
        storyEnabled: true,
        skipAllStory: false,
        difficulty: 'OPERATOR',
        storyLines: [],
        storyIndex: 0,
        storyKind: '',
        storyDone: null,
        storyTyping: false,
        storyFullText: '',
        storyTimer: 0,
        stepIndex: 0,
        position: START_POSITION,
        score: 0,
        chain: 0,
        maxChain: 0,
        wrong: 0,
        hints: 0,
        assisted: false,
        startedAt: 0,
        elapsedMs: 0,
        lastFrameAt: 0,
        burstUntil: 0,
        raf: 0,
        paused: false,
        autoPaused: false,
        terminalLines: [],
        pinnedEvidence: [],
        commandHistory: [],
        historyIndex: 0,
        assistedIndex: 0,
        assistedPaused: false,
        assistedTimer: 0,
        priorBest: null,
        feedback: null,
        generation: 0,
        timers: new Set(),
        returnFocus: null,
        appReturnFocus: null
    };

    const $ = id => document.getElementById(id);
    const lang = () => window.CodeDropI18n?.lang?.() === 'en' ? 'en' : 'ko';
    const tx = (english, korean) => lang() === 'en' ? english : korean;

    function clearScheduled() {
        session.timers.forEach(timer => window.clearTimeout(timer));
        session.timers.clear();
    }

    function schedule(callback, delay) {
        const generation = session.generation;
        const timer = window.setTimeout(() => {
            session.timers.delete(timer);
            if (!session.active || generation !== session.generation) return;
            callback();
        }, delay);
        session.timers.add(timer);
        return timer;
    }

    function localized(value, fallback = '') {
        if (value == null) return fallback;
        if (typeof value === 'object' && !Array.isArray(value)) {
            return value[lang()] ?? value.ko ?? value.en ?? fallback;
        }
        return String(value);
    }

    function localizedLines(value) {
        const selected = value && !Array.isArray(value) && typeof value === 'object'
            ? (value[lang()] ?? value.ko ?? value.en)
            : value;
        if (Array.isArray(selected)) return selected.map(line => String(line));
        return selected ? String(selected).split('\n') : [];
    }

    function campaign() {
        return window.CODE_RED_CAMPAIGN || (typeof CODE_RED_CAMPAIGN !== 'undefined' ? CODE_RED_CAMPAIGN : null);
    }

    function firstPlayableChapter() {
        return campaign()?.chapters?.find(chapter => chapter.playable !== false) || null;
    }

    function difficultyProfile() {
        return campaign()?.difficulty?.[session.difficulty.toLowerCase()] || {};
    }

    function effectiveFallRate() {
        const difficultyMultiplier = Number(difficultyProfile().fallSpeedMultiplier);
        const incidentMultiplier = Number(session.chapter?.incident?.fallSpeed);
        return BASE_FALL_RATE
            * (Number.isFinite(difficultyMultiplier) && difficultyMultiplier > 0 ? difficultyMultiplier : 1)
            * (Number.isFinite(incidentMultiplier) && incidentMultiplier > 0 ? incidentMultiplier : 1);
    }

    function hintPenalty() {
        const configuredPenalty = Number(difficultyProfile().hintPenalty);
        if (Number.isFinite(configuredPenalty) && configuredPenalty >= 0) return configuredPenalty;
        return session.difficulty === 'TRAINEE' ? 0 : (session.difficulty === 'SRE' ? 60 : 30);
    }

    function updateHintLabel() {
        if (!ui.hint) return;
        const penalty = hintPenalty();
        ui.hint.textContent = penalty === 0
            ? tx('HINT (FREE)', '힌트 (무료)')
            : `${tx('HINT', '힌트')} (-${penalty})`;
    }

    function cacheEls() {
        ui.screen = $('code-red-screen');
        ui.shell = ui.screen?.querySelector('.code-red-shell');
        ui.start = $('code-red-start-panel');
        ui.story = $('code-red-story-layer');
        ui.brief = $('code-red-brief-layer');
        ui.game = $('code-red-game-layer');
        ui.failure = $('code-red-failure-layer');
        ui.assisted = $('code-red-assisted-layer');
        ui.report = $('code-red-report-layer');
        ui.teaser = $('code-red-teaser-layer');
        ui.chapterHud = $('code-red-chapter-hud');
        ui.stepHud = $('code-red-step-hud');
        ui.mttr = $('code-red-mttr');
        ui.chain = $('code-red-chain');
        ui.scoreHud = $('code-red-score');
        ui.impactHud = $('code-red-impact-hud');
        ui.storyHud = $('code-red-story-hud');
        ui.startDescription = $('code-red-start-description');
        ui.storyLabel = $('code-red-story-label');
        ui.difficultyLabel = $('code-red-difficulty-label');
        ui.difficultyCopy = $('code-red-difficulty-copy');
        ui.begin = $('code-red-begin');
        ui.resume = $('code-red-resume');
        ui.exit = $('code-red-exit');
        ui.stage = $('code-red-stage');
        ui.sceneClock = $('code-red-scene-clock');
        ui.sceneTitle = $('code-red-scene-title');
        ui.speaker = $('code-red-speaker');
        ui.dialogue = $('code-red-dialogue-text');
        ui.storyLive = $('code-red-story-live');
        ui.storyProgress = $('code-red-story-progress');
        ui.storyNext = $('code-red-story-next');
        ui.storyFast = $('code-red-story-fast');
        ui.storySkip = $('code-red-story-skip');
        ui.skipDialog = $('code-red-skip-dialog');
        ui.skipTitle = $('code-red-skip-title');
        ui.briefTitle = $('code-red-brief-title');
        ui.briefNamespace = $('code-red-brief-namespace');
        ui.briefTarget = $('code-red-brief-target');
        ui.briefSymptom = $('code-red-brief-symptom');
        ui.briefAlert = $('code-red-brief-alert');
        ui.briefCopy = $('code-red-brief-copy');
        ui.accept = $('code-red-accept');
        ui.incidentField = $('code-red-incident-field');
        ui.incidentCard = $('code-red-incident-card');
        ui.incidentCode = $('code-red-incident-code');
        ui.incidentTarget = $('code-red-incident-target');
        ui.incidentMetric = $('code-red-incident-metric');
        ui.terminal = $('code-red-terminal');
        ui.aiopsRail = $('code-red-aiops-rail');
        ui.evidenceRail = $('code-red-evidence-rail');
        ui.directiveSpeaker = $('code-red-directive-speaker');
        ui.directive = $('code-red-directive-text');
        ui.input = $('code-red-input');
        ui.feedback = $('code-red-feedback');
        ui.hint = $('code-red-hint');
        ui.pause = $('code-red-pause');
        ui.pauseCard = $('code-red-pause-card');
        ui.resumeGame = $('code-red-resume-game');
        ui.failureCopy = $('code-red-failure-copy');
        ui.retry = $('code-red-retry');
        ui.takeover = $('code-red-takeover');
        ui.assistedProgress = $('code-red-assisted-progress');
        ui.assistedRationale = $('code-red-assisted-rationale');
        ui.assistedConsole = $('code-red-assisted-console');
        ui.assistedPause = $('code-red-assisted-pause');
        ui.assistedNext = $('code-red-assisted-next');
        ui.assistedSkip = $('code-red-assisted-skip');
        ui.reportStatus = $('code-red-report-status');
        ui.reportGrid = $('code-red-report-grid');
        ui.operatingFlow = $('code-red-operating-flow');
        ui.rootCause = $('code-red-root-cause');
        ui.lesson = $('code-red-lesson');
        ui.reportEvidence = $('code-red-report-evidence');
        ui.bestComparison = $('code-red-best-comparison');
        ui.cleanRetry = $('code-red-clean-retry');
        ui.continue = $('code-red-continue');
        ui.replay = $('code-red-replay');
        ui.home = $('code-red-home');
        ui.teaserTitle = $('code-red-teaser-title');
        ui.teaserCopy = $('code-red-teaser-copy');
        ui.lockedChapters = $('code-red-locked-chapters');
        ui.teaserRoadmap = $('code-red-teaser-roadmap');
        ui.teaserRoadmapSummary = $('code-red-teaser-roadmap-summary');
        ui.teaserHome = $('code-red-teaser-home');
    }

    function hideLayers(except) {
        const revealedFromHidden = Boolean(except?.classList.contains('hidden'));
        setModalIsolation(ui.story, ui.skipDialog, false);
        setModalIsolation(ui.game, ui.pauseCard, false);
        [ui.start, ui.story, ui.brief, ui.game, ui.failure, ui.assisted, ui.report, ui.teaser]
            .forEach(layer => {
                if (!layer) return;
                const hidden = layer !== except;
                layer.classList.toggle('hidden', hidden);
                layer.toggleAttribute('inert', hidden);
                layer.toggleAttribute('data-code-red-layer-inert', hidden);
                layer.setAttribute('aria-hidden', String(hidden));
            });
        setModalVisible(ui.skipDialog, false);
        if (except !== ui.game) setModalVisible(ui.pauseCard, false);
        if (revealedFromHidden && except) except.scrollTop = 0;
    }

    function setModalVisible(modal, visible) {
        if (!modal) return;
        modal.classList.toggle('hidden', !visible);
        modal.toggleAttribute('inert', !visible);
        modal.setAttribute('aria-hidden', String(!visible));
    }

    function setAppIsolation(active) {
        if (!ui.screen) return;
        [...document.body.children].forEach(element => {
            if (element === ui.screen || element.id === 'global-lang-toggle' || ['SCRIPT', 'STYLE'].includes(element.tagName)) return;
            if (active) {
                if (!element.hasAttribute('inert')) {
                    element.setAttribute('inert', '');
                    element.setAttribute('data-code-red-screen-inert', '');
                }
            } else if (element.hasAttribute('data-code-red-screen-inert')) {
                element.removeAttribute('inert');
                element.removeAttribute('data-code-red-screen-inert');
            }
        });
    }

    function setModalIsolation(_container, modal, active) {
        if (!ui.screen || !modal) return;
        let branch = modal;
        while (branch && branch !== document.body) {
            const parent = branch.parentElement;
            if (!parent) break;
            [...parent.children].forEach(sibling => {
                if (sibling === branch) return;
                if (active) {
                    if (!sibling.hasAttribute('inert')) {
                        sibling.setAttribute('inert', '');
                        sibling.setAttribute('data-code-red-modal-inert', '');
                    }
                } else if (sibling.hasAttribute('data-code-red-modal-inert')) {
                    sibling.removeAttribute('data-code-red-modal-inert');
                    if (!sibling.hasAttribute('data-code-red-screen-inert') && !sibling.hasAttribute('data-code-red-layer-inert')) {
                        sibling.removeAttribute('inert');
                    }
                }
            });
            branch = parent;
        }
    }

    function trapModalFocus(event, modal) {
        if (event.key !== 'Tab' || !modal || modal.classList.contains('hidden')) return false;
        const focusable = [...modal.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
            .filter(element => !element.hidden && element.offsetParent !== null);
        if (!focusable.length) {
            event.preventDefault();
            return true;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (!modal.contains(active)) {
            event.preventDefault();
            (event.shiftKey ? last : first).focus();
        } else if (event.shiftKey && active === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
        }
        return true;
    }

    function safeRead(key, fallback = null) {
        try {
            const value = localStorage.getItem(key);
            return value == null ? fallback : JSON.parse(value);
        } catch (_) {
            return fallback;
        }
    }

    function safeWrite(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (_) {
            // Local progress is best-effort in private/restricted browser modes.
        }
    }

    function playSound(name, key = 'Enter') {
        if (!window.sfx) return;
        if (name && typeof window.sfx[name] === 'function') window.sfx[name]();
        else if (typeof window.sfx.playKey === 'function') window.sfx.playKey(key);
    }

    function playCue(name) {
        if (!name || !window.sfx) return false;
        if (typeof window.sfx.playCodeRedCue === 'function') return window.sfx.playCodeRedCue(name);
        return false;
    }

    function formatTime(ms) {
        const seconds = Math.max(0, Math.floor(ms / 1000));
        const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
        const secs = String(seconds % 60).padStart(2, '0');
        return `${mins}:${secs}`;
    }

    function currentElapsed() {
        if (!session.startedAt) return session.elapsedMs;
        if (session.phase !== 'gameplay' || session.paused) return session.elapsedMs;
        return session.elapsedMs + performance.now() - session.startedAt;
    }

    function responsePhaseForStep(index = session.stepIndex) {
        if (index <= 0) return 'signal';
        if (index <= 2) return 'evidence';
        if (index === 3) return 'hypothesis';
        if (index === 4) return 'action';
        return 'verify';
    }

    function responsePhaseIndex(index = session.stepIndex) {
        return RESPONSE_PHASES.indexOf(responsePhaseForStep(index));
    }

    function renderResponseRail(completeAll = false) {
        if (!ui.aiopsRail) return;
        const activeIndex = completeAll ? RESPONSE_PHASES.length : responsePhaseIndex();
        ui.aiopsRail.querySelectorAll('[data-code-red-phase]').forEach((node, index) => {
            const complete = completeAll || index < activeIndex;
            const active = !completeAll && index === activeIndex;
            node.classList.toggle('complete', complete);
            node.classList.toggle('active', active);
            node.dataset.state = complete ? 'complete' : (active ? 'active' : 'pending');
            if (active) node.setAttribute('aria-current', 'step');
            else node.removeAttribute('aria-current');
        });
    }

    function renderEvidenceRail() {
        if (!ui.evidenceRail) return;
        const hiddenForDifficulty = session.difficulty === 'SRE';
        ui.evidenceRail.toggleAttribute('hidden', hiddenForDifficulty);
        ui.evidenceRail.setAttribute('aria-hidden', String(hiddenForDifficulty));
        ui.evidenceRail.replaceChildren();
        session.pinnedEvidence.forEach(item => {
            const chip = document.createElement('span');
            chip.className = 'code-red-evidence-chip';
            chip.setAttribute('role', 'listitem');
            chip.dataset.evidenceId = item.id;
            chip.textContent = localized(item.text);
            ui.evidenceRail.appendChild(chip);
        });
        ui.evidenceRail.classList.toggle('empty', session.pinnedEvidence.length === 0);
    }

    function pinEvidence(step) {
        if (!step?.evidence || session.pinnedEvidence.some(item => item.id === step.id)) return;
        session.pinnedEvidence.push({ id: step.id, text: step.evidence });
        renderEvidenceRail();
    }

    function updateHud() {
        const chapter = session.chapter;
        const totalChapters = campaign()?.totalChapters || campaign()?.chapters?.length || 8;
        const totalSteps = chapter?.steps?.length || 0;
        let visibleStep = 0;
        if (['gameplay', 'transition'].includes(session.phase)) visibleStep = session.stepIndex + 1;
        else if (session.phase === 'assisted') visibleStep = Math.min(totalSteps, session.assistedIndex);
        else if (['resolved', 'report', 'teaser'].includes(session.phase) || (session.phase === 'story' && ['success', 'teaser'].includes(session.storyKind))) visibleStep = totalSteps;
        else if (['failed', 'failure'].includes(session.phase) || (session.phase === 'story' && session.storyKind === 'failure')) visibleStep = session.stepIndex + 1;
        if (ui.chapterHud) ui.chapterHud.textContent = `${tx('CHAPTER', '챕터')} ${chapter?.chapter || 1} / ${totalChapters}`;
        if (ui.stepHud) ui.stepHud.textContent = `${tx('STEP', '단계')} ${visibleStep} / ${totalSteps}`;
        if (ui.mttr) ui.mttr.textContent = `MTTR ${formatTime(currentElapsed())}`;
        if (ui.chain) ui.chain.textContent = `CHAIN x${session.chain}`;
        if (ui.scoreHud) ui.scoreHud.textContent = `SCORE ${session.score}`;
        if (ui.impactHud) {
            const impact = Math.max(0, Math.min(100, Math.round((session.position - START_POSITION) / (IMPACT_POSITION - START_POSITION) * 100)));
            ui.impactHud.textContent = `IMPACT ${impact}%`;
            ui.impactHud.style.setProperty('--impact-progress', `${impact}%`);
        }
        if (ui.storyHud) ui.storyHud.textContent = `STORY ${session.storyEnabled && !session.skipAllStory ? 'ON' : 'OFF'}`;
    }

    function updateIncidentPosition() {
        if (!ui.incidentCard) return;
        ui.incidentCard.style.setProperty('--incident-y', `${session.position}%`);
        const danger = Math.max(0, Math.min(1, (session.position - 52) / (IMPACT_POSITION - 52)));
        ui.incidentField?.style.setProperty('--impact-danger', danger.toFixed(3));
        ui.game?.classList.toggle('impact-danger', danger > 0.45);
        updateHud();
    }

    function loadPreferences() {
        const storyPref = localStorage.getItem(PREF_STORY);
        session.storyEnabled = storyPref == null ? true : storyPref !== 'false';
        const diff = String(localStorage.getItem(PREF_DIFFICULTY) || 'OPERATOR').toUpperCase();
        session.difficulty = DIFFICULTY_IDS.has(diff) ? diff : 'OPERATOR';
    }

    function savePreferences() {
        localStorage.setItem(PREF_STORY, String(session.storyEnabled));
        localStorage.setItem(PREF_DIFFICULTY, session.difficulty);
    }

    function difficultyDescription() {
        if (session.difficulty === 'TRAINEE') {
            return tx('Slower fall · command skeletons · instant hints', '느린 낙하 · 명령 골격 제공 · 즉시 힌트');
        }
        if (session.difficulty === 'SRE') {
            return tx('Faster fall · evidence only · severe hint penalty', '빠른 낙하 · 증거만 제공 · 큰 힌트 감점');
        }
        return tx('Standard fall · action directives · hints cost score', '표준 낙하 · 행동 지시 · 힌트 사용 시 감점');
    }

    function renderStart() {
        hideLayers(ui.start);
        session.phase = 'options';
        document.querySelectorAll('[data-code-red-story]').forEach(button => {
            const active = (button.dataset.codeRedStory === 'on') === session.storyEnabled;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', String(active));
        });
        document.querySelectorAll('[data-code-red-difficulty]').forEach(button => {
            const active = button.dataset.codeRedDifficulty === session.difficulty;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', String(active));
        });
        if (ui.difficultyCopy) ui.difficultyCopy.textContent = difficultyDescription();
        updateHintLabel();
        const progress = safeRead(PROGRESS_KEY, null);
        if (ui.resume) {
            ui.resume.classList.toggle('hidden', !progress?.chapterId);
            ui.resume.textContent = tx('RESUME CAMPAIGN', '캠페인 이어하기');
        }
        updateHud();
    }

    function setSceneCue(line = {}) {
        const cue = line.cue || {};
        if (!ui.stage) return;
        const chapterScene = typeof session.chapter?.sceneTheme === 'object'
            ? session.chapter.sceneTheme.background
            : session.chapter?.sceneTheme;
        const cueSignature = [cue.scene, cue.shot, cue.action, cue.camera, cue.effect, session.storyKind]
            .filter(Boolean).join(' ').toLowerCase();
        let visualScene = 'establishing';
        if (/recover|success|stabil|green/.test(cueSignature)) visualScene = 'recovery';
        else if (/alert|incident|impact|warning|critical|code-red|failure|breach/.test(cueSignature)) visualScene = 'alert';
        else if (/operator|chair|keyboard|hands|console|arrival/.test(cueSignature)) visualScene = 'operator';
        else if (/monitor|metric|dashboard|signal|terminal|log|split/.test(cueSignature)) visualScene = 'monitors';
        ui.stage.dataset.scene = cue.scene || visualScene;
        ui.stage.dataset.theme = chapterScene || 'control-room';
        ui.stage.dataset.shot = cue.shot || cue.camera || 'wide';
        ui.stage.dataset.actor = cue.actor || line.speaker || 'SYSTEM';
        ui.stage.dataset.actorAction = cue.action || 'idle';
        ui.stage.dataset.camera = cue.camera || 'hold';
        ui.stage.dataset.effect = cue.effect || 'none';
        const cueDuration = `${Math.max(300, Number(cue.durationMs) || 1200)}ms`;
        ui.stage.style.setProperty('--cue-duration', cueDuration);
        ui.stage.style.setProperty('--code-red-cue-duration', cueDuration);
        ui.stage.classList.remove('cue-enter');
        void ui.stage.offsetWidth;
        ui.stage.classList.add('cue-enter');
        const sceneTime = cue.clock || line.clock || '03:17:08';
        ui.stage.dataset.time = sceneTime;
        if (ui.sceneClock) ui.sceneClock.textContent = sceneTime;
        if (ui.sceneTitle) {
            ui.sceneTitle.textContent = localized(line.location, cue.location || 'NEXUS-9 // CONTROL ROOM');
        }
        if (cue.sfx) playCue(cue.sfx);
    }

    function stopStoryTyping(reveal = false) {
        window.clearInterval(session.storyTimer);
        session.storyTimer = 0;
        if (reveal && ui.dialogue) {
            ui.dialogue.textContent = session.storyFullText;
            if (ui.storyLive) ui.storyLive.textContent = `${ui.speaker?.textContent || 'SYSTEM'}: ${session.storyFullText}`;
        }
        ui.dialogue?.classList.remove('is-typing');
        session.storyTyping = false;
    }

    function typeStoryText(text) {
        stopStoryTyping();
        session.storyFullText = text;
        if (!ui.dialogue) return;
        ui.dialogue.textContent = '';
        if (ui.storyLive) ui.storyLive.textContent = '';
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
            ui.dialogue.textContent = text;
            if (ui.storyLive) ui.storyLive.textContent = `${ui.speaker?.textContent || 'SYSTEM'}: ${text}`;
            session.storyTyping = false;
            return;
        }
        session.storyTyping = true;
        ui.dialogue.classList.add('is-typing');
        let cursor = 0;
        session.storyTimer = window.setInterval(() => {
            cursor += 1;
            ui.dialogue.textContent = text.slice(0, cursor);
            if (cursor >= text.length) stopStoryTyping(true);
        }, 18);
    }

    function renderStoryLine() {
        const line = session.storyLines[session.storyIndex];
        if (!line) {
            finishStory(false);
            return;
        }
        setSceneCue(line);
        if (ui.speaker) ui.speaker.textContent = String(line.speaker || 'WATCHER');
        ui.speaker?.closest('.code-red-dialogue')?.setAttribute('data-speaker', String(line.speaker || 'WATCHER'));
        typeStoryText(localized(line.text ?? line));
        if (ui.storyProgress) {
            ui.storyProgress.textContent = `${String(session.storyIndex + 1).padStart(2, '0')} / ${String(session.storyLines.length).padStart(2, '0')}`;
        }
        if (!line.cue?.sfx) playSound(null, 'Tab');
    }

    function showStory(lines, kind, done) {
        const safeLines = Array.isArray(lines) ? lines.filter(Boolean) : [];
        if (!session.storyEnabled || session.skipAllStory || safeLines.length === 0) {
            done?.({ skipped: true });
            return;
        }
        stopLoop();
        session.phase = 'story';
        session.storyKind = kind;
        session.storyLines = safeLines;
        session.storyIndex = 0;
        session.storyDone = done;
        hideLayers(ui.story);
        renderStoryLine();
        updateHud();
    }

    function nextStoryLine() {
        if (session.phase !== 'story') return;
        if (session.storyTyping) {
            stopStoryTyping(true);
            return;
        }
        session.storyIndex += 1;
        renderStoryLine();
    }

    function fastForwardStory() {
        if (session.phase !== 'story') return;
        if (session.storyTyping) stopStoryTyping(true);
        session.storyIndex += 1;
        renderStoryLine();
    }

    function finishStory(skipped) {
        stopStoryTyping();
        const done = session.storyDone;
        session.storyDone = null;
        session.storyLines = [];
        session.storyIndex = 0;
        done?.({ skipped });
    }

    function openSkipDialog() {
        if (session.phase !== 'story' || !ui.skipDialog) return;
        session.returnFocus = document.activeElement;
        setModalIsolation(ui.story, ui.skipDialog, true);
        setModalVisible(ui.skipDialog, true);
        schedule(() => ui.skipDialog?.querySelector('button')?.focus({ preventScroll: true }), 0);
    }

    function handleSkipChoice(choice) {
        const restoreFocus = session.returnFocus;
        setModalIsolation(ui.story, ui.skipDialog, false);
        session.returnFocus = null;
        if (choice === 'cancel') {
            setModalVisible(ui.skipDialog, false);
            schedule(() => restoreFocus?.isConnected && restoreFocus.focus({ preventScroll: true }), 0);
            return;
        }
        if (choice === 'session') session.skipAllStory = true;
        setModalVisible(ui.skipDialog, false);
        finishStory(true);
    }

    function missionBrief() {
        const chapter = session.chapter;
        const brief = chapter?.missionBrief || chapter?.brief || {};
        session.phase = 'brief';
        hideLayers(ui.brief);
        if (ui.briefTitle) ui.briefTitle.textContent = localized(brief.title || chapter?.title, 'HEARTBEAT LOST');
        if (ui.briefNamespace) ui.briefNamespace.textContent = localized(brief.namespace || chapter?.incident?.namespace);
        if (ui.briefTarget) ui.briefTarget.textContent = localized(brief.target || chapter?.incident?.target);
        if (ui.briefSymptom) ui.briefSymptom.textContent = localized(brief.symptom || chapter?.incident?.symptom || chapter?.incident?.metric);
        if (ui.briefAlert) ui.briefAlert.textContent = localized(brief.alert || chapter?.incident?.code);
        if (ui.briefCopy) {
            const summary = localized(brief.summary || brief.copy || brief.text || chapter?.brief);
            const directive = localized(brief.directive);
            ui.briefCopy.textContent = [summary, directive].filter(Boolean).join('\n\n');
        }
        updateHud();
        playSound(null, 'Enter');
    }

    function resetIncidentStats() {
        clearScheduled();
        session.assistedTimer = 0;
        ui.incidentCard?.classList.remove('impact', 'resolved', 'accepted', 'rejected');
        ui.input?.classList.remove('rejected');
        ui.game?.classList.remove('impact-danger');
        setModalIsolation(ui.game, ui.pauseCard, false);
        setModalVisible(ui.pauseCard, false);
        session.stepIndex = 0;
        session.position = START_POSITION;
        session.score = 0;
        session.chain = 0;
        session.maxChain = 0;
        session.wrong = 0;
        session.hints = 0;
        session.assisted = false;
        session.startedAt = 0;
        session.elapsedMs = 0;
        session.lastFrameAt = 0;
        session.burstUntil = 0;
        session.paused = false;
        session.autoPaused = false;
        session.pinnedEvidence = [];
        session.commandHistory = [];
        session.historyIndex = 0;
        session.assistedIndex = 0;
        session.assistedPaused = false;
        const storedBest = safeRead(BEST_KEY, {})?.[session.chapter?.id] || null;
        session.priorBest = storedBest
            && !storedBest.assisted
            && Number(storedBest.wrong || 0) === 0
            && Number(storedBest.hints || 0) === 0
            ? storedBest
            : null;
        session.feedback = null;
        session.terminalLines = [tx('INCIDENT CHANNEL OPEN // awaiting operator input', '인시던트 채널 개방 // 오퍼레이터 입력 대기')];
        renderEvidenceRail();
        renderResponseRail();
    }

    function currentStep() {
        return session.chapter?.steps?.[session.stepIndex] || null;
    }

    function traineeDirective(step) {
        const directiveSource = session.stepIndex === 0
            ? session.chapter?.missionBrief?.directive
            : session.chapter?.steps?.[session.stepIndex - 1]?.directive;
        const directive = localized(directiveSource || step?.directive);
        if (session.difficulty === 'SRE') {
            return tx('Read the evidence. Decide the next safe operating action.', '증거를 읽고 다음 안전 조치를 판단하라.');
        }
        if (session.difficulty !== 'TRAINEE') return directive;
        const hint = localized(step?.hint);
        const rationale = localized(step?.rationale);
        return [
            directive,
            rationale ? `${tx('WATCHER INFERENCE', 'WATCHER 추론')}: ${rationale}` : '',
            hint ? `${tx('COMMAND FRAME', '명령 골격')}: ${hint}` : ''
        ].filter(Boolean).join('\n');
    }

    function isEvidenceLine(line) {
        return /CrashLoopBackOff|Exit Code|Back-off|postgres-old|DB_HOST=|deployment\.apps\/payment-api updated|successfully rolled out/i.test(String(line));
    }

    function renderTerminal() {
        if (!ui.terminal) return;
        ui.terminal.replaceChildren();
        session.terminalLines.slice(-10).forEach((line, index, lines) => {
            const row = document.createElement('div');
            row.classList.toggle('latest', index === lines.length - 1);
            row.classList.toggle('evidence', session.difficulty !== 'SRE' && isEvidenceLine(line));
            row.textContent = line;
            ui.terminal.appendChild(row);
        });
        ui.terminal.scrollTop = ui.terminal.scrollHeight;
    }

    function renderIncident(options = {}) {
        const chapter = session.chapter;
        const step = currentStep();
        if (!chapter || !step) return;
        if (ui.incidentCode) ui.incidentCode.textContent = localized(chapter.incident?.code);
        if (ui.incidentTarget) {
            const label = chapter.incident?.targetLabel || chapter.incident?.target || chapter.incident?.name || chapter.incident?.workload;
            ui.incidentTarget.textContent = `${localized(label)} · ${localized(chapter.incident?.namespace)}`;
        }
        if (ui.incidentMetric) {
            const metrics = chapter.incident?.metrics || {};
            ui.incidentMetric.textContent = localized(chapter.incident?.metric || chapter.incident?.symptom)
                || (metrics.restarts != null ? `RESTARTS ${metrics.restarts}` : 'CRITICAL');
        }
        if (ui.directiveSpeaker) ui.directiveSpeaker.textContent = String(step.speaker || 'CONTROL');
        if (ui.directive) ui.directive.textContent = traineeDirective(step);
        const directivePanel = ui.directive?.closest('.code-red-directive');
        if (directivePanel) directivePanel.toggleAttribute('hidden', session.difficulty === 'SRE');
        if (ui.input) {
            ui.input.value = '';
            ui.input.disabled = false;
            ui.input.placeholder = tx('ENTER OPENSHIFT COMMAND...', 'OPENSHIFT 명령을 입력...');
        }
        if (!options.preserveFeedback) session.feedback = null;
        renderFeedback();
        renderResponseRail();
        renderEvidenceRail();
        renderTerminal();
        updateIncidentPosition();
        updateHud();
    }

    function startLoop(options = {}) {
        stopLoop();
        session.phase = 'gameplay';
        session.paused = false;
        session.startedAt = performance.now();
        session.lastFrameAt = performance.now();
        updateHud();
        session.raf = requestAnimationFrame(tick);
        if (options.focusInput !== false) schedule(() => ui.input?.focus({ preventScroll: true }), 0);
    }

    function stopLoop() {
        if (session.raf) cancelAnimationFrame(session.raf);
        session.raf = 0;
        session.lastFrameAt = 0;
    }

    function tick(now) {
        if (!session.active || session.phase !== 'gameplay' || session.paused) return;
        const delta = Math.min(0.08, Math.max(0, (now - session.lastFrameAt) / 1000));
        session.lastFrameAt = now;
        const burst = now < session.burstUntil ? 1.2 : 1;
        session.position += effectiveFallRate() * burst * delta;
        updateIncidentPosition();
        updateHud();
        if (session.position >= IMPACT_POSITION) {
            failIncident();
            return;
        }
        session.raf = requestAnimationFrame(tick);
    }

    function beginIncident(options = {}) {
        hideLayers(ui.game);
        if (options.reset !== false) resetIncidentStats();
        setModalVisible(ui.pauseCard, false);
        renderIncident();
        startLoop();
        playSound(null, 'Enter');
    }

    function feedbackStep(state = session.feedback) {
        if (!state?.stepId) return currentStep();
        return session.chapter?.steps?.find(step => step.id === state.stepId) || currentStep();
    }

    function renderFeedback() {
        if (!ui.feedback) return;
        const state = session.feedback;
        ui.feedback.className = 'code-red-feedback';
        ui.feedback.textContent = '';
        if (!state) return;
        const step = feedbackStep(state);
        if (state.kind === 'accepted') {
            ui.feedback.textContent = `${tx('COMMAND ACCEPTED', '명령 승인')} // SCORE +100 · IMPACT -${state.impact}`;
            ui.feedback.classList.add('accepted');
            return;
        }
        if (state.kind === 'rejected') {
            const categoryLabel = {
                dangerous: tx('DESTRUCTIVE SHORTCUT BLOCKED', '파괴적 지름길 차단'),
                namespace: tx('NAMESPACE MISMATCH', '네임스페이스 불일치'),
                resource: tx('RESOURCE MISMATCH', '리소스 불일치'),
                flags: tx('REQUIRED FLAG MISSING', '필수 플래그 누락'),
                generic: tx('COMMAND REJECTED', '명령 거부')
            }[state.category] || tx('COMMAND REJECTED', '명령 거부');
            ui.feedback.textContent = `${categoryLabel} // ${rejectionMessage(step, state.category)} · SCORE -${state.score} · IMPACT +${state.impact}`;
            ui.feedback.classList.add('rejected', state.category || 'generic');
            return;
        }
        if (state.kind === 'hint') {
            const scoreEffect = state.score === 0 ? tx('SCORE FREE', 'SCORE 감점 없음') : `SCORE -${state.score}`;
            ui.feedback.textContent = `${tx('HINT', '힌트')} // ${localized(step?.hint)} · ${scoreEffect} · IMPACT +${state.impact}`;
            ui.feedback.classList.add('hint');
        }
    }

    function commandAccepted(step) {
        stopLoop();
        session.elapsedMs = currentElapsed();
        session.startedAt = 0;
        session.phase = 'transition';
        if (ui.input) ui.input.disabled = true;
        session.score += 100;
        session.chain += 1;
        session.maxChain = Math.max(session.maxChain, session.chain);
        const knockback = Number(step.knockback);
        const knockbackValue = knockback > 0 && knockback <= 1 ? knockback * 100 : (knockback || 10);
        session.position = Math.max(5, session.position - knockbackValue);
        ui.incidentCard?.classList.remove('rejected');
        ui.incidentCard?.classList.add('accepted');
        schedule(() => ui.incidentCard?.classList.remove('accepted'), 700);
        const outputs = localizedLines(step.terminalOutput);
        session.terminalLines.push(`> ${String(step.canonical || '').trim()}`, ...outputs);
        pinEvidence(step);
        renderTerminal();
        updateIncidentPosition();
        session.feedback = { kind: 'accepted', stepId: step.id, impact: Math.round(knockbackValue) };
        renderFeedback();
        playCue('accepted');

        const finalStep = session.stepIndex >= session.chapter.steps.length - 1
            && (step.phase === 'verify' || step.finalVerification === true);
        schedule(() => {
            if (finalStep) {
                resolveIncident();
                return;
            }
            session.stepIndex += 1;
            renderIncident();
            startLoop();
        }, 900);
    }

    function classifyRejection(value, step) {
        const normalized = String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
        if (/\bdelete\b|\breplace\b|rollout\s+undo|\bscale\b.*(?:--replicas(?:=|\s+)0)|replicas\s*=\s*0/.test(normalized)) return 'dangerous';
        if (!/(?:^|\s)(?:-n\s+payments|--namespace(?:=|\s+)payments)(?:\s|$)/.test(normalized)) return 'namespace';

        const stepNumber = Number(String(step?.id || '').split('-').at(-1));
        const podName = 'payment-api-7fd8b5c9b7-k2n6m';
        const resourceRules = {
            1: /\bget\s+(?:pods?|po)\b/,
            2: new RegExp(`\\bdescribe\\s+(?:pods?|po)(?:/|\\s+)${podName}\\b`),
            3: new RegExp(`\\blogs\\s+(?:(?:pods?|po)/)?${podName}\\b`),
            4: /\bset\s+env\s+deploy(?:ment)?(?:\/|\s+)payment-api\b/,
            5: /\bset\s+env\s+deploy(?:ment)?(?:\/|\s+)payment-api\b/,
            6: /\brollout\s+status\s+deploy(?:ment)?(?:\/|\s+)payment-api\b/
        };
        if (resourceRules[stepNumber] && !resourceRules[stepNumber].test(normalized)) return 'resource';

        const flagRules = {
            3: /\blogs\b.*(?:--previous|-p)(?:\s|$)|(?:--previous|-p).*\blogs\b/,
            4: /\bset\s+env\b.*--list|--list.*\bset\s+env\b/,
            5: /\bset\s+env\b.*db_host=postgresql\.payments\.svc/
        };
        if (flagRules[stepNumber] && !flagRules[stepNumber].test(normalized)) return 'flags';
        return 'generic';
    }

    function rejectionMessage(step, category) {
        return localized(step?.rejectionFeedback?.[category]
            || step?.rejectionFeedback?.generic,
        tx('The command does not match the next safe action.', '다음 안전 조치와 일치하지 않는 명령입니다.'));
    }

    function commandRejected(value, step) {
        const category = classifyRejection(value, step);
        session.wrong += 1;
        session.chain = 0;
        session.score = Math.max(0, session.score - 20);
        session.position = Math.min(IMPACT_POSITION, session.position + 6);
        session.burstUntil = performance.now() + 1500;
        ui.incidentCard?.classList.remove('accepted');
        ui.incidentCard?.classList.add('rejected');
        schedule(() => ui.incidentCard?.classList.remove('rejected'), 650);
        ui.input?.classList.add('rejected');
        schedule(() => ui.input?.classList.remove('rejected'), 420);
        session.feedback = { kind: 'rejected', category, stepId: step.id, score: 20, impact: 6 };
        renderFeedback();
        playCue('rejected');
        updateIncidentPosition();
        updateHud();
        if (session.position >= IMPACT_POSITION) failIncident();
    }

    function submitCommand() {
        if (session.phase !== 'gameplay' || session.paused) return;
        const step = currentStep();
        const value = String(ui.input?.value || '').trim();
        if (!step || !value) return;
        if (session.commandHistory.at(-1) !== value) session.commandHistory.push(value);
        session.commandHistory = session.commandHistory.slice(-20);
        session.historyIndex = session.commandHistory.length;
        const correct = window.StudyCore?.isCorrect
            ? window.StudyCore.isCorrect(value, step)
            : (typeof StudyCore !== 'undefined' && StudyCore.isCorrect(value, step));
        if (correct) commandAccepted(step);
        else commandRejected(value, step);
        if (ui.input) ui.input.value = '';
    }

    function navigateCommandHistory(direction) {
        if (!ui.input || !session.commandHistory.length) return;
        session.historyIndex = Math.max(0, Math.min(session.commandHistory.length, session.historyIndex + direction));
        ui.input.value = session.historyIndex >= session.commandHistory.length
            ? ''
            : session.commandHistory[session.historyIndex];
        schedule(() => ui.input?.setSelectionRange(ui.input.value.length, ui.input.value.length), 0);
    }

    function showHint() {
        if (session.phase !== 'gameplay' || session.paused) return;
        const step = currentStep();
        if (!step) return;
        session.hints += 1;
        const penalty = hintPenalty();
        session.score = Math.max(0, session.score - penalty);
        session.position = Math.min(IMPACT_POSITION, session.position + 4);
        session.feedback = { kind: 'hint', stepId: step.id, score: penalty, impact: 4 };
        renderFeedback();
        playCue('warning');
        updateIncidentPosition();
        updateHud();
        if (session.position >= IMPACT_POSITION) failIncident();
    }

    function pauseGame(auto = false) {
        if (session.phase !== 'gameplay' || session.paused) return;
        session.elapsedMs = currentElapsed();
        session.startedAt = 0;
        session.paused = true;
        session.autoPaused = auto;
        stopLoop();
        session.returnFocus = document.activeElement;
        setModalIsolation(ui.game, ui.pauseCard, true);
        setModalVisible(ui.pauseCard, true);
        if (ui.input) ui.input.disabled = true;
        updateHud();
        if (!auto) schedule(() => ui.resumeGame?.focus({ preventScroll: true }), 0);
    }

    function resumeGame() {
        if (session.phase !== 'gameplay' || !session.paused || document.hidden) return;
        const restoreFocus = session.returnFocus;
        session.paused = false;
        session.autoPaused = false;
        setModalIsolation(ui.game, ui.pauseCard, false);
        setModalVisible(ui.pauseCard, false);
        if (ui.input) ui.input.disabled = false;
        startLoop({ focusInput: false });
        session.returnFocus = null;
        schedule(() => {
            const target = restoreFocus?.isConnected && !restoreFocus.closest('[inert]') ? restoreFocus : ui.input;
            target?.focus({ preventScroll: true });
        }, 0);
    }

    function togglePause() {
        if (session.paused) resumeGame();
        else pauseGame(false);
    }

    function persistResult(resolved) {
        const chapter = session.chapter;
        if (!chapter) return;
        const result = {
            chapterId: chapter.id,
            status: resolved ? (session.assisted ? 'assisted' : 'resolved') : 'failed',
            score: session.score,
            mttrMs: session.elapsedMs,
            wrong: session.wrong,
            hints: session.hints,
            maxChain: session.maxChain,
            assisted: session.assisted,
            stepIndex: session.stepIndex,
            updatedAt: new Date().toISOString()
        };
        safeWrite(PROGRESS_KEY, result);
        const storedBest = safeRead(BEST_KEY, {});
        const best = storedBest && typeof storedBest === 'object' && !Array.isArray(storedBest) ? storedBest : {};
        const candidate = best[chapter.id];
        const prior = candidate
            && !candidate.assisted
            && Number(candidate.wrong || 0) === 0
            && Number(candidate.hints || 0) === 0
            ? candidate
            : null;
        const cleanResolve = resolved && !session.assisted && session.wrong === 0 && session.hints === 0;
        const isBetter = !prior
            || session.score > Number(prior.score || 0)
            || (session.score === Number(prior.score || 0) && session.elapsedMs < Number(prior.mttrMs || Infinity));
        if (cleanResolve && isBetter) {
            best[chapter.id] = result;
            safeWrite(BEST_KEY, best);
        }
    }

    function resolveIncident() {
        stopLoop();
        session.elapsedMs = currentElapsed();
        session.startedAt = 0;
        session.phase = 'resolved';
        if (ui.input) ui.input.disabled = true;
        const heightBonus = Math.max(0, Math.round((IMPACT_POSITION - session.position) / IMPACT_POSITION * 50));
        session.score += heightBonus;
        if (session.wrong === 0) session.score += 100;
        persistResult(true);
        ui.incidentCard?.classList.add('resolved');
        renderResponseRail(true);
        playCue('recovery');
        schedule(() => {
            showStory(session.chapter?.successStory, 'success', () => showReport(true));
        }, 700);
    }

    function failIncident() {
        if (session.phase !== 'gameplay') return;
        session.elapsedMs = currentElapsed();
        session.startedAt = 0;
        session.phase = 'failed';
        stopLoop();
        if (ui.input) ui.input.disabled = true;
        ui.incidentCard?.classList.add('impact');
        persistResult(false);
        playCue('impact');
        const phase = currentStep()?.phase || 'diagnose';
        const failureLines = session.chapter?.failureStories?.[phase] || session.chapter?.failureStory;
        schedule(() => {
            showStory(failureLines, 'failure', showFailureChoices);
        }, 500);
    }

    function showFailureChoices() {
        session.phase = 'failure';
        hideLayers(ui.failure);
        if (ui.failureCopy) {
            ui.failureCopy.textContent = tx(
                'Retry the incident, or let WATCHER demonstrate the remaining operating chain and continue with an assisted result.',
                '인시던트를 재시도하거나 WATCHER가 남은 조치 체인을 시연하도록 맡기고 ASSISTED 결과로 계속할 수 있습니다.'
            );
        }
        updateHud();
    }

    function retryIncident() {
        ui.incidentCard?.classList.remove('impact', 'resolved');
        resetIncidentStats();
        missionBrief();
    }

    function aiTakeover() {
        clearAssistedTimer();
        session.assisted = true;
        session.score = 0;
        session.assistedIndex = 0;
        session.assistedPaused = false;
        session.phase = 'assisted';
        hideLayers(ui.assisted);
        renderAssistedTranscript();
        runAssistedStep(true);
    }

    function clearAssistedTimer() {
        if (!session.assistedTimer) return;
        window.clearTimeout(session.assistedTimer);
        session.timers.delete(session.assistedTimer);
        session.assistedTimer = 0;
    }

    function assistedEntry(step, index) {
        const entry = document.createElement('div');
        entry.className = 'code-red-assisted-entry';
        entry.dataset.step = String(index + 1);
        const command = document.createElement('code');
        command.className = 'command';
        command.textContent = `> ${step.canonical}`;
        const output = document.createElement('pre');
        output.textContent = localizedLines(step.terminalOutput).join('\n');
        const reason = document.createElement('p');
        reason.textContent = `${tx('WHY', '이유')} // ${localized(step.rationale)}`;
        entry.append(command, output, reason);
        return entry;
    }

    function renderAssistedTranscript() {
        if (ui.assistedConsole) {
            ui.assistedConsole.replaceChildren();
            (session.chapter?.steps || []).slice(0, session.assistedIndex).forEach((step, index) => {
                ui.assistedConsole.appendChild(assistedEntry(step, index));
            });
            ui.assistedConsole.scrollTop = ui.assistedConsole.scrollHeight;
        }
        const total = session.chapter?.steps?.length || 0;
        if (ui.assistedProgress) ui.assistedProgress.textContent = `${tx('STEP', '단계')} ${session.assistedIndex} / ${total}`;
        const latest = session.chapter?.steps?.[Math.max(0, session.assistedIndex - 1)];
        if (ui.assistedRationale) {
            ui.assistedRationale.textContent = latest
                ? localized(latest.rationale)
                : tx('WATCHER will replay each safe command and explain the evidence chain.', 'WATCHER가 각 안전 명령과 증거 연결을 재생합니다.');
        }
        if (ui.assistedPause) {
            ui.assistedPause.textContent = session.assistedPaused ? tx('RESUME', '계속') : tx('PAUSE', '일시정지');
            ui.assistedPause.setAttribute('aria-pressed', String(session.assistedPaused));
        }
        if (ui.assistedNext) ui.assistedNext.disabled = session.assistedIndex >= total;
        updateHud();
    }

    function scheduleAssistedStep() {
        clearAssistedTimer();
        if (session.phase !== 'assisted' || session.assistedPaused) return;
        session.assistedTimer = schedule(() => runAssistedStep(false), ASSISTED_STEP_MS);
    }

    function runAssistedStep(manual = false) {
        if (session.phase !== 'assisted' || (session.assistedPaused && !manual)) return;
        clearAssistedTimer();
        const steps = session.chapter?.steps || [];
        if (session.assistedIndex >= steps.length) {
            finishAssistedReplay();
            return;
        }
        const step = steps[session.assistedIndex];
        session.assistedIndex += 1;
        pinEvidence(step);
        renderAssistedTranscript();
        playCue('accepted');
        if (session.assistedIndex >= steps.length) {
            if (!session.assistedPaused) session.assistedTimer = schedule(finishAssistedReplay, ASSISTED_STEP_MS);
        } else {
            scheduleAssistedStep();
        }
    }

    function toggleAssistedPause() {
        if (session.phase !== 'assisted') return;
        session.assistedPaused = !session.assistedPaused;
        if (session.assistedPaused) clearAssistedTimer();
        else scheduleAssistedStep();
        renderAssistedTranscript();
    }

    function finishAssistedReplay() {
        if (session.phase !== 'assisted') return;
        clearAssistedTimer();
        const steps = session.chapter?.steps || [];
        steps.forEach(pinEvidence);
        session.stepIndex = Math.max(0, (steps.length || 1) - 1);
        session.assistedIndex = steps.length;
        persistResult(true);
        showReport(true);
    }

    function reportRows(resolved) {
        return [
            [tx('STATUS', '상태'), resolved ? (session.assisted ? 'ASSISTED' : 'RESOLVED') : 'ESCALATED'],
            ['MTTR', formatTime(session.elapsedMs)],
            [tx('COMMANDS', '명령 수'), String(session.chapter?.steps?.length || 0)],
            [tx('WRONG', '오답'), String(session.wrong)],
            [tx('HINTS', '힌트'), String(session.hints)],
            ['CHAIN', `x${session.maxChain}`],
            ['SCORE', String(session.score)]
        ];
    }

    function showReport(resolved) {
        session.phase = 'report';
        hideLayers(ui.report);
        if (ui.continue) {
            ui.continue.onclick = () => continueStory();
            ui.continue.dataset.codeRedBound = 'true';
        }
        if (ui.reportStatus) {
            ui.reportStatus.textContent = session.assisted
                ? tx('INCIDENT RESOLVED // ASSISTED', '인시던트 복구 // 보조됨')
                : tx('INCIDENT RESOLVED', '인시던트 복구 완료');
        }
        if (ui.reportGrid) {
            ui.reportGrid.replaceChildren();
            reportRows(resolved).forEach(([label, value]) => {
                const item = document.createElement('div');
                const dt = document.createElement('span');
                const dd = document.createElement('strong');
                dt.textContent = label;
                dd.textContent = value;
                item.append(dt, dd);
                ui.reportGrid.appendChild(item);
            });
        }
        if (ui.operatingFlow) {
            ui.operatingFlow.replaceChildren();
            const flow = session.chapter?.postmortem?.operatingFlow || (session.chapter?.steps || []).map(step => step.flowLabel || step.phase);
            flow.forEach((flowItem, index) => {
                const node = document.createElement('span');
                node.textContent = localized(flowItem || `STEP ${index + 1}`).replaceAll('_', ' ').toUpperCase();
                ui.operatingFlow.appendChild(node);
            });
        }
        if (ui.reportEvidence) {
            ui.reportEvidence.replaceChildren();
            const acquiredEvidence = session.pinnedEvidence.map(item => localized(item.text)).filter(Boolean);
            const evidence = acquiredEvidence.length
                ? acquiredEvidence
                : localizedLines(session.chapter?.postmortem?.evidence);
            const resolution = localized(session.chapter?.postmortem?.resolution);
            [...evidence, resolution ? `${tx('ACTION + VERIFY', '조치 + 검증')} // ${resolution}` : ''].filter(Boolean).forEach((line, index) => {
                const item = document.createElement('p');
                item.setAttribute('role', 'listitem');
                if (index >= evidence.length) item.classList.add('resolution');
                item.textContent = line;
                ui.reportEvidence.appendChild(item);
            });
        }
        if (ui.rootCause) ui.rootCause.textContent = localized(session.chapter?.postmortem?.cause);
        if (ui.lesson) ui.lesson.textContent = localized(session.chapter?.postmortem?.lesson);
        if (ui.bestComparison) {
            const prior = session.priorBest;
            const cleanResolve = !session.assisted && session.wrong === 0 && session.hints === 0;
            if (!prior) {
                ui.bestComparison.textContent = cleanResolve
                    ? tx('NEW CLEAN BASELINE RECORDED', '새 클린 기준 기록이 저장되었습니다.')
                    : tx('CLEAN BEST UNCHANGED // no clean baseline recorded yet', '클린 최고 기록 유지 // 아직 클린 기준 기록이 없습니다.');
            } else {
                const scoreDelta = session.score - Number(prior.score || 0);
                const mttrDelta = session.elapsedMs - Number(prior.mttrMs || 0);
                const scoreText = `${scoreDelta >= 0 ? '+' : ''}${scoreDelta}`;
                const mttrText = mttrDelta === 0 ? '±00:00' : `${mttrDelta < 0 ? '-' : '+'}${formatTime(Math.abs(mttrDelta))}`;
                const comparisonLabel = cleanResolve
                    ? tx('BEST COMPARISON', '최고 기록 비교')
                    : tx('CLEAN BEST UNCHANGED', '클린 최고 기록 유지');
                ui.bestComparison.textContent = `${comparisonLabel} // SCORE ${scoreText} · MTTR ${mttrText}`;
            }
        }
        const needsCleanRetry = session.assisted || session.wrong > 0 || session.hints > 0;
        ui.cleanRetry?.classList.toggle('hidden', !needsCleanRetry);
        renderResponseRail(true);
        updateHud();
    }

    function showTeaser() {
        session.phase = 'teaser';
        hideLayers(ui.teaser);
        const chapters = campaign()?.chapters || [];
        const next = chapters.find(chapter => Number(chapter.chapter) === Number(session.chapter?.chapter || 1) + 1) || chapters[1];
        if (ui.teaserTitle) ui.teaserTitle.textContent = localized(next?.title, 'GHOST TAG');
        if (ui.teaserCopy) {
            ui.teaserCopy.textContent = localized(next?.teaser?.situation || next?.subtitle,
                tx('A new signal is already rising in the media namespace.', 'media 네임스페이스에서 새로운 신호가 상승 중입니다.'));
        }
        if (ui.lockedChapters) {
            ui.lockedChapters.replaceChildren();
            chapters.filter(chapter => chapter !== session.chapter).forEach(chapter => {
                const card = document.createElement('div');
                card.className = chapter.playable === false ? 'locked' : 'available';
                const number = document.createElement('span');
                const title = document.createElement('strong');
                const status = document.createElement('em');
                number.textContent = `CH ${String(chapter.chapter).padStart(2, '0')}`;
                title.textContent = localized(chapter.title);
                status.textContent = chapter.playable === false ? tx('SIGNAL LOCKED', '신호 잠김') : tx('AVAILABLE', '플레이 가능');
                card.append(number, title, status);
                ui.lockedChapters.appendChild(card);
            });
        }
        if (ui.teaserRoadmapSummary) {
            const remaining = Math.max(0, chapters.length - Number(next?.chapter || 2));
            ui.teaserRoadmapSummary.textContent = `CH ${String(next?.chapter || 2).padStart(2, '0')} · ${localized(next?.title, 'GHOST TAG')} // ${remaining} ${tx('MORE SIGNALS LOCKED', '개 신호 추가 잠김')}`;
        }
        if (ui.teaserRoadmap) ui.teaserRoadmap.open = window.matchMedia?.('(min-width: 601px)').matches === true;
        updateHud();
    }

    function continueStory() {
        if (!session.storyEnabled || session.skipAllStory) {
            showTeaser();
            return;
        }
        const lines = session.chapter?.teaserStory || session.chapter?.teaserScene || [];
        showStory(lines, 'teaser', showTeaser);
    }

    function selectStory(enabled) {
        session.storyEnabled = Boolean(enabled);
        savePreferences();
        renderStart();
    }

    function selectDifficulty(value) {
        const next = String(value || '').toUpperCase();
        if (!DIFFICULTY_IDS.has(next)) return;
        session.difficulty = next;
        savePreferences();
        renderStart();
    }

    function startCampaign() {
        const chapter = firstPlayableChapter();
        if (!chapter) {
            if (ui.startDescription) ui.startDescription.textContent = tx('Scenario data could not be loaded.', '시나리오 데이터를 불러오지 못했습니다.');
            return;
        }
        session.chapter = chapter;
        session.skipAllStory = false;
        savePreferences();
        resetIncidentStats();
        const prologue = campaign()?.prologue;
        const prologueLines = Array.isArray(prologue) ? prologue : (prologue?.dialogue || []);
        const preStory = [...prologueLines, ...(chapter.preStory || [])];
        showStory(preStory, 'pre', missionBrief);
    }

    function resumeCampaign() {
        const progress = safeRead(PROGRESS_KEY, null);
        if (!progress?.chapterId) {
            startCampaign();
            return;
        }
        const chapter = campaign()?.chapters?.find(item => item.id === progress.chapterId && item.playable !== false)
            || firstPlayableChapter();
        if (!chapter) {
            startCampaign();
            return;
        }
        session.chapter = chapter;
        session.skipAllStory = false;
        resetIncidentStats();
        session.score = Math.max(0, Number(progress.score) || 0);
        session.elapsedMs = Math.max(0, Number(progress.mttrMs) || 0);
        session.wrong = Math.max(0, Number(progress.wrong) || 0);
        session.hints = Math.max(0, Number(progress.hints) || 0);
        session.maxChain = Math.max(0, Number(progress.maxChain) || 0);
        session.chain = session.maxChain;
        session.assisted = Boolean(progress.assisted || progress.status === 'assisted');
        const lastStep = Math.max(0, (chapter.steps?.length || 1) - 1);
        session.stepIndex = ['resolved', 'assisted'].includes(progress.status)
            ? lastStep
            : Math.min(lastStep, Math.max(0, Number(progress.stepIndex) || 0));
        if (['resolved', 'assisted'].includes(progress.status)) {
            (chapter.steps || []).forEach(pinEvidence);
            showReport(true);
        } else if (progress.status === 'failed') {
            showFailureChoices();
        } else {
            missionBrief();
        }
    }

    function returnHome() {
        close({ silent: true });
        window.CodeDropRouter?.navigate?.('ocp');
        window.CodeDropRouter?.apply?.('ocp');
    }

    function onKeyDown(event) {
        if (!session.active) return;
        const modal = !ui.skipDialog?.classList.contains('hidden')
            ? ui.skipDialog
            : (!ui.pauseCard?.classList.contains('hidden') ? ui.pauseCard : null);
        if (trapModalFocus(event, modal)) return;
        if (!ui.skipDialog?.classList.contains('hidden')) {
            if (event.key === 'Escape') {
                event.preventDefault();
                handleSkipChoice('cancel');
            }
            return;
        }
        if (!ui.pauseCard?.classList.contains('hidden')) {
            if (event.key === 'Escape') {
                event.preventDefault();
                resumeGame();
            }
            return;
        }
        if (session.phase === 'story') {
            if (event.key === 'Enter') {
                event.preventDefault();
                nextStoryLine();
            } else if (event.code === 'Space') {
                event.preventDefault();
                fastForwardStory();
            } else if (event.key === 'Escape') {
                event.preventDefault();
                openSkipDialog();
            }
            return;
        }
        if (session.phase === 'assisted') {
            if (event.key === 'Enter') {
                event.preventDefault();
                runAssistedStep(true);
            } else if (event.code === 'Space') {
                event.preventDefault();
                toggleAssistedPause();
            } else if (event.key === 'Escape') {
                event.preventDefault();
                finishAssistedReplay();
            }
            return;
        }
        if (session.phase === 'gameplay' && event.key === 'Escape') {
            event.preventDefault();
            togglePause();
        }
    }

    function onVisibilityChange() {
        if (!session.active || session.phase !== 'gameplay') return;
        if (document.hidden) pauseGame(true);
        else if (session.autoPaused) resumeGame();
    }

    function onLanguageChange() {
        if (!session.active) return;
        applyLanguage();
        if (session.phase === 'options') renderStart();
        else if (session.phase === 'story') {
            stopStoryTyping();
            renderStoryLine();
        } else if (session.phase === 'brief') missionBrief();
        else if (session.phase === 'gameplay') {
            const pendingCommand = ui.input?.value || '';
            renderIncident({ preserveFeedback: true });
            if (ui.input) {
                ui.input.value = pendingCommand;
                ui.input.disabled = session.paused;
            }
        }
        else if (session.phase === 'failure') showFailureChoices();
        else if (session.phase === 'assisted') renderAssistedTranscript();
        else if (session.phase === 'report') showReport(true);
        else if (session.phase === 'teaser') showTeaser();
    }

    function applyLanguage() {
        if (!ui.screen) return;
        ui.screen.setAttribute('aria-label', tx('CODE RED story mode', 'CODE RED 스토리 모드'));
        ui.screen.querySelector('.code-red-hud')?.setAttribute('aria-label', tx('CODE RED status', 'CODE RED 상태'));
        $('code-red-story-options')?.setAttribute('aria-label', tx('Story setting', '스토리 설정'));
        $('code-red-difficulty-options')?.setAttribute('aria-label', tx('CODE RED difficulty', 'CODE RED 난이도'));
        if (ui.startDescription) ui.startDescription.textContent = tx(
            'Read the evidence inside the story and recover OpenShift before the incident hits the impact line.',
            '스토리 속 증거를 읽고 장애가 충돌선에 닿기 전에 OpenShift를 복구하십시오.'
        );
        if (ui.storyLabel) ui.storyLabel.textContent = tx('STORY', '스토리');
        if (ui.difficultyLabel) ui.difficultyLabel.textContent = tx('DIFFICULTY', '난이도');
        if (ui.begin) ui.begin.textContent = tx('BEGIN NIGHT SHIFT', '야간 작전 시작');
        if (ui.exit) ui.exit.textContent = tx('EXIT', '나가기');
        if (ui.storyNext) ui.storyNext.textContent = tx('[ENTER] NEXT', '[ENTER] 다음');
        if (ui.storyFast) ui.storyFast.textContent = tx('[SPACE] FAST FORWARD', '[SPACE] 빠르게 넘기기');
        if (ui.storySkip) ui.storySkip.textContent = tx('[ESC] SKIP SCENE', '[ESC] 장면 스킵');
        if (ui.skipTitle) ui.skipTitle.textContent = tx('SKIP CURRENT SCENE?', '현재 장면을 건너뜁니까?');
        const skipDescription = $('code-red-skip-description');
        if (skipDescription) skipDescription.textContent = tx(
            'Choose whether to skip this scene or every remaining story scene in this run.',
            '현재 장면만 또는 이번 플레이의 남은 모든 스토리를 건너뛸 수 있습니다.'
        );
        const skipScene = ui.skipDialog?.querySelector('[data-code-red-skip="scene"]');
        const skipSession = ui.skipDialog?.querySelector('[data-code-red-skip="session"]');
        const skipCancel = ui.skipDialog?.querySelector('[data-code-red-skip="cancel"]');
        if (skipScene) skipScene.textContent = tx('SKIP THIS SCENE', '이 장면만 스킵');
        if (skipSession) skipSession.textContent = tx('SKIP ALL STORIES THIS RUN', '이번 플레이의 모든 스토리 스킵');
        if (skipCancel) skipCancel.textContent = tx('CANCEL', '취소');
        if (ui.accept) ui.accept.textContent = tx('ACCEPT INCIDENT', '인시던트 수락');
        updateHintLabel();
        if (ui.pause) ui.pause.textContent = tx('PAUSE', '일시정지');
        if (ui.resumeGame) ui.resumeGame.textContent = tx('RESUME', '계속');
        if (ui.retry) ui.retry.textContent = tx('RETRY INCIDENT', '인시던트 재시도');
        if (ui.takeover) ui.takeover.textContent = tx('WATCHER ASSISTED REPLAY', 'WATCHER 보조 리플레이');
        if (ui.assistedPause) ui.assistedPause.textContent = session.assistedPaused ? tx('RESUME', '계속') : tx('PAUSE', '일시정지');
        if (ui.assistedNext) ui.assistedNext.textContent = tx('NEXT STEP', '다음 단계');
        if (ui.assistedSkip) ui.assistedSkip.textContent = tx('SKIP REPLAY', '리플레이 스킵');
        if (ui.continue) ui.continue.textContent = tx('CONTINUE STORY', '스토리 계속');
        if (ui.cleanRetry) ui.cleanRetry.textContent = tx('RETRY FOR CLEAN RESOLVE', '클린 복구 재도전');
        if (ui.replay) ui.replay.textContent = tx('REPLAY INCIDENT', '인시던트 다시 플레이');
        if (ui.home) ui.home.textContent = tx('EXIT TO OCP EDITION', 'OCP EDITION으로 나가기');
        if (ui.teaserHome) ui.teaserHome.textContent = tx('RETURN TO OCP EDITION', 'OCP EDITION으로 돌아가기');
        const briefTerms = ui.brief?.querySelectorAll('dt') || [];
        [tx('NAMESPACE', '네임스페이스'), tx('TARGET', '대상'), tx('SYMPTOM', '증상'), tx('ALERT', '경보')]
            .forEach((label, index) => { if (briefTerms[index]) briefTerms[index].textContent = label; });
        const briefEyebrow = ui.brief?.querySelector('.code-red-eyebrow');
        if (briefEyebrow) briefEyebrow.textContent = tx('MISSION BRIEF // APP-01', '작전 브리핑 // APP-01');
        const pauseTitle = ui.pauseCard?.querySelector('h2');
        const pauseCopy = ui.pauseCard?.querySelector('p');
        if (pauseTitle) pauseTitle.textContent = tx('SYSTEM PAUSED', '시스템 일시정지');
        if (pauseCopy) pauseCopy.textContent = tx('INCIDENT TIMER SUSPENDED', '인시던트 타이머 정지');
        const failureEyebrow = ui.failure?.querySelector('.code-red-eyebrow');
        const failureTitle = ui.failure?.querySelector('h2');
        if (failureEyebrow) failureEyebrow.textContent = tx('INCIDENT ESCALATED', '인시던트 확산');
        if (failureTitle) failureTitle.textContent = tx('SERVICE IMPACT EXPANDED', '서비스 영향 범위 확대');
        const reportEyebrow = ui.report?.querySelector('.code-red-eyebrow');
        if (reportEyebrow) reportEyebrow.textContent = tx('INCIDENT REPORT // APP-01', '인시던트 보고서 // APP-01');
        const postmortemLabels = ui.report?.querySelectorAll('.code-red-postmortem span') || [];
        if (postmortemLabels[0]) postmortemLabels[0].textContent = tx('ROOT CAUSE', '근본 원인');
        if (postmortemLabels[1]) postmortemLabels[1].textContent = tx('OPERATOR LESSON', '오퍼레이터 교훈');
        const reportEvidenceTitle = $('code-red-report-evidence-title');
        if (reportEvidenceTitle) reportEvidenceTitle.textContent = tx('RECOVERY EVIDENCE', '복구 증거');
        const teaserEyebrow = ui.teaser?.querySelector('.code-red-eyebrow');
        if (teaserEyebrow) teaserEyebrow.textContent = tx('NEXT SIGNAL DETECTED', '다음 신호 감지');
        session.terminalLines = session.terminalLines.map(line => /INCIDENT CHANNEL OPEN|인시던트 채널 개방/.test(line)
            ? tx('INCIDENT CHANNEL OPEN // awaiting operator input', '인시던트 채널 개방 // 오퍼레이터 입력 대기')
            : line);
        renderTerminal();
        renderFeedback();
        if (ui.difficultyCopy) ui.difficultyCopy.textContent = difficultyDescription();
        updateHud();
    }

    function bindEvents() {
        if (session.bound) return;
        session.bound = true;
        document.querySelectorAll('[data-code-red-story]').forEach(button => {
            button.addEventListener('click', () => selectStory(button.dataset.codeRedStory === 'on'));
        });
        document.querySelectorAll('[data-code-red-difficulty]').forEach(button => {
            button.addEventListener('click', () => selectDifficulty(button.dataset.codeRedDifficulty));
        });
        document.querySelectorAll('[data-code-red-skip]').forEach(button => {
            button.addEventListener('click', () => handleSkipChoice(button.dataset.codeRedSkip));
        });
        ui.begin?.addEventListener('click', startCampaign);
        ui.resume?.addEventListener('click', resumeCampaign);
        ui.exit?.addEventListener('click', returnHome);
        ui.storyNext?.addEventListener('click', nextStoryLine);
        ui.storyFast?.addEventListener('click', fastForwardStory);
        ui.storySkip?.addEventListener('click', openSkipDialog);
        ui.accept?.addEventListener('click', () => beginIncident({ reset: true }));
        ui.input?.addEventListener('keydown', event => {
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                navigateCommandHistory(-1);
                return;
            }
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                navigateCommandHistory(1);
                return;
            }
            if (event.key === 'Enter') {
                event.preventDefault();
                submitCommand();
            }
        });
        ui.input?.addEventListener('input', event => playSound(null, event.data || 'a'));
        ui.hint?.addEventListener('click', showHint);
        ui.pause?.addEventListener('click', togglePause);
        ui.resumeGame?.addEventListener('click', resumeGame);
        ui.retry?.addEventListener('click', retryIncident);
        ui.takeover?.addEventListener('click', aiTakeover);
        ui.assistedPause?.addEventListener('click', toggleAssistedPause);
        ui.assistedNext?.addEventListener('click', () => runAssistedStep(true));
        ui.assistedSkip?.addEventListener('click', finishAssistedReplay);
        if (ui.continue) ui.continue.onclick = continueStory;
        ui.cleanRetry?.addEventListener('click', retryIncident);
        ui.replay?.addEventListener('click', retryIncident);
        ui.home?.addEventListener('click', returnHome);
        ui.teaserHome?.addEventListener('click', returnHome);
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('codedrop:language', onLanguageChange);
    }

    function open() {
        cacheEls();
        if (!ui.screen) return;
        bindEvents();
        if (!session.active) session.appReturnFocus = document.activeElement;
        stopStoryTyping();
        stopLoop();
        clearScheduled();
        session.assistedTimer = 0;
        session.generation += 1;
        loadPreferences();
        session.active = true;
        session.chapter = firstPlayableChapter();
        session.skipAllStory = false;
        ui.screen.classList.remove('hidden');
        ui.screen.removeAttribute('inert');
        ui.screen.setAttribute('aria-hidden', 'false');
        setAppIsolation(true);
        document.body.classList.add('code-red-active');
        applyLanguage();
        renderStart();
        playSound(null, 'Enter');
    }

    function close(options = {}) {
        const focusTarget = session.appReturnFocus;
        stopStoryTyping();
        stopLoop();
        clearScheduled();
        session.assistedTimer = 0;
        session.generation += 1;
        session.active = false;
        session.phase = 'idle';
        session.paused = false;
        session.autoPaused = false;
        session.startedAt = 0;
        session.lastFrameAt = 0;
        session.storyDone = null;
        session.storyLines = [];
        session.storyIndex = 0;
        session.storyKind = '';
        session.storyFullText = '';
        session.assistedPaused = false;
        session.skipAllStory = false;
        session.returnFocus = null;
        session.appReturnFocus = null;
        session.feedback = null;
        setModalIsolation(ui.story, ui.skipDialog, false);
        setModalIsolation(ui.game, ui.pauseCard, false);
        setModalVisible(ui.skipDialog, false);
        setModalVisible(ui.pauseCard, false);
        ui.incidentCard?.classList.remove('impact', 'resolved', 'accepted', 'rejected');
        ui.input?.classList.remove('rejected');
        ui.game?.classList.remove('impact-danger');
        ui.screen?.classList.add('hidden');
        ui.screen?.setAttribute('inert', '');
        ui.screen?.setAttribute('aria-hidden', 'true');
        setAppIsolation(false);
        document.body.classList.remove('code-red-active');
        const generation = session.generation;
        window.setTimeout(() => {
            if (session.active || generation !== session.generation) return;
            if (focusTarget?.isConnected && typeof focusTarget.focus === 'function') focusTarget.focus({ preventScroll: true });
        }, 0);
        if (!options.silent) playSound(null, 'Escape');
    }

    function debugState() {
        return {
            active: session.active,
            phase: session.phase,
            chapterId: session.chapter?.id || null,
            stepIndex: session.stepIndex,
            position: session.position,
            score: session.score,
            chain: session.chain,
            wrong: session.wrong,
            hints: session.hints,
            assisted: session.assisted,
            assistedIndex: session.assistedIndex,
            evidenceCount: session.pinnedEvidence.length,
            storyEnabled: session.storyEnabled,
            difficulty: session.difficulty
        };
    }

    return {
        open,
        close,
        startCampaign,
        resumeCampaign,
        debugState
    };
})();

window.CodeRedMode = CodeRedMode;
