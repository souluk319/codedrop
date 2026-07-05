/**
 * CodeDrop - Cyberpunk Edition
 * Game Logic
 */

// --- API Config ---
const API_BASE = "";
const README_LANGUAGE_STORAGE_KEY = 'codedrop_readme_language';
const APP_LANGUAGE_STORAGE_KEY = 'codedrop_language';
const MUSIC_UI_STORAGE_KEY = 'codedrop_music_ui';
const KUGNUS_HEALTH_TIMEOUT_MS = 12_000;
const MUSIC_FALLBACK_TRACKS = [
    'KUGNUS X AI SET',
    'SoundCloud playlist queue',
    'Open SoundCloud view for full track list'
];

const I18N_TEXT = {
    en: {
        'auth.login': 'LOGIN',
        'auth.register': 'REGISTER',
        'auth.nickname': 'NICKNAME',
        'auth.password': 'PASSWORD',
        'auth.registerNickname': 'NICKNAME (3-16 chars)',
        'auth.registerPassword': 'PASSWORD (min 4 chars)',
        'auth.confirmPassword': 'CONFIRM PASSWORD',
        'auth.guest': 'GUEST LOGIN',
        'auth.guestNote': 'Guest can play official packs. Pack Maker, saved packs, rankings, and public review require login.',
        'auth.welcome': 'WELCOME, ',
        'auth.logout': 'LOGOUT',
        'auth.loginAction': 'LOGIN',
        'auth.withdraw': 'WITHDRAW',
        'menu.systemDifficulty': 'System Difficulty',
        'menu.selectPack': 'SELECT PACK',
        'menu.selectCartridge': 'SELECT CARTRIDGE',
        'menu.close': 'CLOSE',
        'menu.startCodedrop': 'START CODEDROP',
        'menu.packMaker': 'PACK MAKER',
        'menu.keyTest': 'KEY TEST',
        'menu.topAgents': 'TOP AGENTS',
        'menu.connecting': 'CONNECTING TO SERVER...',
        'difficulty.easy': 'EASY [SAFE_MODE]',
        'difficulty.normal': 'NORMAL [STANDARD]',
        'difficulty.developer': 'DEVELOPER [OVERCLOCK]',
        'ocp.title': 'OCP EDITION',
        'ocp.subtitle': 'EX280 hands-on study deck',
        'ocp.learn': 'LEARN MODE',
        'ocp.learnDesc': 'Start here if you are new — learn EX280 by typing',
        'ocp.dropDesc': 'Falling typing drill for core oc commands',
        'ocp.scenario': 'SCENARIO',
        'ocp.scenarioDesc': '10 situational command questions',
        'ocp.lab': 'MOCK LAB',
        'ocp.labDesc': 'Hands-on procedure training',
        'ocp.exam': 'EXAM',
        'ocp.examDesc': '15 questions · 90 seconds',
        'ocp.learnMode': 'Learn Mode',
        'ocp.loadingCurriculum': 'Loading curriculum...',
        'ocp.cliDropDifficulty': 'CLI Drop Difficulty',
        'ocp.fixedPack': 'Fixed to the OpenShift CLI (EX280) pack.',
        'ocp.scenarioCategory': 'Scenario Category',
        'ocp.mockLab': 'Mock Lab',
        'ocp.examMode': 'Exam Mode',
        'ocp.examInfo': '15 questions across all areas · 90 seconds each · no hints · 70% passing line',
        'ocp.start': 'START OCP',
        'ocp.dashboard': 'Study Dashboard',
        'result.finalScore': 'Final Score',
        'result.maxCombo': 'Max Combo',
        'result.accuracy': 'Accuracy',
        'result.reboot': 'Reboot System',
        'confirm.loginRequired': 'LOGIN REQUIRED',
        'confirm.loginRequiredMessage': '{feature} requires server generation/storage permission. Guests can only play official packs.',
        'confirm.stay': 'STAY',
        'confirm.login': 'LOGIN',
        'confirm.register': 'REGISTER',
        'packMaker.title': 'PACK MAKER',
        'packMaker.subtitle': 'Search-grounded data packs for CODEDROP',
        'packMaker.home': 'HOME',
        'packMaker.inputPlaceholder': 'e.g. Make 50 proper nouns for Linux network commands',
        'packMaker.ask': 'ASK',
        'packMaker.stop': 'STOP',
        'packMaker.packTitle': 'PACK TITLE',
        'packMaker.packDescription': 'PACK DESCRIPTION',
        'packMaker.term': 'TERM',
        'packMaker.desc': 'ONE-LINE DESC',
        'packMaker.source': 'SOURCE',
        'packMaker.addItem': 'ADD ITEM',
        'packMaker.save': 'SAVE MY PACK',
        'packMaker.submit': 'SUBMIT PUBLIC REVIEW',
        'packMaker.guestPreview': 'GUEST PREVIEW MODE',
        'packMaker.loginRequired': 'LOGIN REQUIRED',
        'packMaker.loginNotice': 'Pack Maker generation/save is available after login. Guests can preview the screen and editor flow first.',
        'packMaker.featureName': 'Pack Maker generation/save',
        'packMaker.chatIntro': 'Tell Pack Maker the domain, language, item count, and pack name. It will draft a playable CODEDROP pack.',
        'packMaker.searchResults': 'Using {count} search results as draft grounding.',
        'leaderboard.noData': 'NO DATA FOUND. BE THE FIRST.',
        'leaderboard.customLogin': 'LOGIN REQUIRED FOR CUSTOM PACK RANKING',
        'leaderboard.connectionLost': 'CONNECTION LOST',
        'score.offline': 'OFFLINE MODE. DATA NOT SAVED.',
        'score.uploading': 'UPLOADING DATA...',
        'score.uploadComplete': 'UPLOAD COMPLETE. CHECK RANKING.',
        'score.uploadFailed': 'UPLOAD FAILED.',
        'score.serverError': 'SERVER ERROR. DATA NOT SAVED.'
    },
    ko: {
        'auth.login': '로그인',
        'auth.register': '회원가입',
        'auth.nickname': '닉네임',
        'auth.password': '비밀번호',
        'auth.registerNickname': '닉네임 (3-16자)',
        'auth.registerPassword': '비밀번호 (최소 4자)',
        'auth.confirmPassword': '비밀번호 확인',
        'auth.guest': '비회원 로그인',
        'auth.guestNote': '비회원은 공식 팩 플레이만 가능 · Pack Maker 생성/저장, 랭킹, 공개 심사는 로그인 필요',
        'auth.welcome': '환영합니다, ',
        'auth.logout': '로그아웃',
        'auth.loginAction': '로그인',
        'auth.withdraw': '회원탈퇴',
        'menu.systemDifficulty': '시스템 난이도',
        'menu.selectPack': '팩 선택',
        'menu.selectCartridge': '카트리지 선택',
        'menu.close': '닫기',
        'menu.startCodedrop': 'START CODEDROP',
        'menu.packMaker': 'PACK MAKER',
        'menu.keyTest': 'KEY TEST',
        'menu.topAgents': '상위 요원',
        'menu.connecting': '서버 연결 중...',
        'difficulty.easy': '쉬움 [안전 모드]',
        'difficulty.normal': '보통 [표준]',
        'difficulty.developer': '개발자 [오버클럭]',
        'ocp.title': 'OCP EDITION',
        'ocp.subtitle': 'EX280 실전 학습 덱',
        'ocp.learn': '학습 모드',
        'ocp.learnDesc': '처음이라면 여기부터 — 따라치며 배우는 EX280',
        'ocp.dropDesc': 'OC 핵심 명령 낙하 타자',
        'ocp.scenario': '시나리오',
        'ocp.scenarioDesc': '상황별 명령 10문제',
        'ocp.lab': '모의 랩',
        'ocp.labDesc': '실전 절차 훈련',
        'ocp.exam': '시험 모드',
        'ocp.examDesc': '15문제 · 90초',
        'ocp.learnMode': '학습 모드',
        'ocp.loadingCurriculum': '커리큘럼 로딩...',
        'ocp.cliDropDifficulty': 'CLI 드롭 난이도',
        'ocp.fixedPack': 'OpenShift CLI (EX280) 팩으로 고정됩니다.',
        'ocp.scenarioCategory': '시나리오 카테고리',
        'ocp.mockLab': '모의 랩',
        'ocp.examMode': '시험 모드',
        'ocp.examInfo': '전 영역 15문제 · 문제당 90초 · 힌트 없음 · 합격선 70%',
        'ocp.start': 'START OCP',
        'ocp.dashboard': '학습 대시보드',
        'result.finalScore': '최종 점수',
        'result.maxCombo': '최대 콤보',
        'result.accuracy': '정확도',
        'result.reboot': '시스템 재시작',
        'confirm.loginRequired': '로그인 필요',
        'confirm.loginRequiredMessage': '{feature} 기능은 서버 저장/생성 권한이 필요합니다. 비회원은 공식 팩 플레이만 가능합니다.',
        'confirm.stay': '머무르기',
        'confirm.login': '로그인',
        'confirm.register': '회원가입',
        'packMaker.title': 'PACK MAKER',
        'packMaker.subtitle': '검색 기반 CODEDROP 데이터팩 제작',
        'packMaker.home': 'HOME',
        'packMaker.inputPlaceholder': '예: 리눅스 네트워크 명령어 고유명사 50개 만들어줘',
        'packMaker.ask': 'ASK',
        'packMaker.stop': 'STOP',
        'packMaker.packTitle': '팩 제목',
        'packMaker.packDescription': '팩 설명',
        'packMaker.term': '용어',
        'packMaker.desc': '한줄 설명',
        'packMaker.source': '출처',
        'packMaker.addItem': '항목 추가',
        'packMaker.save': '내 팩 저장',
        'packMaker.submit': '공개 심사 제출',
        'packMaker.guestPreview': '비회원 미리보기 모드',
        'packMaker.loginRequired': '로그인 필요',
        'packMaker.loginNotice': 'Pack Maker 생성/저장은 로그인 후 사용할 수 있습니다. 비회원은 화면과 편집 흐름을 먼저 둘러볼 수 있습니다.',
        'packMaker.featureName': '팩 메이커 생성/저장',
        'packMaker.chatIntro': '도메인, 언어, 개수, 팩 이름을 자연어로 말하세요. 플레이 가능한 CODEDROP 팩 초안으로 정리합니다.',
        'packMaker.searchResults': '검색 결과 {count}개를 draft 근거로 사용합니다.',
        'leaderboard.noData': '기록이 없습니다. 첫 기록을 남겨보세요.',
        'leaderboard.customLogin': '커스텀 팩 랭킹은 로그인 필요',
        'leaderboard.connectionLost': '연결이 끊겼습니다',
        'score.offline': '비회원 모드. 기록은 저장되지 않습니다.',
        'score.uploading': '기록 업로드 중...',
        'score.uploadComplete': '업로드 완료. 랭킹을 확인하세요.',
        'score.uploadFailed': '업로드 실패.',
        'score.serverError': '서버 오류. 기록이 저장되지 않았습니다.'
    }
};

const DIFFICULTY = {
    EASY: { spawnRate: 2500, speedMin: 0.5, speedMax: 1.0, eventChance: 0 },
    NORMAL: { spawnRate: 2000, speedMin: 0.7, speedMax: 1.3, eventChance: 0 },
    DEVELOPER: { spawnRate: 1500, speedMin: 2, speedMax: 3.5, eventChance: 0 }
};

// --- Game State ---

const state = {
    score: 0,
    lives: 3,
    combo: 0,
    maxCombo: 0,
    spawnedCount: 0,
    activeWords: [], // { id, text, x, y, speed, el, isEvent }
    isPlaying: false,
    isPaused: false,
    difficulty: 'NORMAL',
    pack: 'PYTHON',
    startTime: 0,
    totalCharsTyped: 0,
    correctCharsTyped: 0,
    lastInputLength: 0,
    targetId: null, // ID of the word currently being targeted
    lastSpawnTime: 0,
    userId: null, // From API
    userToken: null,
    nickname: ''
};

// --- DOM Elements ---

const els = {
    hud: {
        score: document.getElementById('score'),
        combo: document.getElementById('combo'),
        lives: document.getElementById('lives-display'),
        progress: document.getElementById('progress'),
        diff: document.getElementById('diff-badge'),
        btnPause: document.getElementById('btn-pause'),
        btnHome: document.getElementById('btn-home')
    },
    gameArea: document.getElementById('game-area'),
    input: {
        field: document.getElementById('input-field'),
        target: document.getElementById('target-display')
    },
    screens: {
        start: document.getElementById('start-screen'),
        result: document.getElementById('result-screen'),
        pause: document.getElementById('pause-screen')
    },
    result: {
        title: document.getElementById('result-title'),
        score: document.getElementById('final-score'),
        combo: document.getElementById('final-combo'),
        wpm: document.getElementById('final-wpm'),
        acc: document.getElementById('final-acc'),
        status: document.getElementById('submit-status')
    },
    controls: {
        diffSelect: document.getElementById('difficulty-select'),
        packSelect: document.getElementById('pack-select'),
        packSelector: document.getElementById('pack-selector'),
        packTrigger: document.getElementById('pack-selector-trigger'),
        packCurrentTitle: document.getElementById('pack-current-title'),
        packCurrentChip: document.getElementById('pack-current-chip'),
        packPopover: document.getElementById('pack-popover'),
        packPopoverClose: document.getElementById('pack-popover-close'),
        packCardGroups: document.getElementById('pack-card-groups'),
        packConsole: document.getElementById('pack-console'),
        packConsoleDock: document.getElementById('pack-console-dock'),
        packDockLabel: document.getElementById('pack-dock-label'),
        packConsoleStatusArt: document.getElementById('pack-console-status-art'),
        startBtn: document.getElementById('start-btn'),
        restartBtn: document.getElementById('restart-btn'),
        leaderboard: document.getElementById('leaderboard-list')
    },
    auth: {
        tabs: {
            login: document.getElementById('tab-login'),
            register: document.getElementById('tab-register')
        },
        forms: {
            login: document.getElementById('form-login'),
            register: document.getElementById('form-register')
        },
        inputs: {
            loginNick: document.getElementById('login-nick'),
            loginPass: document.getElementById('login-pass'),
            regNick: document.getElementById('reg-nick'),
            regPass: document.getElementById('reg-pass'),
            regPassConfirm: document.getElementById('reg-pass-confirm')
        },
        btns: {
            login: document.getElementById('btn-login'),
            guest: document.getElementById('btn-guest'),
            register: document.getElementById('btn-register'),
            logout: document.getElementById('btn-logout'),
            withdraw: document.getElementById('btn-withdraw')
        },
        errors: {
            login: document.getElementById('login-error'),
            register: document.getElementById('reg-error')
        },
        loggedInView: document.getElementById('logged-in-view'),
        authContainer: document.getElementById('auth-container'),
        userDisplay: document.getElementById('user-display')
    },
    musicWidget: document.getElementById('music-widget'),
    confirm: {
        screen: document.getElementById('confirm-screen'),
        title: document.getElementById('confirm-title'),
        message: document.getElementById('confirm-message'),
        input: document.getElementById('confirm-input'),
        error: document.getElementById('confirm-error'),
        cancel: document.getElementById('confirm-cancel'),
        ok: document.getElementById('confirm-ok'),
        extra: document.getElementById('confirm-extra')
    }
};

const overlayChromeIds = [
    'result-screen',
    'pause-screen',
    'scenario-screen',
    'lab-screen',
    'dashboard-screen',
    'learn-screen',
    'keyboard-test-screen',
    'confirm-screen',
    'readme-overlay'
];

let overlayChromeObserver = null;
let commandDialogSession = null;
let commandDialogBound = false;
let widgetOverlapCheckAt = 0;
let soundCloudWidget = null;
let soundCloudWidgetBound = false;
let musicPlaying = false;
let appInitialized = false;
const llmStatus = {
    checked: false,
    checking: false,
    ok: null,
    reason: '',
    provider: '',
    route: '',
    model: '',
    promise: null,
    promptedScopes: new Set(),
    fallbackScopes: new Set()
};

function setGameChrome(active) {
    document.body.classList.toggle('game-active', Boolean(active));
}

function isElementVisible(el) {
    return Boolean(el) && !el.classList.contains('hidden') && getComputedStyle(el).display !== 'none';
}

function syncOverlayChrome() {
    const hasOverlay = overlayChromeIds.some(id => isElementVisible(document.getElementById(id)));
    document.body.classList.toggle('overlay-chrome-hidden', hasOverlay);
}

function rectsOverlap(a, b, padding = 4) {
    return a.left < b.right + padding &&
        a.right > b.left - padding &&
        a.top < b.bottom + padding &&
        a.bottom > b.top - padding;
}

function bottomWidgets() {
    return [
        document.getElementById('readme-widget'),
        els.musicWidget
    ].filter(Boolean);
}

function setBottomWidgetsTranslucent(active) {
    bottomWidgets().forEach(widget => widget.classList.toggle('widget-overlap', Boolean(active)));
}

function updateBottomWidgetOverlap(timestamp = 0) {
    if (!state.isPlaying || state.isPaused || state.activeWords.length === 0) {
        setBottomWidgetsTranslucent(false);
        return;
    }

    if (timestamp && timestamp - widgetOverlapCheckAt < 80) return;
    widgetOverlapCheckAt = timestamp || Date.now();

    const widgets = bottomWidgets()
        .filter(widget => getComputedStyle(widget).display !== 'none')
        .map(widget => widget.getBoundingClientRect());
    if (widgets.length === 0) return;

    const overlaps = state.activeWords.some(word => {
        if (!word.el || !word.el.isConnected) return false;
        const wordRect = word.el.getBoundingClientRect();
        return widgets.some(widgetRect => rectsOverlap(wordRect, widgetRect, 8));
    });

    setBottomWidgetsTranslucent(overlaps);
}

function initOverlayChromeObserver() {
    if (overlayChromeObserver) return;

    overlayChromeObserver = new MutationObserver(syncOverlayChrome);
    overlayChromeIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) overlayChromeObserver.observe(el, { attributes: true, attributeFilter: ['class', 'style'] });
    });
    window.syncCodeDropChrome = syncOverlayChrome;
    syncOverlayChrome();
}

function showCommandDialog({
    title,
    message,
    okText = 'CONFIRM',
    cancelText = 'CANCEL',
    extraText = '',
    input = false,
    placeholder = 'PASSWORD',
    danger = false,
    requireValue = false
}) {
    return new Promise(resolve => {
        const c = els.confirm;
        if (!c.screen) {
            resolve({ accepted: false, value: '' });
            return;
        }

        if (commandDialogSession) {
            commandDialogSession.resolve({ accepted: false, value: '' });
        }

        commandDialogSession = { resolve, input, requireValue };
        c.title.textContent = title;
        c.message.textContent = message;
        c.ok.textContent = okText;
        c.cancel.textContent = cancelText || '';
        c.cancel.classList.toggle('hidden', !cancelText);
        if (c.extra) {
            c.extra.textContent = extraText || '';
            c.extra.classList.toggle('hidden', !extraText);
            c.extra.onclick = extraCommandDialog;
        }
        c.input.value = '';
        c.input.placeholder = placeholder;
        c.input.classList.toggle('hidden', !input);
        c.error.textContent = '';
        c.screen.classList.toggle('danger', danger);
        c.ok.onclick = acceptCommandDialog;
        c.cancel.onclick = cancelCommandDialog;
        c.screen.classList.remove('hidden');
        syncOverlayChrome();

        window.setTimeout(() => {
            if (input) c.input.focus();
            else c.ok.focus();
        }, 0);
    });
}

function closeCommandDialog(result) {
    if (!commandDialogSession) return;

    const session = commandDialogSession;
    commandDialogSession = null;
    els.confirm.screen.classList.add('hidden');
    els.confirm.input.value = '';
    els.confirm.error.textContent = '';
    if (els.confirm.extra) {
        els.confirm.extra.textContent = '';
        els.confirm.extra.classList.add('hidden');
    }
    syncOverlayChrome();
    session.resolve(result);
}

function publishLlmStatus() {
    window.dispatchEvent(new CustomEvent('codedrop:llm-status', {
        detail: {
            checked: llmStatus.checked,
            checking: llmStatus.checking,
            ok: llmStatus.ok,
            reason: llmStatus.reason,
            provider: llmStatus.provider,
            route: llmStatus.route,
            model: llmStatus.model
        }
    }));
}

function startKugnusHealthCheck(force = false) {
    if (llmStatus.promise && !force) return llmStatus.promise;

    llmStatus.checked = false;
    llmStatus.checking = true;
    llmStatus.ok = null;
    llmStatus.reason = '';
    llmStatus.provider = '';
    llmStatus.route = '';
    llmStatus.model = '';
    publishLlmStatus();

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), KUGNUS_HEALTH_TIMEOUT_MS + 1000);

    llmStatus.promise = fetch(`${API_BASE}/api/llm/kugnus/health`, {
        signal: controller.signal,
        cache: 'no-store'
    })
        .then(res => res.json().catch(() => ({ ok: false, reason: 'Invalid KUGNUS health response' })))
        .then(data => {
            llmStatus.checked = true;
            llmStatus.checking = false;
            llmStatus.ok = data.ok === true;
            llmStatus.reason = data.reason || '';
            llmStatus.provider = data.provider || '';
            llmStatus.route = data.route || '';
            llmStatus.model = data.model || '';
            return {
                ok: llmStatus.ok,
                reason: llmStatus.reason,
                provider: llmStatus.provider,
                route: llmStatus.route,
                model: llmStatus.model,
                engine: 'kugnus',
                label: 'KUGNUS SERVER'
            };
        })
        .catch(err => {
            llmStatus.checked = true;
            llmStatus.checking = false;
            llmStatus.ok = false;
            llmStatus.reason = err.name === 'AbortError' ? 'KUGNUS health timeout' : err.message;
            llmStatus.provider = '';
            llmStatus.route = '';
            llmStatus.model = '';
            return {
                ok: false,
                reason: llmStatus.reason,
                engine: 'kugnus',
                label: 'KUGNUS SERVER'
            };
        })
        .finally(() => {
            window.clearTimeout(timeout);
            publishLlmStatus();
        });

    return llmStatus.promise;
}

async function maybeSwitchFromOfflineKugnus(scope = 'chat') {
    const status = await startKugnusHealthCheck(true);
    if (status.ok !== false) {
        llmStatus.fallbackScopes.delete(scope);
        llmStatus.promptedScopes.delete(scope);
        return false;
    }
    if (llmStatus.fallbackScopes.has(scope)) return true;
    if (llmStatus.promptedScopes.has(scope)) return false;

    llmStatus.promptedScopes.add(scope);
    const result = await showCommandDialog({
        title: 'KUGNUS SERVER OFFLINE',
        message: 'KUGNUS SERVER 응답이 없습니다. GPT 5.4 MINI로 전환합니다.',
        okText: 'SWITCH',
        cancelText: 'STAY',
        danger: true
    });

    if (!result.accepted) return false;

    llmStatus.fallbackScopes.add(scope);
    window.dispatchEvent(new CustomEvent('codedrop:llm-fallback', {
        detail: { scope, engine: 'openai' }
    }));
    return true;
}

window.CodeDropLlmStatus = {
    startKugnusHealthCheck,
    maybeSwitchFromOfflineKugnus,
    isFallbackScope(scope) {
        return llmStatus.fallbackScopes.has(scope);
    },
    snapshot() {
        return {
            checked: llmStatus.checked,
            checking: llmStatus.checking,
            ok: llmStatus.ok,
            reason: llmStatus.reason,
            provider: llmStatus.provider,
            route: llmStatus.route,
            model: llmStatus.model
        };
    }
};

function acceptCommandDialog() {
    if (!commandDialogSession) return;

    const value = els.confirm.input.value.trim();
    if (commandDialogSession.requireValue && !value) {
        els.confirm.error.textContent = 'PASSWORD REQUIRED';
        els.confirm.input.classList.add('wrong');
        window.setTimeout(() => els.confirm.input.classList.remove('wrong'), 260);
        els.confirm.input.focus();
        return;
    }

    closeCommandDialog({ accepted: true, action: 'ok', value });
}

function cancelCommandDialog() {
    closeCommandDialog({ accepted: false, action: 'cancel', value: '' });
}

function extraCommandDialog() {
    closeCommandDialog({ accepted: true, action: 'extra', value: '' });
}

function initCommandDialog() {
    const c = els.confirm;
    if (commandDialogBound || !c.screen) return;
    commandDialogBound = true;

    c.ok.addEventListener('click', acceptCommandDialog);
    c.cancel.addEventListener('click', cancelCommandDialog);
    if (c.extra) c.extra.addEventListener('click', extraCommandDialog);
    c.screen.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) cancelCommandDialog();
    });
    c.screen.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            cancelCommandDialog();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            acceptCommandDialog();
        }
    });
}

// --- Sound FX (Web Audio API & WAVs) ---
const sfx = {
    ctx: null,
    sounds: {},
    bgm: null,
    loaded: false,
    init: function () {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!this.ctx) {
            this.ctx = new AudioContext();
        } else if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        if (!this.loaded) {
            // Load WAVs
            this.sounds.enter = new Audio('sound/enter.wav');
            this.sounds.backspace = new Audio('sound/backspace2.wav');
            this.sounds.space = new Audio('sound/spacebar.wav');
            this.sounds.space.volume = 0.5;
            this.sounds.key = new Audio('sound/key.wav');
            this.sounds.correct = new Audio('sound/correct_sound.wav');

            this.bgm = new Audio('sound/mainpage_bgm.wav');
            this.bgm.loop = false;
            this.bgm.volume = 0.5;

            this.loaded = true;
        }
    },
    playBGM: function () {
        if (this.bgm) {
            this.bgm.currentTime = 0;
            const promise = this.bgm.play();
            if (promise !== undefined) {
                promise.catch(() => {
                    const playOnInteraction = () => {
                        this.bgm.play().catch(() => { });
                        document.removeEventListener('click', playOnInteraction);
                        document.removeEventListener('touchstart', playOnInteraction);
                        document.removeEventListener('keydown', playOnInteraction);
                    };
                    document.addEventListener('click', playOnInteraction);
                    document.addEventListener('touchstart', playOnInteraction);
                    document.addEventListener('keydown', playOnInteraction);
                });
            }
        }
    },
    playKey: function (key) {
        let sound;
        if (key === 'Enter') sound = this.sounds.enter;
        else if (key === 'Backspace') sound = this.sounds.backspace;
        else if (key === ' ') sound = this.sounds.space;
        else sound = this.sounds.key;

        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(() => { });
        }
    },
    playTone: function (freq, type, duration, vol = 0.1) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },
    playSuccess: function () {
        if (this.sounds.correct) {
            this.sounds.correct.currentTime = 0;
            this.sounds.correct.play().catch(() => { });
        } else {
            // Fallback
            this.playTone(880, 'sine', 0.1, 0.1);
        }
    },
    playFail: function () {
        // Keep existing synth
        this.playTone(150, 'sawtooth', 0.3, 0.1);
        this.playTone(100, 'square', 0.3, 0.1);
    }
};
window.sfx = sfx;

// --- Game Logic ---

function renderLeaderboardMessage(message, color = '#666') {
    els.controls.leaderboard.innerHTML = '';
    const empty = document.createElement('div');
    empty.style.textAlign = 'center';
    empty.style.color = color;
    empty.textContent = message;
    els.controls.leaderboard.appendChild(empty);
}

function customPackIdFromValue(value) {
    const match = String(value || '').match(/^PACK_(\d+)$/);
    return match ? match[1] : null;
}

const PACK_META = {
    PYTHON: { title: 'Python', chip: 'PYTHON', style: 'python' },
    JS: { title: 'JavaScript', chip: 'JS', style: 'js' },
    HTTP: { title: 'Network', chip: 'HTTP', style: 'http' },
    CLI: { title: 'Terminal', chip: 'CLI', style: 'cli' },
    LINUX: { title: 'Linux', chip: 'LINUX', style: 'linux' },
    OC_CORE: { title: 'OpenShift', chip: 'OCP', style: 'oc_core' },
    VOCAB: { title: 'Vocabulary', chip: 'WORDS', style: 'vocab' },
    MIX: { title: 'Mix', chip: 'MIX', style: 'mix' }
};

function selectedPackOption() {
    const select = els.controls.packSelect;
    return select && select.options[select.selectedIndex] ? select.options[select.selectedIndex] : null;
}

function packMetaFromOption(option) {
    if (!option) return PACK_META.PYTHON;
    const value = option.value;
    const official = PACK_META[value];
    if (official) return { value, group: 'Official Packs', ...official };

    const group = option.parentElement && option.parentElement.tagName === 'OPTGROUP'
        ? option.parentElement.label
        : 'Custom Packs';
    const isPublic = /public/i.test(`${option.textContent} ${group}`);
    return {
        value,
        title: option.textContent.replace(/\s+·\s+(PUBLIC|DRAFT|PENDING|APPROVED|REJECTED).*$/i, '').trim() || 'Custom Pack',
        chip: isPublic ? 'PUBLIC' : 'CUSTOM',
        style: 'custom',
        group
    };
}

function packMetaForValue(value) {
    const select = els.controls.packSelect;
    const option = select ? Array.from(select.options).find(opt => opt.value === value) : null;
    return packMetaFromOption(option || selectedPackOption());
}

function packGroupsFromSelect() {
    const select = els.controls.packSelect;
    if (!select) return [];
    const groups = [];
    let official = { label: 'Official Packs', items: [] };

    Array.from(select.children).forEach(child => {
        if (child.tagName === 'OPTION') {
            official.items.push(packMetaFromOption(child));
            return;
        }

        if (child.tagName === 'OPTGROUP') {
            if (official.items.length && !groups.includes(official)) groups.push(official);
            const group = { label: child.label || 'Custom Packs', items: [] };
            Array.from(child.children).forEach(option => group.items.push(packMetaFromOption(option)));
            if (group.items.length) groups.push(group);
        }
    });

    if (official.items.length && !groups.includes(official)) groups.unshift(official);
    return groups.filter(group => group.items.length);
}

function closePackPopover() {
    const controls = els.controls;
    if (!controls.packSelector || !controls.packPopover || !controls.packTrigger) return;
    controls.packSelector.classList.remove('open');
    controls.packPopover.classList.add('hidden');
    controls.packTrigger.setAttribute('aria-expanded', 'false');
}

function openPackPopover() {
    const controls = els.controls;
    if (!controls.packSelector || !controls.packPopover || !controls.packTrigger) return;
    renderPackCards();
    controls.packSelector.classList.add('open');
    controls.packPopover.classList.remove('hidden');
    controls.packTrigger.setAttribute('aria-expanded', 'true');
}

function togglePackPopover() {
    if (!els.controls.packPopover) return;
    if (els.controls.packPopover.classList.contains('hidden')) openPackPopover();
    else closePackPopover();
}

function packLogoText(style) {
    return ({
        python: '',
        js: 'JS',
        http: 'WWW',
        cli: '>_',
        linux: 'LIN',
        oc_core: 'OC',
        vocab: 'Aa',
        mix: 'MIX',
        custom: 'PACK'
    })[style] || 'PACK';
}

function createPackLogo(meta) {
    const logo = document.createElement('span');
    logo.className = `pack-card-logo pack-logo-${meta.style}`;
    logo.setAttribute('aria-hidden', 'true');
    logo.textContent = packLogoText(meta.style);
    if (meta.style === 'python') {
        logo.appendChild(Object.assign(document.createElement('span'), {
            className: 'logo-dot'
        }));
    }
    return logo;
}

function packReadyText(meta) {
    return `${String(meta.title || 'DATA PACK').toUpperCase()} READY`;
}

function playPackLatchSound() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
        const ctx = new AudioContextClass();
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);

        const tick = ctx.createOscillator();
        tick.type = 'triangle';
        tick.frequency.setValueAtTime(980, ctx.currentTime);
        tick.frequency.exponentialRampToValueAtTime(360, ctx.currentTime + 0.035);
        tick.connect(gain);
        tick.start(ctx.currentTime);
        tick.stop(ctx.currentTime + 0.045);

        const latch = ctx.createOscillator();
        latch.type = 'square';
        latch.frequency.setValueAtTime(150, ctx.currentTime + 0.052);
        latch.frequency.exponentialRampToValueAtTime(72, ctx.currentTime + 0.17);
        latch.connect(gain);
        latch.start(ctx.currentTime + 0.052);
        latch.stop(ctx.currentTime + 0.18);

        const body = ctx.createOscillator();
        body.type = 'sine';
        body.frequency.setValueAtTime(58, ctx.currentTime + 0.09);
        body.frequency.exponentialRampToValueAtTime(42, ctx.currentTime + 0.2);
        body.connect(gain);
        body.start(ctx.currentTime + 0.09);
        body.stop(ctx.currentTime + 0.21);

        window.setTimeout(() => ctx.close(), 320);
    } catch (error) {
        // Audio is cosmetic; ignore blocked contexts or unsupported browsers.
    }
}

function createPackCard(meta) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `pack-cartridge pack-style-${meta.style}`;
    card.dataset.packValue = meta.value;
    card.dataset.packCard = 'true';
    card.draggable = true;
    card.setAttribute('aria-label', `${meta.title} pack`);
    let pointerDrag = null;
    let mouseDrag = null;
    let suppressNextClick = false;

    const finishManualDrag = (event, dragState) => {
        card.classList.remove('dragging');
        if (els.controls.packConsole) els.controls.packConsole.classList.remove('drag-ready');
        if (!dragState || !dragState.moved) return false;

        suppressNextClick = true;
        window.setTimeout(() => {
            suppressNextClick = false;
        }, 250);

        const dock = els.controls.packConsoleDock;
        if (!dock) return false;
        const rect = dock.getBoundingClientRect();
        const insideDock = event.clientX >= rect.left
            && event.clientX <= rect.right
            && event.clientY >= rect.top
            && event.clientY <= rect.bottom;
        if (!insideDock) return false;

        event.preventDefault();
        event.stopPropagation();
        selectPackFromUi(meta.value, card);
        return true;
    };

    const clearMouseDrag = () => {
        document.removeEventListener('mousemove', handleMouseMove, true);
        document.removeEventListener('mouseup', handleMouseUp, true);
        mouseDrag = null;
    };

    function handleMouseMove(event) {
        if (!mouseDrag) return;
        const moved = Math.hypot(event.clientX - mouseDrag.startX, event.clientY - mouseDrag.startY);
        if (moved > 8) {
            mouseDrag.moved = true;
            card.classList.add('dragging');
            if (els.controls.packConsole) els.controls.packConsole.classList.add('drag-ready');
            event.preventDefault();
        }
    }

    function handleMouseUp(event) {
        if (!mouseDrag) return;
        const drag = mouseDrag;
        clearMouseDrag();
        finishManualDrag(event, drag);
    }

    const chip = document.createElement('span');
    chip.className = 'pack-card-chip';
    chip.textContent = meta.chip;

    const title = document.createElement('span');
    title.className = 'pack-card-title';
    title.textContent = meta.title;

    card.append(chip, createPackLogo(meta), title);
    card.addEventListener('click', event => {
        if (suppressNextClick) {
            suppressNextClick = false;
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        event.stopPropagation();
        selectPackFromUi(meta.value, card);
    });
    card.addEventListener('pointerdown', event => {
        if (event.button !== undefined && event.button !== 0) return;
        pointerDrag = {
            id: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            moved: false
        };
        if (card.setPointerCapture) {
            try {
                card.setPointerCapture(event.pointerId);
            } catch (error) {
                // Pointer capture is only a drag nicety; native drag still works without it.
            }
        }
    });
    card.addEventListener('mousedown', event => {
        if (event.button !== 0) return;
        mouseDrag = {
            startX: event.clientX,
            startY: event.clientY,
            moved: false
        };
        document.addEventListener('mousemove', handleMouseMove, true);
        document.addEventListener('mouseup', handleMouseUp, true);
    });
    card.addEventListener('pointermove', event => {
        if (!pointerDrag || event.pointerId !== pointerDrag.id) return;
        const moved = Math.hypot(event.clientX - pointerDrag.startX, event.clientY - pointerDrag.startY);
        if (moved > 8) {
            pointerDrag.moved = true;
            card.classList.add('dragging');
            if (els.controls.packConsole) els.controls.packConsole.classList.add('drag-ready');
        }
    });
    card.addEventListener('pointerup', event => {
        if (!pointerDrag || event.pointerId !== pointerDrag.id) return;
        const drag = pointerDrag;
        pointerDrag = null;
        card.classList.remove('dragging');
        if (els.controls.packConsole) els.controls.packConsole.classList.remove('drag-ready');
        finishManualDrag(event, drag);
    });
    card.addEventListener('pointercancel', () => {
        pointerDrag = null;
        clearMouseDrag();
        card.classList.remove('dragging');
        if (els.controls.packConsole) els.controls.packConsole.classList.remove('drag-ready');
    });
    card.addEventListener('dragstart', event => {
        card.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData('text/plain', meta.value);
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    return card;
}

function renderPackCards() {
    const container = els.controls.packCardGroups;
    if (!container) return;
    container.replaceChildren();
    const currentValue = els.controls.packSelect ? els.controls.packSelect.value : '';

    packGroupsFromSelect().forEach(group => {
        const wrap = document.createElement('section');
        wrap.className = 'pack-card-group';

        const title = document.createElement('div');
        title.className = 'pack-card-group-title';
        title.textContent = group.label;

        const grid = document.createElement('div');
        grid.className = 'pack-card-grid';
        group.items.forEach(meta => {
            const card = createPackCard(meta);
            card.classList.toggle('selected', meta.value === currentValue);
            grid.appendChild(card);
        });

        wrap.append(title, grid);
        container.appendChild(wrap);
    });
}

function syncPackSelector() {
    const option = selectedPackOption();
    const meta = packMetaFromOption(option);
    const controls = els.controls;
    if (controls.packCurrentTitle) controls.packCurrentTitle.textContent = meta.title;
    if (controls.packCurrentChip) controls.packCurrentChip.textContent = meta.chip;
    if (controls.packDockLabel) controls.packDockLabel.textContent = meta.chip ? `${meta.chip} DOCK` : 'PACK DOCK';
    if (controls.packConsoleStatusArt && controls.packConsole && !controls.packConsole.classList.contains('pack-inserting')) {
        controls.packConsoleStatusArt.textContent = '';
    }
    if (controls.packConsole) {
        controls.packConsole.dataset.packValue = meta.value || 'PYTHON';
        controls.packConsole.className = `pack-console pack-style-${meta.style}`;
    }
    renderPackCards();
}

function animatePackEquip(meta, sourceEl) {
    const dock = els.controls.packConsoleDock;
    if (!dock || !document.body) return;

    const sourceRect = sourceEl && typeof sourceEl.left === 'number'
        ? sourceEl
        : sourceEl && sourceEl.getBoundingClientRect
        ? sourceEl.getBoundingClientRect()
        : dock.getBoundingClientRect();
    const targetRect = dock.getBoundingClientRect();
    const ghost = document.createElement('div');
    ghost.className = `pack-cartridge pack-cartridge-ghost pack-style-${meta.style}`;
    ghost.appendChild(Object.assign(document.createElement('span'), {
        className: 'pack-card-chip',
        textContent: meta.chip
    }));
    ghost.appendChild(createPackLogo(meta));
    ghost.appendChild(Object.assign(document.createElement('span'), {
        className: 'pack-card-title',
        textContent: meta.title
    }));
    ghost.style.left = `${sourceRect.left}px`;
    ghost.style.top = `${sourceRect.top}px`;
    ghost.style.width = `${sourceRect.width || 160}px`;
    ghost.style.height = `${sourceRect.height || 164}px`;
    ghost.style.minHeight = '0';
    ghost.style.transform = 'scale(1)';
    ghost.style.transition = 'none';
    document.body.appendChild(ghost);
    void ghost.offsetWidth;

    if (els.controls.packConsoleStatusArt) {
        els.controls.packConsoleStatusArt.textContent = packReadyText(meta);
    }

    requestAnimationFrame(() => {
        ghost.style.transition = [
            'left 0.38s cubic-bezier(0.2, 0.9, 0.14, 1)',
            'top 0.38s cubic-bezier(0.2, 0.9, 0.14, 1)',
            'width 0.38s cubic-bezier(0.2, 0.9, 0.14, 1)',
            'height 0.38s cubic-bezier(0.2, 0.9, 0.14, 1)',
            'transform 0.38s cubic-bezier(0.2, 0.9, 0.14, 1)',
            'opacity 0.28s ease',
            'filter 0.28s ease'
        ].join(', ');
        ghost.style.left = `${targetRect.left}px`;
        ghost.style.top = `${targetRect.top}px`;
        ghost.style.width = `${targetRect.width}px`;
        ghost.style.height = `${targetRect.height}px`;
        ghost.style.transform = 'scale(1)';
        window.setTimeout(() => {
            ghost.style.transition = 'filter 0.2s ease';
            ghost.style.transform = 'scale(1)';
            ghost.style.opacity = '0.96';
            ghost.style.filter = 'drop-shadow(0 0 28px rgba(0, 243, 255, 0.95)) brightness(1.45)';
            playPackLatchSound();
            if (els.controls.packConsole) {
                els.controls.packConsole.classList.remove('pack-inserting');
                void els.controls.packConsole.offsetWidth;
                els.controls.packConsole.classList.add('pack-inserting');
            }
        }, 390);
    });

    window.setTimeout(() => {
        ghost.style.transition = 'opacity 0.18s ease, filter 0.18s ease';
        ghost.style.opacity = '0';
        ghost.style.filter = 'drop-shadow(0 0 18px rgba(0, 243, 255, 0.5)) brightness(1.15)';
    }, 1250);
    window.setTimeout(() => ghost.remove(), 1480);
    if (els.controls.packConsole) {
        window.setTimeout(() => {
            els.controls.packConsole.classList.remove('pack-inserting');
            if (els.controls.packConsoleStatusArt) {
                els.controls.packConsoleStatusArt.textContent = '';
            }
        }, 1350);
    }
}

async function selectPackFromUi(value, sourceEl = null) {
    const select = els.controls.packSelect;
    if (!select || !Array.from(select.options).some(option => option.value === value)) return;
    const sourceRect = sourceEl && sourceEl.getBoundingClientRect ? sourceEl.getBoundingClientRect() : null;
    const previousValue = select.value;

    const customPackId = customPackIdFromValue(value);
    if (customPackId && (!Array.isArray(WORD_PACKS[value]) || WORD_PACKS[value].length === 0)) {
        if (!window.PackMaker || typeof window.PackMaker.loadPackDetail !== 'function') {
            select.value = previousValue;
            syncPackSelector();
            renderLeaderboardMessage('CUSTOM PACK LOAD FAILED', 'var(--danger-color)');
            return;
        }
        try {
            await window.PackMaker.loadPackDetail(customPackId);
        } catch (error) {
            select.value = previousValue;
            syncPackSelector();
            renderLeaderboardMessage('CUSTOM PACK LOAD FAILED', 'var(--danger-color)');
            return;
        }
        if (!Array.isArray(WORD_PACKS[value]) || WORD_PACKS[value].length === 0) {
            select.value = previousValue;
            syncPackSelector();
            renderLeaderboardMessage('CUSTOM PACK LOAD FAILED', 'var(--danger-color)');
            return;
        }
    }

    select.value = value;
    const meta = packMetaForValue(value);
    syncPackSelector();
    select.dispatchEvent(new Event('change', { bubbles: true }));
    animatePackEquip(meta, sourceRect || sourceEl);
    window.setTimeout(closePackPopover, 1660);
}

function initPackSelector() {
    const controls = els.controls;
    if (!controls.packSelect || !controls.packSelector || !controls.packTrigger || !controls.packConsole) return;
    controls.packTrigger.addEventListener('click', event => {
        event.stopPropagation();
        togglePackPopover();
    });
    controls.packConsole.addEventListener('click', event => {
        event.stopPropagation();
        openPackPopover();
    });
    controls.packConsole.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openPackPopover();
        }
    });
    if (controls.packPopoverClose) {
        controls.packPopoverClose.addEventListener('click', closePackPopover);
    }
    const packDropTarget = controls.packConsoleDock || controls.packConsole;
    packDropTarget.addEventListener('dragover', event => {
        event.preventDefault();
        controls.packConsole.classList.add('drag-ready');
    });
    packDropTarget.addEventListener('dragleave', () => {
        controls.packConsole.classList.remove('drag-ready');
    });
    packDropTarget.addEventListener('drop', event => {
        event.preventDefault();
        controls.packConsole.classList.remove('drag-ready');
        const value = event.dataTransfer.getData('text/plain');
        const source = controls.packCardGroups && controls.packCardGroups.querySelector(`[data-pack-value="${CSS.escape(value)}"]`);
        selectPackFromUi(value, source);
    });
    document.addEventListener('click', event => {
        if (!controls.packSelector.contains(event.target)) closePackPopover();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closePackPopover();
    });
    controls.packSelect.addEventListener('change', syncPackSelector);
    syncPackSelector();
}

function difficultySelects() {
    return Array.from(document.querySelectorAll('select.difficulty-native-select'));
}

function difficultyPickerFor(select) {
    if (!select || !select.id) return null;
    return document.querySelector(`.difficulty-picker[data-difficulty-for="${CSS.escape(select.id)}"]`);
}

function optionLabel(option) {
    return option ? option.textContent.trim() : '';
}

function syncDifficultyPicker(select) {
    const picker = difficultyPickerFor(select);
    if (!picker) return;

    const current = Array.from(select.options).find(option => option.value === select.value) || select.options[0];
    const main = picker.querySelector('.difficulty-trigger-main');
    const chip = picker.querySelector('.difficulty-trigger-chip');
    const trigger = picker.querySelector('.difficulty-trigger');
    if (main) main.textContent = optionLabel(current);
    if (chip) chip.textContent = current ? current.value : '';
    if (trigger) trigger.setAttribute('aria-label', optionLabel(current));

    picker.querySelectorAll('.difficulty-option').forEach(button => {
        const active = button.dataset.value === select.value;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
}

function closeDifficultyPickers(except = null) {
    document.querySelectorAll('.difficulty-picker.open').forEach(picker => {
        if (except && picker === except) return;
        picker.classList.remove('open');
        const trigger = picker.querySelector('.difficulty-trigger');
        const menu = picker.querySelector('.difficulty-menu');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
        if (menu) menu.classList.add('hidden');
    });
}

function setDifficultyPickerOpen(picker, open) {
    if (!picker) return;
    closeDifficultyPickers(open ? picker : null);
    picker.classList.toggle('open', open);
    const trigger = picker.querySelector('.difficulty-trigger');
    const menu = picker.querySelector('.difficulty-menu');
    if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (menu) menu.classList.toggle('hidden', !open);
}

function renderDifficultyPicker(select) {
    const picker = difficultyPickerFor(select);
    if (!picker) return;
    const menu = picker.querySelector('.difficulty-menu');
    if (!menu) return;

    menu.replaceChildren();
    Array.from(select.options).forEach(option => {
        const button = document.createElement('button');
        button.className = 'difficulty-option';
        button.type = 'button';
        button.role = 'option';
        button.dataset.value = option.value;
        button.textContent = optionLabel(option);
        button.addEventListener('click', event => {
            event.stopPropagation();
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            syncDifficultyPicker(select);
            setDifficultyPickerOpen(picker, false);
        });
        menu.appendChild(button);
    });

    syncDifficultyPicker(select);
}

function refreshDifficultyPickers() {
    difficultySelects().forEach(renderDifficultyPicker);
}

function initDifficultyPickers() {
    difficultySelects().forEach(select => {
        const picker = difficultyPickerFor(select);
        if (!picker || picker.dataset.bound === '1') {
            syncDifficultyPicker(select);
            return;
        }

        picker.dataset.bound = '1';
        const trigger = picker.querySelector('.difficulty-trigger');
        if (trigger) {
            trigger.addEventListener('click', event => {
                event.stopPropagation();
                setDifficultyPickerOpen(picker, !picker.classList.contains('open'));
            });
            trigger.addEventListener('keydown', event => {
                if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setDifficultyPickerOpen(picker, true);
                }
            });
        }

        select.addEventListener('change', () => syncDifficultyPicker(select));
        renderDifficultyPicker(select);
    });

    if (!document.body.dataset.difficultyPickerBound) {
        document.body.dataset.difficultyPickerBound = '1';
        document.addEventListener('click', event => {
            if (!event.target.closest('.difficulty-picker')) closeDifficultyPickers();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') closeDifficultyPickers();
        });
    }
}

window.CodeDropPackSelector = {
    refresh: syncPackSelector,
    render: renderPackCards,
    select: selectPackFromUi
};

function leaderboardSelection() {
    if (isOcpEditionActive()) {
        const ocpDiff = document.getElementById('ocp-difficulty-select');
        return {
            diff: ((ocpDiff && ocpDiff.value) || 'NORMAL').toLowerCase(),
            pack: 'oc_core',
            customPackId: null
        };
    }

    const packValue = els.controls.packSelect.value;
    return {
        diff: els.controls.diffSelect.value.split(' ')[0].toLowerCase(),
        pack: packValue.toLowerCase(),
        customPackId: customPackIdFromValue(packValue)
    };
}

async function fetchLeaderboard() {
    // Only fetch if start screen is visible (optimization)
    if (els.screens.start.classList.contains('hidden')) return;

    try {
        const { diff, pack, customPackId } = leaderboardSelection();
        if (customPackId) {
            if (!state.userToken) {
                renderLeaderboardMessage(t('leaderboard.customLogin'), 'var(--danger-color)');
                return;
            }
            const res = await fetch(`${API_BASE}/api/packs/${customPackId}/leaderboard?difficulty=${diff}`, {
                headers: { 'Authorization': `Bearer ${state.userToken}` }
            });
            const data = await res.json();
            renderLeaderboard(data.top10);
            return;
        }

        const res = await fetch(`${API_BASE}/leaderboard?difficulty=${diff}&pack=${pack}`);
        const data = await res.json();

        renderLeaderboard(data.top10);
    } catch (e) {
        console.error(e);
        renderLeaderboardMessage(t('leaderboard.connectionLost'), 'var(--danger-color)');
    }
}

function updateHUD() {
    els.hud.score.textContent = state.score;
    els.hud.combo.textContent = state.combo;
    els.hud.progress.textContent = `${state.spawnedCount}/100`;

    // Fix: Handle difficulty text with brackets
    const diffKey = state.difficulty.split(' ')[0];
    els.hud.diff.textContent = diffKey;

    let hearts = '';
    for (let i = 0; i < state.lives; i++) hearts += '♥';
    els.hud.lives.textContent = hearts;

    // Update Pause Button Text
    if (els.hud.btnPause) {
        els.hud.btnPause.textContent = state.isPaused ? "RESUME" : "PAUSE";
    }
}

function gameLoop(timestamp) {
    if (!state.isPlaying) return;

    if (state.isPaused) {
        updateBottomWidgetOverlap(timestamp);
        requestAnimationFrame(gameLoop);
        return;
    }

    // Parse difficulty from select value (e.g. "EASY [SAFE_MODE]")
    const diffKey = state.difficulty.split(' ')[0];
    const diffConfig = DIFFICULTY[diffKey];
    const playfieldHeight = els.gameArea.clientHeight;

    // Spawning
    if (state.spawnedCount < 100) {
        if (timestamp - state.lastSpawnTime > diffConfig.spawnRate) {
            spawnWord();
            state.lastSpawnTime = timestamp;
        }
    } else if (state.activeWords.length === 0) {
        // All spawned and all cleared
        gameOver(true);
        return;
    }

    // Update Words. Iterate backwards because handleDrop mutates activeWords.
    for (let index = state.activeWords.length - 1; index >= 0; index--) {
        const word = state.activeWords[index];
        if (!word || !word.el) {
            state.activeWords.splice(index, 1);
            continue;
        }
        word.y += word.speed;
        word.el.style.top = `${word.y}px`;

        // Collision Check (Bottom)
        if (word.y > playfieldHeight - 30) {
            handleDrop(index);
        }
    }

    updateBottomWidgetOverlap(timestamp);
    requestAnimationFrame(gameLoop);
}

function spawnWord() {
    state.spawnedCount++;
    updateHUD();

    const isEvent = [15, 30, 45, 60, 75, 90].includes(state.spawnedCount);

    // Filter pool to exclude currently active words to prevent duplicates
    // Helper to check for symbols (non-alphanumeric, excluding spaces)

    const hasSymbol = (str) => /[^a-zA-Z0-9\s]/.test(str);
    // Helper for Heavy Words (Symbol + >10 chars)
    const isHeavy = (str) => str.length > 10 && hasSymbol(str);

    // Check if any currently active word has a symbol
    const activeHasSymbol = state.activeWords.some(w => hasSymbol(w.text));

    // Filter pool
    let pool = WORD_PACKS[state.pack];
    if (!Array.isArray(pool) || pool.length === 0) {
        console.warn(`Missing word pack: ${state.pack}. Falling back to PYTHON.`);
        state.pack = 'PYTHON';
        pool = WORD_PACKS.PYTHON;
        if (els.controls.packSelect) els.controls.packSelect.value = 'PYTHON';
        syncPackSelector();
    }

    // 1. Exclude currently active words (duplicates)
    const activeTexts = state.activeWords.map(w => w.text);
    let filteredPool = pool.filter(word => !activeTexts.includes(word));

    // 2. Apply Constraints
    if (activeHasSymbol) {
        // If symbol word exists, ONLY allow safe words (no symbols)
        const safePool = filteredPool.filter(word => !hasSymbol(word));
        if (safePool.length > 0) filteredPool = safePool;
    } else {
        // No symbol word active.
        // Check Heavy Word constraint: Only allow heavy words every 10th spawn
        if (state.spawnedCount % 10 !== 0) {
            const noHeavyPool = filteredPool.filter(word => !isHeavy(word));
            if (noHeavyPool.length > 0) filteredPool = noHeavyPool;
        }
    }

    // Use filtered pool if available, otherwise fallback to full pool (rare case)
    if (filteredPool.length > 0) {
        pool = filteredPool;
    }

    const text = pool[Math.floor(Math.random() * pool.length)];
    const diffKey = state.difficulty.split(' ')[0];
    const diffConfig = DIFFICULTY[diffKey];

    // Calculate Speed (Increase by 20% after 50 spawns)
    let baseSpeed = diffConfig.speedMin + Math.random() * (diffConfig.speedMax - diffConfig.speedMin);
    if (state.spawnedCount > 50) {
        baseSpeed *= 1.2;
    }

    const word = {
        id: Date.now() + Math.random(),
        text: text,
        x: Math.random() * 80 + 10, // 10% to 90%
        y: -40,
        speed: baseSpeed,
        isEvent: isEvent,
        el: document.createElement('div')
    };

    // DOM Creation
    word.el.className = 'word-item';
    if (isEvent) word.el.classList.add('event');
    word.el.textContent = text;
    word.el.style.left = `${word.x}%`;
    word.el.style.top = `${word.y}px`;

    els.gameArea.appendChild(word.el);
    state.activeWords.push(word);
}

function handleInput(e) {
    if (!state.isPlaying || state.isPaused) return;

    const inputVal = e.target.value;
    const delta = Math.max(0, inputVal.length - state.lastInputLength);
    state.totalCharsTyped += delta;
    state.lastInputLength = inputVal.length;

    if (inputVal.length === 0) {
        state.targetId = null;
        state.activeWords.forEach(w => w.el.classList.remove('target'));
        updateTargetDisplay('');
        return;
    }

    // 1. Find Target if none
    if (!state.targetId) {
        // Find matching words (prefix match)
        const matches = state.activeWords.filter(w => w.text.startsWith(inputVal));

        if (matches.length > 0) {
            // Pick lowest (largest y)
            matches.sort((a, b) => b.y - a.y);
            const target = matches[0];
            state.targetId = target.id;

            // Highlight
            state.activeWords.forEach(w => w.el.classList.remove('target'));
            target.el.classList.add('target');
        }
    }

    // 2. Validate against Target
    if (state.targetId) {
        const target = state.activeWords.find(w => w.id === state.targetId);

        // If target disappeared (dropped) or input no longer matches prefix
        if (!target || !target.text.startsWith(inputVal)) {
            // Reset target
            state.targetId = null;
            state.activeWords.forEach(w => w.el.classList.remove('target'));

            const matches = state.activeWords.filter(w => w.text.startsWith(inputVal));
            if (matches.length > 0) {
                matches.sort((a, b) => b.y - a.y);
                const nextTarget = matches[0];
                state.targetId = nextTarget.id;
                nextTarget.el.classList.add('target');
                updateTargetDisplay(inputVal, nextTarget.text);
            } else {
                updateTargetDisplay(inputVal);
            }
        } else {
            // Still matching target
            updateTargetDisplay(inputVal, target.text);
        }
    } else {
        updateTargetDisplay(inputVal);
    }
}

function handleKeydown(e) {
    if (!state.isPlaying || state.isPaused) return;

    sfx.playKey(e.key);

    if (e.key === 'Enter') {
        const inputVal = els.input.field.value;

        if (state.targetId) {
            const targetIndex = state.activeWords.findIndex(w => w.id === state.targetId);
            if (targetIndex !== -1) {
                const target = state.activeWords[targetIndex];
                if (target.text === inputVal) {
                    // Success
                    successWord(targetIndex);
                } else {
                    // Typo Enter
                    failTypo();
                }
            }
        } else {
            // Enter with no target or no match
            failTypo();
        }

        // Clear input
        els.input.field.value = '';
        state.lastInputLength = 0;
        updateTargetDisplay('');
        state.targetId = null;
        state.activeWords.forEach(w => w.el.classList.remove('target'));
    }
}

function successWord(index) {
    const word = state.activeWords[index];

    // Score
    const points = word.isEvent ? 50 : 10;
    state.combo++;
    if (state.combo > state.maxCombo) state.maxCombo = state.combo;

    const bonus = Math.min(state.combo, 10);
    state.score += points + bonus;

    state.correctCharsTyped += word.text.length;

    // Play Success Sound
    sfx.playSuccess();

    // Remove
    word.el.classList.add('matched');
    setTimeout(() => {
        if (word.el.parentNode) word.el.parentNode.removeChild(word.el);
    }, 200);

    state.activeWords.splice(index, 1);
    updateHUD();

    showDescToast(word.text);
}

// --- Desc Toast (명령어 한줄 설명) ---
let descToastTimer = null;

function showDescToast(text) {
    if (typeof WORD_DESCS === 'undefined' || !WORD_DESCS[text]) return;

    // startGame()이 gameArea.innerHTML = '' 로 비우므로 없으면 재생성
    let toast = document.getElementById('desc-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'desc-toast';
        els.gameArea.appendChild(toast);
    }

    toast.innerHTML = `<span class="cmd"></span> &nbsp;→&nbsp; <span class="desc"></span>`;
    toast.querySelector('.cmd').textContent = text;
    toast.querySelector('.desc').textContent = WORD_DESCS[text];
    toast.classList.add('show');

    clearTimeout(descToastTimer);
    descToastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

function failTypo() {
    // Play Fail Sound
    sfx.playFail();

    state.score = Math.max(0, state.score - 5);
    state.combo = 0;
    updateHUD();

    // Shake input
    els.input.field.classList.add('error');
    setTimeout(() => els.input.field.classList.remove('error'), 300);
}

function updateTargetDisplay(input, fullText = '') {
    if (!fullText) {
        els.input.target.textContent = '';
        return;
    }

    // Highlight matched part
    const matched = fullText.substring(0, input.length);
    const rest = fullText.substring(input.length);

    els.input.target.innerHTML = `<span class="match">${matched}</span><span class="rest">${rest}</span>`;
}


function handleDrop(index) {
    const word = state.activeWords[index];
    if (!state.isPlaying || !word) return;

    // Remove from DOM
    if (word.el.parentNode) word.el.parentNode.removeChild(word.el);

    // Remove from array
    state.activeWords.splice(index, 1);

    // Reset Target if dropped
    if (state.targetId === word.id) {
        state.targetId = null;
        updateTargetDisplay('');
    }

    // Logic
    state.lives--;
    state.combo = 0;
    updateHUD();

    // Visual Feedback
    els.hud.lives.style.opacity = 0.5;
    setTimeout(() => els.hud.lives.style.opacity = 1, 200);

    if (state.lives <= 0) {
        gameOver(false);
    }
}

async function gameOver(victory = false) {
    if (!state.isPlaying && !els.screens.result.classList.contains('hidden')) return;

    state.isPlaying = false;
    state.isPaused = false;
    setGameChrome(false);
    setBottomWidgetsTranslucent(false);
    state.targetId = null;
    state.lastInputLength = 0;
    els.input.field.value = '';
    els.input.field.disabled = true;
    updateTargetDisplay('');
    state.activeWords.forEach(word => {
        if (!word) return;
        if (word.el && word.el.parentNode) word.el.parentNode.removeChild(word.el);
    });
    state.activeWords = [];

    // Calculate Stats
    const durationMin = (Date.now() - state.startTime) / 60000;
    const wpm = durationMin > 0 ? Math.round((state.correctCharsTyped / 5) / durationMin) : 0;
    const rawAccuracy = state.totalCharsTyped > 0 ? Math.round((state.correctCharsTyped / state.totalCharsTyped) * 100) : 0;
    const accuracy = Math.max(0, Math.min(100, rawAccuracy));

    // Update Result Screen
    els.result.title.textContent = victory ? "MISSION COMPLETE" : "SYSTEM FAILURE";
    els.result.title.style.color = victory ? "var(--success-color)" : "var(--danger-color)";
    els.result.title.style.textShadow = victory ? "0 0 20px var(--success-color)" : "0 0 20px var(--danger-color)";

    els.result.score.textContent = state.score;
    els.result.combo.textContent = state.maxCombo;
    els.result.wpm.textContent = wpm;
    els.result.acc.textContent = accuracy + "%";

    els.screens.result.classList.remove('hidden');
    syncOverlayChrome();

    // Submit Score
    if (state.userToken) {
        els.result.status.textContent = t('score.uploading');
        try {
            const customPackId = customPackIdFromValue(state.pack);
            const endpoint = customPackId
                ? `${API_BASE}/api/packs/${customPackId}/submit-score`
                : `${API_BASE}/submit`;
            const body = customPackId
                ? {
                    score: state.score,
                    wpm: wpm,
                    accuracy: accuracy,
                    difficulty: state.difficulty.toLowerCase()
                }
                : {
                    score: state.score,
                    wpm: wpm,
                    accuracy: accuracy,
                    difficulty: state.difficulty.toLowerCase(),
                    pack: state.pack.toLowerCase()
                };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.userToken}`
                },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (data.ok) {
                els.result.status.textContent = t('score.uploadComplete');
            } else {
                els.result.status.textContent = t('score.uploadFailed');
            }
        } catch (e) {
            console.error(e);
            els.result.status.textContent = t('score.serverError');
        }
    } else {
        els.result.status.textContent = t('score.offline');
    }
}

function renderLeaderboard(list) {
    els.controls.leaderboard.innerHTML = '';

    if (!list || list.length === 0) {
        renderLeaderboardMessage(t('leaderboard.noData'));
        return;
    }

    const table = document.createElement('table');
    const headRow = document.createElement('tr');
    ['RANK', 'AGENT', 'SCORE', 'WPM'].forEach((label, index) => {
        const th = document.createElement('th');
        th.textContent = label;
        if (index >= 2) th.style.textAlign = 'right';
        headRow.appendChild(th);
    });
    table.appendChild(headRow);

    list.forEach((item, index) => {
        const rank = index + 1;
        const rankClass = rank <= 3 ? `rank-${rank}` : '';

        const row = document.createElement('tr');
        const rankCell = document.createElement('td');
        rankCell.textContent = `#${rank}`;
        rankCell.style.fontWeight = 'bold';
        if (rankClass) rankCell.className = rankClass;

        const nameCell = document.createElement('td');
        nameCell.textContent = String(item.nickname || 'unknown');
        nameCell.style.color = 'var(--primary-neon)';
        if (rank <= 3) {
            nameCell.style.fontWeight = 'bold';
            nameCell.style.fontSize = '1.1em';
        }

        const scoreCell = document.createElement('td');
        scoreCell.textContent = String(Number(item.score) || 0);
        scoreCell.style.textAlign = 'right';
        scoreCell.style.fontFamily = 'var(--font-code)';
        scoreCell.style.color = '#fff';

        const wpmCell = document.createElement('td');
        wpmCell.textContent = String(Number(item.wpm) || 0);
        wpmCell.style.textAlign = 'right';
        wpmCell.style.fontFamily = 'var(--font-code)';
        wpmCell.style.color = '#888';

        row.append(rankCell, nameCell, scoreCell, wpmCell);
        table.appendChild(row);
    });

    els.controls.leaderboard.appendChild(table);
}



// --- Mode Routing (DROP / SCENARIO / LAB / EXAM) ---
let gameMode = 'DROP';
let editionBurstTimer = null;

function isOcpEditionActive() {
    return document.body.classList.contains('ocp-edition');
}

function triggerEditionBurst() {
    document.body.classList.remove('edition-burst');
    // Reflow so repeated edition switches replay the one-shot CSS animation.
    void document.body.offsetWidth;
    document.body.classList.add('edition-burst');

    clearTimeout(editionBurstTimer);
    editionBurstTimer = setTimeout(() => {
        document.body.classList.remove('edition-burst');
    }, 760);
}

function handleStart() {
    if (gameMode === 'LEARN') {
        els.screens.start.classList.add('hidden');
        LearnMode.openPicker();
    } else if (gameMode === 'SCENARIO') {
        const catSelect = document.getElementById('scenario-category-select');
        els.screens.start.classList.add('hidden');
        ScenarioMode.start(catSelect.value);
    } else if (gameMode === 'LAB') {
        const labSelect = document.getElementById('lab-select');
        els.screens.start.classList.add('hidden');
        LabMode.start(labSelect.value);
    } else if (gameMode === 'EXAM') {
        els.screens.start.classList.add('hidden');
        ScenarioMode.startExam();
    } else {
        if (isOcpEditionActive()) {
            const ocpDiff = document.getElementById('ocp-difficulty-select');
            if (ocpDiff) els.controls.diffSelect.value = ocpDiff.value;
            els.controls.packSelect.value = 'OC_CORE';
            syncPackSelector();
        }
        startGame();
    }
}

function initModeControls() {
    const modeButtons = Array.from(document.querySelectorAll('[data-mode]'));
    const catSelect = document.getElementById('scenario-category-select');
    const labSelect = document.getElementById('lab-select');
    const standardMenu = document.getElementById('standard-menu');
    const ocpMenu = document.getElementById('ocp-menu');
    const editionCodeBtn = document.getElementById('edition-code-btn');
    const editionOcpBtn = document.getElementById('edition-ocp-btn');
    const ocpDiffSelect = document.getElementById('ocp-difficulty-select');
    const ocpStartBtn = document.getElementById('ocp-start-btn');
    const dashboardBtn = document.getElementById('dashboard-btn');
    const modeGroups = {
        LEARN: ['learn-info-group'],
        DROP: ['ocp-drop-group'],
        SCENARIO: ['scenario-select-group'],
        LAB: ['lab-select-group'],
        EXAM: ['exam-info-group']
    };

    if (modeButtons.length === 0) return;
    initDifficultyPickers();

    // 카테고리 옵션을 SCENARIO_PACKS에서 자동 생성
    if (typeof SCENARIO_PACKS !== 'undefined' && catSelect && catSelect.options.length === 0) {
        Object.entries(SCENARIO_PACKS).forEach(([key, pack]) => {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = pack.label;
            catSelect.appendChild(opt);
        });
    }

    if (typeof MOCK_LABS !== 'undefined' && labSelect && labSelect.options.length === 0) {
        MOCK_LABS.forEach((lab, index) => {
            const opt = document.createElement('option');
            opt.value = lab.id;
            opt.textContent = `${String(index + 1).padStart(2, '0')}. ${lab.title}`;
            labSelect.appendChild(opt);
        });
    }

    function setMode(mode) {
        gameMode = mode;
        modeButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));

        Object.entries(modeGroups).forEach(([groupMode, ids]) => {
            ids.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.toggle('hidden', groupMode !== mode);
            });
        });

        // 학습 모드: 커리큘럼 진행도 문구 갱신
        if (mode === 'LEARN' && typeof LearnMode !== 'undefined') {
            const info = document.getElementById('learn-info-text');
            if (info) {
                const p = LearnMode.progress();
                info.textContent = p.next
                    ? `${p.done}/${p.total} 레슨 완료 · 다음: ${p.next.title}`
                    : `커리큘럼 완주! ${p.done}/${p.total} 레슨 완료`;
            }
        }

        // 시험 모드 소프트 게이트 (비차단 권장 문구)
        if (mode === 'EXAM' && typeof LearnMode !== 'undefined' && typeof StudyStats !== 'undefined') {
            const gate = document.getElementById('exam-gate-note');
            if (gate) {
                const p = LearnMode.progress();
                const examCount = (StudyStats.get().exams || []).length;
                const show = p.total > 0 && p.done / p.total < 0.3 && examCount === 0;
                gate.classList.toggle('hidden', !show);
                if (show) {
                    gate.textContent = `커리큘럼 ${p.done}/${p.total} — 학습 모드를 먼저 도는 것을 권장합니다.`;
                }
            }
        }
    }

    function openOcpEdition() {
        if (isOcpEditionActive()) return;
        document.body.classList.add('ocp-edition');
        triggerEditionBurst();
        if (standardMenu) standardMenu.classList.add('hidden');
        if (ocpMenu) ocpMenu.classList.remove('hidden');
        if (editionCodeBtn) editionCodeBtn.classList.remove('active');
        if (editionOcpBtn) editionOcpBtn.classList.add('active');
        setMode('DROP');
        fetchLeaderboard();
    }

    function closeOcpEdition() {
        if (!isOcpEditionActive()) return;
        triggerEditionBurst();
        document.body.classList.remove('ocp-edition');
        if (ocpMenu) ocpMenu.classList.add('hidden');
        if (standardMenu) standardMenu.classList.remove('hidden');
        if (editionOcpBtn) editionOcpBtn.classList.remove('active');
        if (editionCodeBtn) editionCodeBtn.classList.add('active');
        setMode('DROP');
        fetchLeaderboard();
    }

    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });

    if (editionOcpBtn) {
        editionOcpBtn.addEventListener('click', openOcpEdition);
    }

    if (editionCodeBtn) {
        editionCodeBtn.addEventListener('click', closeOcpEdition);
    }

    if (ocpStartBtn) {
        ocpStartBtn.addEventListener('click', handleStart);
    }

    if (dashboardBtn) {
        dashboardBtn.addEventListener('click', () => Dashboard.open());
    }

    if (els.controls.diffSelect) {
        els.controls.diffSelect.addEventListener('change', fetchLeaderboard);
    }
    if (els.controls.packSelect) {
        els.controls.packSelect.addEventListener('change', fetchLeaderboard);
    }
    if (ocpDiffSelect) {
        ocpDiffSelect.addEventListener('change', fetchLeaderboard);
    }

    setMode(gameMode);
}

async function ensureSelectedPackReady(pack) {
    const customPackId = customPackIdFromValue(pack);
    if (!customPackId) return true;
    if (Array.isArray(WORD_PACKS[pack]) && WORD_PACKS[pack].length > 0) return true;

    if (!state.userToken) {
        renderLeaderboardMessage(t('leaderboard.customLogin'), 'var(--danger-color)');
        return false;
    }

    if (!window.PackMaker || typeof window.PackMaker.loadPackDetail !== 'function') {
        renderLeaderboardMessage('CUSTOM PACK LOAD FAILED', 'var(--danger-color)');
        return false;
    }

    try {
        await window.PackMaker.loadPackDetail(customPackId);
    } catch (error) {
        renderLeaderboardMessage('CUSTOM PACK LOAD FAILED', 'var(--danger-color)');
        return false;
    }

    return Array.isArray(WORD_PACKS[pack]) && WORD_PACKS[pack].length > 0;
}

async function startGame() {
    // Validate
    const diff = els.controls.diffSelect.value;
    const pack = els.controls.packSelect.value;
    if (!await ensureSelectedPackReady(pack)) return;

    state.difficulty = diff;
    state.pack = pack;
    setBottomWidgetsTranslucent(false);

    // UI Reset
    els.screens.start.classList.add('hidden');
    els.screens.pause.classList.add('hidden');
    els.screens.result.classList.add('hidden');
    setGameChrome(true);
    syncOverlayChrome();
    els.gameArea.innerHTML = ''; // Clear words
    els.input.field.value = '';
    state.lastInputLength = 0;
    els.input.field.disabled = false;
    els.input.field.focus();
    updateTargetDisplay('');
    els.hud.btnPause.textContent = "PAUSE";

    // State Reset
    state.isPlaying = true;
    state.isPaused = false;
    state.score = 0;
    state.lives = 3;
    state.combo = 0;
    state.maxCombo = 0;
    state.spawnedCount = 0;
    state.activeWords = [];
    state.startTime = Date.now();
    state.lastSpawnTime = performance.now();
    state.totalCharsTyped = 0;
    state.correctCharsTyped = 0;
    state.targetId = null;

    updateHUD();

    // Start Loop
    requestAnimationFrame(gameLoop);

    // Play BGM
    // // sfx.playBGM();
}

function togglePause() {
    if (!state.isPlaying) return;

    state.isPaused = !state.isPaused;

    if (state.isPaused) {
        els.hud.btnPause.textContent = "PLAY";
        els.screens.pause.classList.remove('hidden');
        els.input.field.disabled = true;
    } else {
        els.hud.btnPause.textContent = "PAUSE";
        els.screens.pause.classList.add('hidden');
        els.input.field.disabled = false;
        els.input.field.focus();
        state.lastSpawnTime = performance.now();
    }
    syncOverlayChrome();
}

async function goHome() {
    const result = await showCommandDialog({
        title: 'ABORT MISSION?',
        message: '현재 낙하 세션을 종료하고 시작 화면으로 돌아갑니다. 진행 중인 점수는 저장되지 않습니다.',
        okText: 'ABORT',
        cancelText: 'STAY',
        danger: true
    });

    if (!result.accepted) return;

    state.isPlaying = false;
    state.isPaused = false;
    setGameChrome(false);
    setBottomWidgetsTranslucent(false);
    els.screens.pause.classList.add('hidden');
    els.screens.result.classList.add('hidden');
    els.screens.start.classList.remove('hidden');
    els.input.field.value = '';
    els.input.field.disabled = true;
    updateTargetDisplay('');
    state.targetId = null;
    state.lastInputLength = 0;

    // Clear game area
    els.gameArea.innerHTML = '';
    state.activeWords = [];

    fetchLeaderboard();
    initGameControls();
    syncOverlayChrome();
    // sfx.playBGM();
}

// Add Listeners for Game Controls

// Named handlers to prevent duplicates
function handleRestart() {
    els.screens.result.classList.add('hidden');
    els.screens.start.classList.remove('hidden');
    setGameChrome(false);
    els.input.field.value = '';
    els.input.field.disabled = true;
    updateTargetDisplay('');
    state.targetId = null;
    state.lastInputLength = 0;
    fetchLeaderboard();
    syncOverlayChrome();
    // sfx.playBGM();
}

function normalizeMusicUi(value) {
    return value === 'legacy' ? 'legacy' : 'island';
}

function preferredMusicUi() {
    return normalizeMusicUi(localStorage.getItem(MUSIC_UI_STORAGE_KEY) || els.musicWidget?.dataset.playerUi);
}

function setMusicStatus(text) {
    const status = document.getElementById('music-status');
    if (status) status.textContent = text;
}

function setMusicNowTitle(text) {
    const title = document.getElementById('music-now-title');
    if (title) title.textContent = text || MUSIC_FALLBACK_TRACKS[0];
}

function renderMusicTrackList(tracks = MUSIC_FALLBACK_TRACKS, activeTitle = tracks[0]) {
    const list = document.getElementById('music-track-list');
    if (!list) return;

    list.replaceChildren();
    tracks.slice(0, 8).forEach((track, index) => {
        const title = typeof track === 'string' ? track : track?.title;
        const item = document.createElement('div');
        item.className = 'music-track-item';
        if (title === activeTitle || index === 0) item.classList.add('active');

        const number = document.createElement('span');
        number.className = 'music-track-index';
        number.textContent = String(index + 1).padStart(2, '0');

        const label = document.createElement('span');
        label.textContent = title || `Track ${index + 1}`;

        item.append(number, label);
        list.appendChild(item);
    });
}

function updateSoundCloudMetadata() {
    renderMusicTrackList(MUSIC_FALLBACK_TRACKS, MUSIC_FALLBACK_TRACKS[0]);
    setMusicNowTitle(MUSIC_FALLBACK_TRACKS[0]);

    if (!soundCloudWidget) return;

    try {
        if (typeof soundCloudWidget.getCurrentSound === 'function') {
            soundCloudWidget.getCurrentSound(sound => {
                const title = sound?.title || MUSIC_FALLBACK_TRACKS[0];
                setMusicNowTitle(title);
                setMusicStatus(title);
            });
        }

        if (typeof soundCloudWidget.getSounds === 'function') {
            soundCloudWidget.getSounds(sounds => {
                if (!Array.isArray(sounds) || sounds.length === 0) return;
                const titles = sounds.map(sound => sound?.title).filter(Boolean);
                if (titles.length) renderMusicTrackList(titles, titles[0]);
            });
        }
    } catch (error) {
        renderMusicTrackList(MUSIC_FALLBACK_TRACKS, MUSIC_FALLBACK_TRACKS[0]);
    }
}

function setMusicPlayback(active) {
    musicPlaying = Boolean(active);
    if (els.musicWidget) els.musicWidget.classList.toggle('is-playing', musicPlaying);

    const playToggle = document.getElementById('music-play-toggle');
    if (playToggle) {
        const label = musicPlaying ? 'Pause music' : 'Play music';
        playToggle.setAttribute('aria-label', label);
        playToggle.title = label;
    }
}

function syncMusicUiControls(mode = preferredMusicUi()) {
    const normalized = normalizeMusicUi(mode);
    const uiToggle = document.getElementById('music-ui-toggle');
    if (uiToggle) {
        const label = normalized === 'legacy' ? 'Return to island player' : 'Open SoundCloud player view';
        uiToggle.setAttribute('aria-label', label);
        uiToggle.title = label;
    }
    setMusicPlayback(musicPlaying);
}

function initSoundCloudWidget() {
    if (soundCloudWidgetBound) return soundCloudWidget;

    const iframe = document.getElementById('soundcloud-player');
    if (!iframe || !window.SC || !window.SC.Widget) {
        setMusicStatus('SOUNDCLOUD LINK READY');
        return null;
    }

    try {
        soundCloudWidget = window.SC.Widget(iframe);
        const events = window.SC.Widget.Events || {};
        if (events.READY) soundCloudWidget.bind(events.READY, updateSoundCloudMetadata);
        if (events.PLAY) soundCloudWidget.bind(events.PLAY, () => {
            setMusicPlayback(true);
            setMusicStatus('STREAMING KUGNUS X AI');
            updateSoundCloudMetadata();
        });
        if (events.PAUSE) soundCloudWidget.bind(events.PAUSE, () => {
            setMusicPlayback(false);
            setMusicStatus('KUGNUS X AI STREAM');
        });
        if (events.FINISH) soundCloudWidget.bind(events.FINISH, () => {
            setMusicPlayback(false);
            setMusicStatus('STREAM COMPLETE');
        });
        soundCloudWidgetBound = true;
        setMusicStatus('SOUNDCLOUD READY');
        updateSoundCloudMetadata();
    } catch (error) {
        soundCloudWidget = null;
        setMusicStatus('SOUNDCLOUD LINK READY');
    }

    return soundCloudWidget;
}

function openMusicWidget(mode = preferredMusicUi()) {
    if (!els.musicWidget) return;

    const normalized = normalizeMusicUi(mode);
    els.musicWidget.dataset.playerUi = normalized;
    els.musicWidget.classList.remove('closed', 'open', 'legacy-open', 'island-open', 'track-open', 'track-list-open');

    if (normalized === 'legacy') {
        els.musicWidget.classList.add('open', 'legacy-open');
    } else {
        els.musicWidget.classList.add('island-open');
    }

    initSoundCloudWidget();
    updateSoundCloudMetadata();
    syncMusicUiControls(normalized);
}

function closeMusicWidget() {
    if (!els.musicWidget) return;
    els.musicWidget.classList.remove('open', 'legacy-open', 'island-open', 'track-open', 'track-list-open');
    els.musicWidget.classList.add('closed');
}

function switchMusicWidgetUi() {
    if (!els.musicWidget) return;
    const nextMode = els.musicWidget.classList.contains('legacy-open') ? 'island' : 'legacy';
    localStorage.setItem(MUSIC_UI_STORAGE_KEY, nextMode);
    openMusicWidget(nextMode);
    sfx.playKey('Tab');
}

function toggleMusicDetails() {
    if (!els.musicWidget || !els.musicWidget.classList.contains('island-open')) return;
    const willOpen = !els.musicWidget.classList.contains('track-open');
    els.musicWidget.classList.toggle('track-open', willOpen);
    if (!willOpen) els.musicWidget.classList.remove('track-list-open');

    const detailToggle = document.getElementById('music-detail-toggle');
    if (detailToggle) {
        detailToggle.setAttribute('aria-label', willOpen ? 'Collapse music details' : 'Expand music details');
    }

    if (willOpen) updateSoundCloudMetadata();
    sfx.playKey('Tab');
}

function toggleMusicTrackList() {
    if (!els.musicWidget || !els.musicWidget.classList.contains('island-open')) return;
    els.musicWidget.classList.add('track-open');
    els.musicWidget.classList.toggle('track-list-open');
    updateSoundCloudMetadata();
    sfx.playKey('Tab');
}

function toggleMusicPlayback() {
    const widget = initSoundCloudWidget();

    if (widget && typeof widget.play === 'function' && typeof widget.pause === 'function') {
        if (musicPlaying) {
            widget.pause();
        } else {
            widget.play();
        }
        return;
    }

    setMusicPlayback(!musicPlaying);
    setMusicStatus(musicPlaying ? 'STREAMING KUGNUS X AI' : 'SOUNDCLOUD LINK READY');
}

function initMusicWidgetPreference() {
    if (!els.musicWidget) return;
    const mode = preferredMusicUi();
    els.musicWidget.dataset.playerUi = mode;
    syncMusicUiControls(mode);
    renderMusicTrackList();
}

function handleMusicWidgetClick(e) {
    const action = e.target.closest('[data-music-action]')?.dataset.musicAction;

    if (action === 'close') {
        e.stopPropagation();
        closeMusicWidget();
        return;
    }

    if (action === 'toggle') {
        e.stopPropagation();
        toggleMusicPlayback();
        return;
    }

    if (action === 'switch-ui') {
        e.stopPropagation();
        switchMusicWidgetUi();
        return;
    }

    if (action === 'details') {
        e.stopPropagation();
        toggleMusicDetails();
        return;
    }

    if (action === 'track-list') {
        e.stopPropagation();
        toggleMusicTrackList();
        return;
    }

    if (els.musicWidget.classList.contains('closed')) {
        openMusicWidget(preferredMusicUi());
    }
}

function handleReadmeWidgetClick() {
    const readmeOverlay = document.getElementById('readme-overlay');
    if (!readmeOverlay) return;
    readmeOverlay.classList.remove('hidden');
    sfx.playKey('Enter');
}

function handleReadmeCloseClick() {
    const readmeOverlay = document.getElementById('readme-overlay');
    if (readmeOverlay) readmeOverlay.classList.add('hidden');
}

function handleReadmeOverlayClick(e) {
    if (e.target === e.currentTarget) {
        e.currentTarget.classList.add('hidden');
    }
}

function normalizeReadmeLanguage(value) {
    return value === 'ko' ? 'ko' : 'en';
}

function appLang() {
    return normalizeReadmeLanguage(
        localStorage.getItem(APP_LANGUAGE_STORAGE_KEY) ||
        localStorage.getItem(README_LANGUAGE_STORAGE_KEY) ||
        'en'
    );
}

function t(key, replacements = {}) {
    const lang = appLang();
    let text = (I18N_TEXT[lang] && I18N_TEXT[lang][key]) || I18N_TEXT.en[key] || key;
    Object.entries(replacements).forEach(([name, value]) => {
        text = text.replaceAll(`{${name}}`, value);
    });
    return text;
}

function setText(selector, key) {
    const el = document.querySelector(selector);
    if (el) el.textContent = t(key);
}

function setPlaceholder(selector, key) {
    const el = document.querySelector(selector);
    if (el) el.placeholder = t(key);
}

function setOptionText(selector, key) {
    document.querySelectorAll(selector).forEach(option => {
        option.textContent = t(key);
    });
}

function updateWelcomeText() {
    const welcome = document.querySelector('.welcome-msg');
    if (welcome && welcome.firstChild) {
        welcome.firstChild.nodeValue = t('auth.welcome');
    }
}

function applyAppLanguage(value) {
    const lang = normalizeReadmeLanguage(value);
    localStorage.setItem(APP_LANGUAGE_STORAGE_KEY, lang);
    localStorage.setItem(README_LANGUAGE_STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    document.body.dataset.appLang = lang;

    setText('#tab-login', 'auth.login');
    setText('#tab-register', 'auth.register');
    setPlaceholder('#login-nick', 'auth.nickname');
    setPlaceholder('#login-pass', 'auth.password');
    setPlaceholder('#reg-nick', 'auth.registerNickname');
    setPlaceholder('#reg-pass', 'auth.registerPassword');
    setPlaceholder('#reg-pass-confirm', 'auth.confirmPassword');
    setText('#btn-login', 'auth.login');
    setText('#btn-guest', 'auth.guest');
    setText('#btn-register', 'auth.register');
    setText('.guest-note', 'auth.guestNote');
    setText('#btn-withdraw', 'auth.withdraw');
    updateWelcomeText();

    setText('#drop-diff-group label', 'menu.systemDifficulty');
    setText('#drop-pack-group > label', 'menu.selectPack');
    setText('.pack-trigger-kicker', 'menu.selectPack');
    setText('.pack-popover-head > span', 'menu.selectCartridge');
    setText('#pack-popover-close', 'menu.close');
    setText('#start-btn', 'menu.startCodedrop');
    setText('#pack-maker-btn', 'menu.packMaker');
    setText('#keyboard-test-btn', 'menu.keyTest');
    setText('#leaderboard-preview h3', 'menu.topAgents');
    setOptionText('#difficulty-select option[value="EASY"], #ocp-difficulty-select option[value="EASY"]', 'difficulty.easy');
    setOptionText('#difficulty-select option[value="NORMAL"], #ocp-difficulty-select option[value="NORMAL"]', 'difficulty.normal');
    setOptionText('#difficulty-select option[value="DEVELOPER"], #ocp-difficulty-select option[value="DEVELOPER"]', 'difficulty.developer');
    refreshDifficultyPickers();

    setText('.ocp-title', 'ocp.title');
    setText('.ocp-subtitle', 'ocp.subtitle');
    setText('#mode-learn strong', 'ocp.learn');
    setText('#mode-learn span', 'ocp.learnDesc');
    setText('#mode-drop span', 'ocp.dropDesc');
    setText('#mode-scenario strong', 'ocp.scenario');
    setText('#mode-scenario span', 'ocp.scenarioDesc');
    setText('#mode-lab strong', 'ocp.lab');
    setText('#mode-lab span', 'ocp.labDesc');
    setText('#mode-exam strong', 'ocp.exam');
    setText('#mode-exam span', 'ocp.examDesc');
    setText('#learn-info-group label', 'ocp.learnMode');
    const learnInfo = document.getElementById('learn-info-text');
    if (learnInfo && /로딩|Loading/i.test(learnInfo.textContent)) learnInfo.textContent = t('ocp.loadingCurriculum');
    setText('#ocp-drop-group label', 'ocp.cliDropDifficulty');
    setText('#ocp-drop-group .mode-info', 'ocp.fixedPack');
    setText('#scenario-select-group label', 'ocp.scenarioCategory');
    setText('#lab-select-group label', 'ocp.mockLab');
    setText('#exam-info-group label', 'ocp.examMode');
    setText('#exam-info-group .mode-info:not(.exam-gate-note)', 'ocp.examInfo');
    setText('#ocp-start-btn', 'ocp.start');
    setText('#dashboard-btn', 'ocp.dashboard');

    setText('.stat-item:nth-child(1) .stat-label', 'result.finalScore');
    setText('.stat-item:nth-child(2) .stat-label', 'result.maxCombo');
    setText('.stat-item:nth-child(4) .stat-label', 'result.accuracy');
    setText('#restart-btn', 'result.reboot');

    setText('.pack-maker-title', 'packMaker.title');
    setText('.pack-maker-subtitle', 'packMaker.subtitle');
    setText('#pack-maker-close', 'packMaker.home');
    setPlaceholder('#pack-maker-input', 'packMaker.inputPlaceholder');
    setText('#pack-maker-send', stateRefSafePackMakerBusy() ? 'packMaker.stop' : 'packMaker.ask');
    setPlaceholder('#pack-maker-title', 'packMaker.packTitle');
    setPlaceholder('#pack-maker-description', 'packMaker.packDescription');
    setText('.pack-maker-table thead th:nth-child(2)', 'packMaker.term');
    setText('.pack-maker-table thead th:nth-child(3)', 'packMaker.desc');
    setText('.pack-maker-table thead th:nth-child(4)', 'packMaker.source');
    setText('#pack-maker-add-item', 'packMaker.addItem');
    setText('#pack-maker-save', 'packMaker.save');
    setText('#pack-maker-submit', 'packMaker.submit');

    const readmeBox = document.getElementById('readme-box');
    if (readmeBox) readmeBox.dataset.manualLang = lang;
    document.querySelectorAll('.readme-lang-toggle [data-readme-lang]').forEach(langButton => {
        langButton.classList.toggle('active', normalizeReadmeLanguage(langButton.dataset.readmeLang) === lang);
    });

    if (els.auth && els.auth.btns) {
        if (els.auth.btns.withdraw) els.auth.btns.withdraw.textContent = t('auth.withdraw');
        if (els.auth.btns.logout) {
            els.auth.btns.logout.textContent = state.userToken ? t('auth.logout') : t('auth.loginAction');
        }
    }

    window.dispatchEvent(new CustomEvent('codedrop:language', { detail: { lang } }));
}

function stateRefSafePackMakerBusy() {
    return window.PackMaker && typeof window.PackMaker.isBusy === 'function' && window.PackMaker.isBusy();
}

window.CodeDropI18n = {
    t,
    lang: appLang,
    set: setReadmeLanguage,
    apply: applyAppLanguage
};

function setReadmeLanguage(value, options = {}) {
    const lang = normalizeReadmeLanguage(value);
    applyAppLanguage(lang);
    if (options.sound) sfx.playKey('Tab');
}

function initReadmeLanguage() {
    setReadmeLanguage(localStorage.getItem(APP_LANGUAGE_STORAGE_KEY) || localStorage.getItem(README_LANGUAGE_STORAGE_KEY) || 'en');
}

function handleReadmeLanguageClick(e) {
    const button = e.target.closest('[data-readme-lang]');
    if (!button) return;

    const lang = normalizeReadmeLanguage(button.dataset.readmeLang);
    setReadmeLanguage(lang, { sound: true });
}

// Add Listeners for Game Controls
function initGameControls() {
    initCommandDialog();
    initOverlayChromeObserver();

    // Remove existing to be safe (though named functions handle this mostly)
    els.input.field.removeEventListener('input', handleInput);
    els.input.field.removeEventListener('keydown', handleKeydown);
    els.hud.btnPause.removeEventListener('click', togglePause);
    els.hud.btnHome.removeEventListener('click', goHome);
    els.screens.pause.removeEventListener('click', togglePause);
    els.controls.restartBtn.removeEventListener('click', handleRestart);
    if (els.musicWidget) els.musicWidget.removeEventListener('click', handleMusicWidgetClick);

    // Add
    els.input.field.addEventListener('input', handleInput);
    els.input.field.addEventListener('keydown', handleKeydown);
    els.hud.btnPause.addEventListener('click', togglePause);
    els.hud.btnHome.addEventListener('click', goHome);
    els.screens.pause.addEventListener('click', togglePause);
    els.controls.restartBtn.addEventListener('click', handleRestart);

    // Music Widget Logic
    if (els.musicWidget) {
        initMusicWidgetPreference();
        els.musicWidget.addEventListener('click', handleMusicWidgetClick);
    }


    // Readme Logic
    const readmeWidget = document.getElementById('readme-widget');
    const readmeOverlay = document.getElementById('readme-overlay');
    const readmeClose = document.getElementById('readme-close');
    const readmeLangToggle = document.querySelector('.readme-lang-toggle');

    if (readmeWidget && readmeOverlay && readmeClose) {
        readmeWidget.removeEventListener('click', handleReadmeWidgetClick);
        readmeClose.removeEventListener('click', handleReadmeCloseClick);
        readmeOverlay.removeEventListener('click', handleReadmeOverlayClick);
        if (readmeLangToggle) readmeLangToggle.removeEventListener('click', handleReadmeLanguageClick);
        readmeWidget.addEventListener('click', handleReadmeWidgetClick);
        readmeClose.addEventListener('click', handleReadmeCloseClick);
        readmeOverlay.addEventListener('click', handleReadmeOverlayClick);
        if (readmeLangToggle) readmeLangToggle.addEventListener('click', handleReadmeLanguageClick);
        initReadmeLanguage();
    }
}

function init() {
    if (appInitialized) return;
    appInitialized = true;

    setGameChrome(false);
    initOverlayChromeObserver();
    startKugnusHealthCheck();
    initAuth();

    // Restore Nickname if any (though we use auth now)
    // const savedNick = localStorage.getItem('codedrop_nickname');
    // if (savedNick) els.controls.nickname.value = savedNick;

    // Load Initial Leaderboard
    fetchLeaderboard();
    initGameControls();
    initPackSelector();
    initModeControls();


    // Sfx Init on interaction
    const initAudio = () => {
        sfx.init();
        sfx.playBGM();
        document.removeEventListener('click', initAudio);
        document.removeEventListener('touchstart', initAudio);
        document.removeEventListener('keydown', initAudio);
    };

    document.addEventListener('click', initAudio);
    document.addEventListener('touchstart', initAudio);
    document.addEventListener('keydown', initAudio);

    // Global Enter to Start
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            // Only if Start Screen is visible, User is Logged In, and Game is NOT playing
            const dashboard = document.getElementById('dashboard-screen');
            const commandDialog = document.getElementById('confirm-screen');
            const packMaker = document.getElementById('pack-maker-screen');
            const keyboardTest = document.getElementById('keyboard-test-screen');
            if (!els.screens.start.classList.contains('hidden') &&
                els.auth.loggedInView.classList.contains('active') &&
                (!dashboard || dashboard.classList.contains('hidden')) &&
                (!commandDialog || commandDialog.classList.contains('hidden')) &&
                (!packMaker || packMaker.classList.contains('hidden')) &&
                (!keyboardTest || keyboardTest.classList.contains('hidden')) &&
                !state.isPlaying) {
                if (isOcpEditionActive()) {
                    handleStart();
                } else {
                    startGame();
                }
            }
        }
    });
}

// --- Auth Logic ---
function initAuth() {
    // Check LocalStorage
    const storedUser = localStorage.getItem('codedrop_user');
    if (storedUser) {
        try {
            const user = JSON.parse(storedUser);
            if (user && user.guest) {
                loginGuest(false);
            } else if (user && user.nickname) {
                state.userId = null;
                state.userToken = null;
                state.nickname = user.nickname;
                showAuthView();
                if (els.auth.errors.login) els.auth.errors.login.textContent = 'Restoring session...';
                validateRestoredSession(user).catch(err => {
                    console.warn('Stored session validation failed:', err.message);
                    state.userId = null;
                    state.userToken = null;
                    state.nickname = '';
                    localStorage.removeItem('codedrop_user');
                    showAuthView();
                    if (els.auth.errors.login) {
                        els.auth.errors.login.textContent = '로그인이 필요합니다. 다시 로그인하거나 비회원으로 계속할 수 있습니다.';
                    }
                });
            } else {
                localStorage.removeItem('codedrop_user');
                showAuthView();
            }
        } catch (e) {
            localStorage.removeItem('codedrop_user');
            showAuthView();
        }
    } else {
        showAuthView();
    }

    // Tabs
    els.auth.tabs.login.addEventListener('click', () => switchTab('login'));
    els.auth.tabs.register.addEventListener('click', () => switchTab('register'));

    // Buttons
    els.auth.btns.login.addEventListener('click', handleLogin);
    if (els.auth.btns.guest) els.auth.btns.guest.addEventListener('click', () => loginGuest(true));
    els.auth.btns.register.addEventListener('click', handleRegister);
    els.auth.btns.logout.addEventListener('click', handleLogout);
    els.auth.btns.withdraw.addEventListener('click', handleWithdraw);

    // Start Button (now in logged in view)
    els.controls.startBtn.addEventListener('click', startGame);

    // Enter key shortcuts for Auth
    els.auth.inputs.loginPass.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    els.auth.inputs.regPassConfirm.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleRegister();
    });
}

function switchTab(tab) {
    els.auth.tabs.login.classList.toggle('active', tab === 'login');
    els.auth.tabs.register.classList.toggle('active', tab === 'register');
    els.auth.forms.login.classList.toggle('active', tab === 'login');
    els.auth.forms.register.classList.toggle('active', tab === 'register');

    // Clear errors
    els.auth.errors.login.textContent = '';
    els.auth.errors.register.textContent = '';
}

const LOCAL_AUTH_KEY = 'codedrop_local_auth_users';

function isLocalDevAuthEnabled() {
    return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

function readLocalAuthUsers() {
    if (!isLocalDevAuthEnabled()) return {};

    try {
        const users = JSON.parse(localStorage.getItem(LOCAL_AUTH_KEY)) || {};
        if (!users.test) {
            users.test = { id: 'local-test', nickname: 'test', password: 'test' };
            localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(users));
        }
        return users;
    } catch (e) {
        return { test: { id: 'local-test', nickname: 'test', password: 'test' } };
    }
}

function saveLocalAuthUsers(users) {
    localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(users));
}

function tryLocalDevLogin(nickname, password) {
    const key = nickname.toLowerCase();
    const users = readLocalAuthUsers();
    const user = users[key];

    if (!user || user.password !== password) return false;
    loginSuccess(user.id, user.nickname, null);
    return true;
}

function localDevCredentialsValid(nickname, password) {
    const key = nickname.toLowerCase();
    const users = readLocalAuthUsers();
    const user = users[key];
    return Boolean(user && user.password === password);
}

async function provisionLocalDevServerSession(nickname, password) {
    if (!isLocalDevAuthEnabled() || !localDevCredentialsValid(nickname, password)) return false;

    const registerRes = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, password })
    }).catch(() => null);

    if (registerRes && registerRes.ok) {
        const data = await registerRes.json();
        loginSuccess(data.user_id, data.nickname, data.token);
        return true;
    }

    const loginRes = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, password })
    }).catch(() => null);

    if (loginRes && loginRes.ok) {
        const data = await loginRes.json();
        loginSuccess(data.user_id, data.nickname, data.token);
        return true;
    }

    return false;
}

async function refreshLocalDevServerSession() {
    if (!isLocalDevAuthEnabled() || !state.nickname) return false;
    const users = readLocalAuthUsers();
    const user = users[String(state.nickname).toLowerCase()];
    if (!user || !user.password) return false;
    return provisionLocalDevServerSession(user.nickname || state.nickname, user.password);
}

window.CodeDropAuth = {
    refreshServerSession: refreshLocalDevServerSession,
    clearSession: handleLogout,
    requireLogin: promptLoginRequired,
    isGuest() {
        return !state.userToken;
    }
};

async function promptLoginRequired(feature = 'This feature') {
    const result = await showCommandDialog({
        title: t('confirm.loginRequired'),
        message: t('confirm.loginRequiredMessage', { feature }),
        okText: t('confirm.login'),
        cancelText: t('confirm.stay'),
        extraText: t('confirm.register'),
        danger: true
    });

    if (!result.accepted) return false;

    document.querySelectorAll('#pack-maker-screen, #learn-screen, #dashboard-screen')
        .forEach(screen => screen.classList.add('hidden'));
    els.screens.start.classList.remove('hidden');
    handleLogout();
    switchTab(result.action === 'extra' ? 'register' : 'login');
    return true;
}

async function validateRestoredSession(user) {
    if (!user || !user.nickname) {
        handleLogout();
        return false;
    }

    if (!user.token) {
        if (await refreshLocalDevServerSession()) return true;
        return false;
    }

    const res = await fetch(`${API_BASE}/api/session`, {
        headers: { Authorization: `Bearer ${user.token}` },
        cache: 'no-store'
    }).catch(() => null);

    if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.user_id && data.nickname) {
            state.userId = data.user_id;
            state.userToken = user.token;
            state.nickname = data.nickname;
            localStorage.setItem('codedrop_user', JSON.stringify({
                id: data.user_id,
                nickname: data.nickname,
                token: user.token
            }));
            if (els.auth.errors.login) els.auth.errors.login.textContent = '';
            showLoggedInView();
            window.dispatchEvent(new CustomEvent('codedrop:auth', {
                detail: { id: data.user_id, nickname: data.nickname, token: user.token }
            }));
            return true;
        }
    }

    if (await refreshLocalDevServerSession()) return true;

    state.userId = null;
    state.userToken = null;
    state.nickname = '';
    localStorage.removeItem('codedrop_user');
    showAuthView();
    if (els.auth.errors.login) {
        els.auth.errors.login.textContent = '로그인이 필요합니다. 다시 로그인하거나 비회원으로 계속할 수 있습니다.';
    }
    window.dispatchEvent(new CustomEvent('codedrop:auth', { detail: null }));
    return false;
}

function createLocalDevUser(nickname, password) {
    if (!isLocalDevAuthEnabled()) return { ok: false, error: 'Local auth disabled.' };

    const key = nickname.toLowerCase();
    const users = readLocalAuthUsers();
    if (users[key]) return { ok: false, error: 'Nickname already taken locally.' };

    users[key] = {
        id: `local-${Date.now()}`,
        nickname,
        password
    };
    saveLocalAuthUsers(users);
    loginSuccess(users[key].id, nickname, null);
    return { ok: true };
}

async function handleLogin() {
    const nickname = els.auth.inputs.loginNick.value.trim();
    const password = els.auth.inputs.loginPass.value.trim();

    if (!nickname || !password) {
        els.auth.errors.login.textContent = "Please enter nickname and password.";
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname, password })
        });
        const data = await res.json();

        if (res.ok) {
            // Success
            loginSuccess(data.user_id, data.nickname, data.token);
        } else if (isLocalDevAuthEnabled() && await provisionLocalDevServerSession(nickname, password)) {
            return;
        } else if (res.status >= 500 && tryLocalDevLogin(nickname, password)) {
            return;
        } else {
            els.auth.errors.login.textContent = res.status >= 500 && isLocalDevAuthEnabled()
                ? "DB offline. Local dev login: test / test"
                : data.error || "Login failed.";
        }
    } catch (e) {
        if (tryLocalDevLogin(nickname, password)) return;
        els.auth.errors.login.textContent = isLocalDevAuthEnabled()
            ? "Server offline. Local dev login: test / test"
            : "Server error.";
    }
}

async function handleRegister() {
    const nickname = els.auth.inputs.regNick.value.trim();
    const password = els.auth.inputs.regPass.value.trim();
    const confirm = els.auth.inputs.regPassConfirm.value.trim();

    if (!nickname || !password) {
        els.auth.errors.register.textContent = "All fields required.";
        return;
    }
    if (password.length < 4) {
        els.auth.errors.register.textContent = "Password too short (min 4).";
        return;
    }
    if (password !== confirm) {
        els.auth.errors.register.textContent = "Passwords do not match.";
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname, password })
        });
        const data = await res.json();

        if (res.ok) {
            // Success -> Auto Login
            loginSuccess(data.user_id, data.nickname, data.token);
        } else if (res.status >= 500 && createLocalDevUser(nickname, password).ok) {
            return;
        } else {
            els.auth.errors.register.textContent = data.error || "Registration failed.";
        }
    } catch (e) {
        const localResult = createLocalDevUser(nickname, password);
        if (localResult.ok) return;
        els.auth.errors.register.textContent = isLocalDevAuthEnabled()
            ? localResult.error
            : "Server error.";
    }
}

function loginSuccess(id, nickname, token = null) {
    state.userId = id;
    state.userToken = token;
    state.nickname = nickname;
    localStorage.setItem('codedrop_user', JSON.stringify({ id, nickname, token }));
    showLoggedInView();
    window.dispatchEvent(new CustomEvent('codedrop:auth', { detail: { id, nickname, token } }));
}

function loginGuest(persist = true) {
    state.userId = null;
    state.userToken = null;
    state.nickname = 'GUEST';
    if (persist) {
        localStorage.setItem('codedrop_user', JSON.stringify({
            id: null,
            nickname: 'GUEST',
            token: null,
            guest: true
        }));
    }
    showLoggedInView();
    window.dispatchEvent(new CustomEvent('codedrop:auth', {
        detail: { id: null, nickname: 'GUEST', token: null, guest: true }
    }));
}

function handleLogout() {
    state.userId = null;
    state.userToken = null;
    state.nickname = '';
    localStorage.removeItem('codedrop_user');

    // Clear inputs
    els.auth.inputs.loginNick.value = '';
    els.auth.inputs.loginPass.value = '';
    els.auth.inputs.regNick.value = '';
    els.auth.inputs.regPass.value = '';
    els.auth.inputs.regPassConfirm.value = '';

    showAuthView();
    window.dispatchEvent(new CustomEvent('codedrop:auth', { detail: null }));
}

async function handleWithdraw() {
    const result = await showCommandDialog({
        title: 'DELETE ACCOUNT?',
        message: '계정을 삭제하면 로컬 로그인 정보와 원격 계정 복구가 불가능합니다. 계속하려면 비밀번호를 입력하세요.',
        okText: 'WITHDRAW',
        cancelText: 'CANCEL',
        input: true,
        placeholder: 'PASSWORD',
        requireValue: true,
        danger: true
    });

    if (!result.accepted) return;

    const password = result.value;

    if (isLocalDevAuthEnabled() && !state.userToken) {
        const key = state.nickname.toLowerCase();
        const users = readLocalAuthUsers();
        if (users[key] && users[key].password === password) {
            delete users[key];
            saveLocalAuthUsers(users);
            await showCommandDialog({
                title: 'LOCAL ACCOUNT DELETED',
                message: '로컬 개발 계정이 삭제되었습니다.',
                okText: 'OK',
                cancelText: ''
            });
            handleLogout();
        } else {
            await showCommandDialog({
                title: 'WITHDRAW FAILED',
                message: '비밀번호가 일치하지 않습니다.',
                okText: 'OK',
                cancelText: '',
                danger: true
            });
        }
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/withdraw`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(state.userToken ? { 'Authorization': `Bearer ${state.userToken}` } : {})
            },
            body: JSON.stringify({ password })
        });

        if (res.ok) {
            await showCommandDialog({
                title: 'ACCOUNT DELETED',
                message: '계정이 삭제되었습니다.',
                okText: 'OK',
                cancelText: ''
            });
            handleLogout();
        } else {
            const data = await res.json();
            await showCommandDialog({
                title: 'WITHDRAW FAILED',
                message: data.error || 'Unknown error',
                okText: 'OK',
                cancelText: '',
                danger: true
            });
        }
    } catch (e) {
        await showCommandDialog({
            title: 'SERVER ERROR',
            message: '서버 응답을 받지 못했습니다.',
            okText: 'OK',
            cancelText: '',
            danger: true
        });
    }
}

function showLoggedInView() {
    els.auth.authContainer.style.display = 'none';
    els.auth.loggedInView.classList.add('active');
    els.auth.userDisplay.textContent = state.nickname;
    if (els.auth.btns.withdraw) {
        els.auth.btns.withdraw.classList.toggle('hidden', !state.userToken);
    }
    if (els.auth.btns.logout) {
        els.auth.btns.logout.textContent = state.userToken ? t('auth.logout') : t('auth.loginAction');
    }

    // Refresh leaderboard for default view
    fetchLeaderboard();
    initGameControls();
    syncOverlayChrome();
}

function showAuthView() {
    document.body.classList.remove('ocp-edition');
    setGameChrome(false);
    const standardMenu = document.getElementById('standard-menu');
    const ocpMenu = document.getElementById('ocp-menu');
    const editionCodeBtn = document.getElementById('edition-code-btn');
    const editionOcpBtn = document.getElementById('edition-ocp-btn');
    if (standardMenu) standardMenu.classList.remove('hidden');
    if (ocpMenu) ocpMenu.classList.add('hidden');
    if (editionOcpBtn) editionOcpBtn.classList.remove('active');
    if (editionCodeBtn) editionCodeBtn.classList.add('active');
    els.auth.authContainer.style.display = 'block';
    els.auth.loggedInView.classList.remove('active');
    switchTab('login');
    syncOverlayChrome();
}

// Start
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', init, { once: true });
} else {
    init();
}
