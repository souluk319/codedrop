/**
 * CodeDrop - Cyberpunk Edition
 * Game Logic
 */

// --- API Config ---
const CODEDROP_BASE_PATH = (typeof window !== 'undefined' && window.CODEDROP_BASE_PATH) || '/games/codedrop';
const API_BASE = (typeof window !== 'undefined' && window.CODEDROP_API_BASE) || CODEDROP_BASE_PATH;
const README_LANGUAGE_STORAGE_KEY = 'codedrop_readme_language';
const APP_LANGUAGE_STORAGE_KEY = 'codedrop_language';
const TUTORIAL_SEEN_STORAGE_KEY = 'codedrop_tutorial_seen';
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
        'auth.guestNote': 'Guest can play official packs. Pack Maker, saved packs, rankings, and public listing requests require login.',
        'auth.welcome': 'WELCOME, ',
        'auth.logout': 'LOGOUT',
        'auth.loginAction': 'LOGIN',
        'auth.withdraw': 'WITHDRAW',
        'menu.systemDifficulty': 'System Difficulty',
        'menu.studyTime': 'STUDY TIME',
        'menu.studyTimePlaceholder': 'MINUTES (blank = infinite)',
        'menu.selectPack': 'SELECT PACK',
        'menu.selectText': 'SELECT TEXT PACK',
        'menu.selectCartridge': 'SELECT CARTRIDGE',
        'menu.selectTextCartridge': 'SELECT TEXT PACK',
        'menu.close': 'CLOSE',
        'menu.deletePackHint': 'DROP MY PACK TO DELETE',
        'menu.startCodedrop': 'START CODEDROP',
        'menu.startLongPractice': 'START LONG PRACTICE',
        'menu.packMaker': 'PACK MAKER',
        'menu.keyTest': 'KEY TEST',
        'menu.topAgents': 'TOP AGENTS',
        'menu.connecting': 'CONNECTING TO SERVER...',
        'menu.dropDesc': 'Shoot down falling terms before they reach the floor',
        'menu.longDesc': 'Build typing flow with sentences and long passages',
        'hud.score': 'Score',
        'hud.combo': 'Combo',
        'hud.lives': 'Lives',
        'hud.timer': 'Timer',
        'hud.progress': 'Progress',
        'hud.difficulty': 'Difficulty',
        'hud.pause': 'PAUSE',
        'hud.home': 'HOME',
        'hud.inputPlaceholder': 'COMMAND_INPUT...',
        'difficulty.easy': 'EASY [SAFE_MODE]',
        'difficulty.normal': 'NORMAL [STANDARD]',
        'difficulty.developer': 'DEVELOPER [OVERCLOCK]',
        'difficulty.study': 'INVINCIBLE [STUDY]',
        'ocp.title': 'OCP EDITION',
        'ocp.subtitle': 'EX280 hands-on study deck',
        'ocp.learn': 'LEARN MODE',
        'ocp.learnDesc': 'Start here if you are new — learn EX280 by typing',
        'ocp.dropDesc': 'Falling typing drill for core oc commands',
        'ocp.scenario': 'SCENARIO',
        'ocp.scenarioDesc': '10 situational command questions',
        'ocp.lab': 'MOCK LAB',
        'ocp.labDesc': 'Hands-on procedure training',
        'ocp.incident': 'INCIDENT DRILL',
        'ocp.incidentDesc': 'CrashLoop, Pending, RBAC, SCC diagnosis',
        'ocp.exam': 'EXAM',
        'ocp.examDesc': '15 questions · 90 seconds',
        'ocp.learnMode': 'Learn Mode',
        'ocp.loadingCurriculum': 'Loading curriculum...',
        'ocp.cliDropDifficulty': 'CLI Drop Difficulty',
        'ocp.fixedPack': 'Fixed to the OpenShift CLI (EX280) pack.',
        'ocp.scenarioCategory': 'Scenario Category',
        'ocp.mockLab': 'Mock Lab',
        'ocp.practiceStyle': 'Practice Style',
        'ocp.practiceSolve': 'Problem Solving',
        'ocp.practiceFollow': 'Follow Typing',
        'ocp.practiceSolveInfo': 'Hide the answer and recall the command yourself.',
        'ocp.practiceFollowInfo': 'Show the canonical command first and train muscle memory without score pressure.',
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
        'packMaker.tabChat': 'CHAT',
        'packMaker.tabEdit': 'EDIT',
        'packMaker.tabReview': 'PUBLIC REQUESTS',
        'packMaker.wordMode': 'WORD PACK',
        'packMaker.longMode': 'LONG PACK',
        'packMaker.inputPlaceholder': 'e.g. Make a 50-item K-pop group pack',
        'packMaker.termLanguage': 'PROMPT TERMS',
        'packMaker.descLanguage': 'ONE-LINE NOTE',
        'packMaker.langKorean': 'Korean',
        'packMaker.langEnglish': 'English',
        'packMaker.ask': 'ASK',
        'packMaker.stop': 'STOP',
        'packMaker.packTitle': 'PACK TITLE',
        'packMaker.packDescription': 'PACK DESCRIPTION',
        'packMaker.term': 'TERM',
        'packMaker.desc': 'ONE-LINE DESC',
        'packMaker.source': 'SOURCE',
        'packMaker.addItem': 'ADD ITEM',
        'packMaker.save': 'SAVE MY PACK',
        'packMaker.saving': 'SAVING...',
        'packMaker.submit': 'REQUEST PUBLIC LISTING',
        'packMaker.requesting': 'REQUESTING...',
        'packMaker.reviewNote': 'SAVE MY PACK is playable immediately. REQUEST PUBLIC LISTING appears in Public Packs after operator review.',
        'packMaker.reviewStatusTitle': 'PUBLIC REQUEST STATUS',
        'packMaker.reviewStatusPending': 'PENDING',
        'packMaker.reviewStatusApproved': 'APPROVED',
        'packMaker.reviewStatusRejected': 'REJECTED',
        'packMaker.reviewStatusReason': 'Reason',
        'packMaker.reviewStatusNoReason': 'No reason was provided.',
        'packMaker.guestPreview': 'GUEST PREVIEW MODE',
        'packMaker.loginRequired': 'LOGIN REQUIRED',
        'packMaker.loginNotice': 'Pack Maker generation/save is available after login. Guests can preview the screen and editor flow first.',
        'packMaker.featureName': 'Pack Maker generation/save',
        'packMaker.chatIntro': 'Tell Pack Maker the domain, language, item count, and pack name. It will draft a playable CODEDROP pack.',
        'packMaker.searchResults': 'Using {count} search results as draft grounding.',
        'admin.title': 'PACK REVIEW',
        'admin.subtitle': 'Operator queue for packs requested for public listing',
        'admin.home': 'HOME',
        'admin.refresh': 'REFRESH',
        'admin.pending': 'PENDING',
        'admin.approved': 'APPROVED',
        'admin.rejected': 'REJECTED',
        'admin.pendingQueue': 'REVIEW QUEUE',
        'admin.listAria': 'Pending public pack list',
        'admin.detailAria': 'Selected public pack detail',
        'admin.noPacks': 'No {status} packs.',
        'admin.owner': 'OWNER',
        'admin.items': '{count} ITEMS',
        'admin.missingSource': 'MISSING SOURCE {count}',
        'admin.sourceMissing': '-',
        'admin.term': 'TERM',
        'admin.description': 'DESCRIPTION',
        'admin.source': 'SOURCE',
        'admin.approve': 'APPROVE',
        'admin.reject': 'REJECT',
        'admin.loadingDetail': 'Loading pack detail...',
        'admin.loginRequired': 'ADMIN LOGIN REQUIRED',
        'admin.loginRequiredMessage': 'Login as the configured pack admin account first.',
        'admin.loginTitle': 'ADMIN LOGIN',
        'admin.loginSubtitle': 'Sign in as the pack operator to review public listing requests.',
        'admin.loginAction': 'LOGIN',
        'admin.loginFailed': 'Admin login failed.',
        'admin.loadingQueue': 'LOADING REVIEW QUEUE',
        'admin.queueCount': '{count} {status} PACKS',
        'admin.selectPack': 'Select a submitted pack to review.',
        'admin.adminRequired': 'PACK ADMIN REQUIRED',
        'admin.approveTitle': 'APPROVE PUBLIC PACK',
        'admin.rejectTitle': 'REJECT PUBLIC PACK',
        'admin.approveMessage': 'Publish this pack in Public Packs. Continue?',
        'admin.rejectMessage': 'Reject this pack. Enter a reason.',
        'admin.cancel': 'CANCEL',
        'admin.rejectReason': 'REJECT REASON',
        'admin.approving': 'APPROVING PACK',
        'admin.rejecting': 'REJECTING PACK',
        'admin.approvedStatus': 'PACK APPROVED',
        'admin.rejectedStatus': 'PACK REJECTED',
        'admin.approveIntent': 'APPROVE CHECK REQUESTED',
        'admin.rejectIntent': 'REJECT CHECK REQUESTED',
        'admin.loaded': 'PACK #{id} LOADED',
        'leaderboard.noData': 'NO DATA FOUND. BE THE FIRST.',
        'leaderboard.customLogin': 'LOGIN REQUIRED FOR CUSTOM PACK RANKING',
        'leaderboard.connectionLost': 'CONNECTION LOST',
        'score.offline': 'OFFLINE MODE. DATA NOT SAVED.',
        'score.uploading': 'UPLOADING DATA...',
        'score.uploadComplete': 'UPLOAD COMPLETE. CHECK RANKING.',
        'score.uploadFailed': 'UPLOAD FAILED.',
        'score.serverError': 'SERVER ERROR. DATA NOT SAVED.',
        'score.studyMode': 'STUDY MODE. RANKING DATA NOT SAVED.'
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
        'auth.guestNote': '비회원은 공식 팩 플레이만 가능 · Pack Maker 생성/저장, 랭킹, 공개 요청은 로그인 필요',
        'auth.welcome': '환영합니다, ',
        'auth.logout': '로그아웃',
        'auth.loginAction': '로그인',
        'auth.withdraw': '회원탈퇴',
        'menu.systemDifficulty': '시스템 난이도',
        'menu.studyTime': '학습 시간',
        'menu.studyTimePlaceholder': '분 단위 · 비우면 무한',
        'menu.selectPack': '팩 선택',
        'menu.selectText': '문장팩 선택',
        'menu.selectCartridge': '카트리지 선택',
        'menu.selectTextCartridge': '문장팩 선택',
        'menu.close': '닫기',
        'menu.deletePackHint': '내 팩을 끌어와 삭제',
        'menu.startCodedrop': 'CODEDROP 시작',
        'menu.startLongPractice': 'LONG PRACTICE 시작',
        'menu.packMaker': 'PACK MAKER 열기',
        'menu.keyTest': '키 테스트',
        'menu.topAgents': '상위 요원',
        'menu.connecting': '서버 연결 중...',
        'menu.dropDesc': '낙하 단어를 바닥에 닿기 전에 빠르게 격추합니다',
        'menu.longDesc': '문장과 긴 글을 따라 치며 손가락 흐름을 만듭니다',
        'hud.score': '점수',
        'hud.combo': '콤보',
        'hud.lives': '생명',
        'hud.timer': '시간',
        'hud.progress': '진행',
        'hud.difficulty': '난이도',
        'hud.pause': '일시정지',
        'hud.home': '홈',
        'hud.inputPlaceholder': '명령어 입력...',
        'difficulty.easy': '쉬움 [안전 모드]',
        'difficulty.normal': '보통 [표준]',
        'difficulty.developer': '개발자 [오버클럭]',
        'difficulty.study': '무적 [STUDY]',
        'ocp.title': 'OCP EDITION',
        'ocp.subtitle': 'EX280 실전 학습 덱',
        'ocp.learn': '학습 모드',
        'ocp.learnDesc': '처음이라면 여기부터 — 따라치며 배우는 EX280',
        'ocp.dropDesc': 'OC 핵심 명령 낙하 타자',
        'ocp.scenario': '시나리오',
        'ocp.scenarioDesc': '상황별 명령 10문제',
        'ocp.lab': '모의 랩',
        'ocp.labDesc': '실전 절차 훈련',
        'ocp.incident': '진단훈련',
        'ocp.incidentDesc': 'CrashLoop, Pending, RBAC, SCC 원인 찾기',
        'ocp.exam': '시험 모드',
        'ocp.examDesc': '15문제 · 90초',
        'ocp.learnMode': '학습 모드',
        'ocp.loadingCurriculum': '커리큘럼 로딩...',
        'ocp.cliDropDifficulty': 'CLI 드롭 난이도',
        'ocp.fixedPack': 'OpenShift CLI (EX280) 팩으로 고정됩니다.',
        'ocp.scenarioCategory': '시나리오 카테고리',
        'ocp.mockLab': '모의 랩',
        'ocp.practiceStyle': '훈련 방식',
        'ocp.practiceSolve': '문제풀이',
        'ocp.practiceFollow': '따라치기',
        'ocp.practiceSolveInfo': '정답을 가리고 직접 떠올려 입력합니다.',
        'ocp.practiceFollowInfo': '정답 명령을 먼저 보고 점수 부담 없이 손가락 기억을 만듭니다.',
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
        'packMaker.home': '홈',
        'packMaker.tabChat': '대화',
        'packMaker.tabEdit': '편집',
        'packMaker.tabReview': '공개 요청',
        'packMaker.wordMode': '단어 팩',
        'packMaker.longMode': '장문 팩',
        'packMaker.inputPlaceholder': '예: K-pop 그룹 이름 50개 팩 만들어줘',
        'packMaker.termLanguage': '제시어',
        'packMaker.descLanguage': '한줄설명',
        'packMaker.langKorean': '한글',
        'packMaker.langEnglish': '영어',
        'packMaker.ask': 'ASK',
        'packMaker.stop': 'STOP',
        'packMaker.packTitle': '팩 제목',
        'packMaker.packDescription': '팩 설명',
        'packMaker.term': '용어',
        'packMaker.desc': '한줄 설명',
        'packMaker.source': '출처',
        'packMaker.addItem': '항목 추가',
        'packMaker.save': '내 팩 저장',
        'packMaker.saving': '저장 중...',
        'packMaker.submit': '공개 요청',
        'packMaker.requesting': '요청 중...',
        'packMaker.reviewNote': '내 팩 저장은 즉시 플레이 가능 · 공개 요청은 운영자 검수 후 Public Packs에 노출됩니다.',
        'packMaker.reviewStatusTitle': '내 공개 요청 상태',
        'packMaker.reviewStatusPending': '대기 중',
        'packMaker.reviewStatusApproved': '공개됨',
        'packMaker.reviewStatusRejected': '반려됨',
        'packMaker.reviewStatusReason': '사유',
        'packMaker.reviewStatusNoReason': '반려 사유가 입력되지 않았습니다.',
        'packMaker.guestPreview': '비회원 미리보기 모드',
        'packMaker.loginRequired': '로그인 필요',
        'packMaker.loginNotice': 'Pack Maker 생성/저장은 로그인 후 사용할 수 있습니다. 비회원은 화면과 편집 흐름을 먼저 둘러볼 수 있습니다.',
        'packMaker.featureName': '팩 메이커 생성/저장',
        'packMaker.chatIntro': '도메인, 언어, 개수, 팩 이름을 자연어로 말하세요. 플레이 가능한 CODEDROP 팩 초안으로 정리합니다.',
        'packMaker.searchResults': '검색 결과 {count}개를 draft 근거로 사용합니다.',
        'admin.title': '팩 검수',
        'admin.subtitle': '공개 요청된 CODEDROP 팩을 확인하고 노출 여부를 결정합니다',
        'admin.home': 'HOME',
        'admin.refresh': '새로고침',
        'admin.pending': '대기',
        'admin.approved': '승인됨',
        'admin.rejected': '반려됨',
        'admin.pendingQueue': '검수 대기열',
        'admin.listAria': '공개 팩 심사 목록',
        'admin.detailAria': '선택한 공개 팩 상세',
        'admin.noPacks': '{status} 팩이 없습니다.',
        'admin.owner': '제출자',
        'admin.items': '{count}개 항목',
        'admin.missingSource': '출처 없음 {count}개',
        'admin.sourceMissing': '-',
        'admin.term': '용어',
        'admin.description': '설명',
        'admin.source': '출처',
        'admin.approve': '승인',
        'admin.reject': '반려',
        'admin.loadingDetail': '팩 상세 불러오는 중...',
        'admin.loginRequired': '관리자 로그인 필요',
        'admin.loginRequiredMessage': '설정된 팩 관리자 계정으로 먼저 로그인하세요.',
        'admin.loginTitle': '관리자 로그인',
        'admin.loginSubtitle': '공개 요청 팩을 검수하려면 운영자 계정으로 로그인하세요.',
        'admin.loginAction': '로그인',
        'admin.loginFailed': '관리자 로그인 실패',
        'admin.loadingQueue': '심사 대기열 불러오는 중',
        'admin.queueCount': '{status} 팩 {count}개',
        'admin.selectPack': '심사할 제출 팩을 선택하세요.',
        'admin.adminRequired': '팩 관리자 권한 필요',
        'admin.approveTitle': '공개 팩 승인',
        'admin.rejectTitle': '공개 팩 반려',
        'admin.approveMessage': '이 팩을 Public Packs에 공개합니다. 계속할까요?',
        'admin.rejectMessage': '이 팩을 반려합니다. 반려 사유를 입력하세요.',
        'admin.cancel': '취소',
        'admin.rejectReason': '반려 사유',
        'admin.approving': '팩 승인 중',
        'admin.rejecting': '팩 반려 중',
        'admin.approvedStatus': '팩 승인 완료',
        'admin.rejectedStatus': '팩 반려 완료',
        'admin.approveIntent': '승인 확인 요청',
        'admin.rejectIntent': '반려 확인 요청',
        'admin.loaded': '팩 #{id} 불러옴',
        'leaderboard.noData': '기록이 없습니다. 첫 기록을 남겨보세요.',
        'leaderboard.customLogin': '커스텀 팩 랭킹은 로그인 필요',
        'leaderboard.connectionLost': '연결이 끊겼습니다',
        'score.offline': '비회원 모드. 기록은 저장되지 않습니다.',
        'score.uploading': '기록 업로드 중...',
        'score.uploadComplete': '업로드 완료. 랭킹을 확인하세요.',
        'score.uploadFailed': '업로드 실패.',
        'score.serverError': '서버 오류. 기록이 저장되지 않았습니다.',
        'score.studyMode': 'STUDY MODE. 랭킹에는 저장되지 않습니다.'
    }
};

const DIFFICULTY = {
    EASY: { spawnRate: 2500, speedMin: 0.5, speedMax: 1.0, eventChance: 0 },
    NORMAL: { spawnRate: 2000, speedMin: 0.7, speedMax: 1.3, eventChance: 0 },
    DEVELOPER: { spawnRate: 1500, speedMin: 2, speedMax: 3.5, eventChance: 0 },
    STUDY: { spawnRate: 2000, speedMin: 0.7, speedMax: 1.3, eventChance: 0, study: true, base: 'NORMAL' }
};

function difficultyKey(value) {
    return String(value || 'NORMAL').split(' ')[0].trim().toUpperCase() || 'NORMAL';
}

function isStudyDifficulty(value) {
    return difficultyKey(value) === 'STUDY';
}

function effectiveDifficultyKey(value) {
    const key = difficultyKey(value);
    const config = DIFFICULTY[key];
    return config && config.base ? config.base : key;
}

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
    playMode: 'MISSION',
    studyDurationMs: 0,
    studyEndsAt: 0,
    endReason: '',
    pauseStartedAt: 0,
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
        studyTimer: document.getElementById('study-timer-display'),
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
        pause: document.getElementById('pause-screen'),
        longPractice: document.getElementById('long-practice-screen')
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
        packTrashZone: document.getElementById('pack-trash-zone'),
        studyTimeRow: document.getElementById('study-time-row'),
        studyTimeInput: document.getElementById('study-time-input'),
        ocpStudyTimeRow: document.getElementById('ocp-study-time-row'),
        ocpStudyTimeInput: document.getElementById('ocp-study-time-input'),
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
    'long-practice-screen',
    'pack-maker-screen',
    'admin-pack-screen',
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
    fallbackScopes: new Set(),
    fallbackEngines: new Map()
};
let routeApplying = false;

const APP_ROUTE_PATHS = {
    home: '/',
    play: '/play',
    packMaker: '/pack-maker',
    longPractice: '/long-practice',
    adminPacks: '/admin/packs',
    keyTest: '/key-test',
    ocp: '/ocp',
    ocpPlay: '/ocp/play',
    ocpLearn: '/ocp/learn',
    ocpScenario: '/ocp/scenario',
    ocpLab: '/ocp/lab',
    ocpIncident: '/ocp/incident',
    ocpExam: '/ocp/exam',
    ocpDashboard: '/ocp/dashboard',
    github: '/github',
    githubPlay: '/github/play',
    githubLearn: '/github/learn',
    githubScenario: '/github/scenario',
    githubLab: '/github/lab',
    githubIncident: '/github/incident',
    githubExam: '/github/exam',
    githubDashboard: '/github/dashboard'
};

function routePath(route) {
    const suffix = APP_ROUTE_PATHS[route] || APP_ROUTE_PATHS.home;
    return `${CODEDROP_BASE_PATH}${suffix}`;
}

function routeFromPath(pathname) {
    let path = String(pathname || '/').replace(/\/+$/, '');
    if (!path || path === '/') return 'home';
    if (path === CODEDROP_BASE_PATH) return 'home';
    if (!path.startsWith(`${CODEDROP_BASE_PATH}/`)) return 'home';

    const suffix = path.slice(CODEDROP_BASE_PATH.length);
    const entry = Object.entries(APP_ROUTE_PATHS)
        .find(([, value]) => value !== '/' && value.replace(/\/+$/, '') === suffix);
    return entry ? entry[0] : 'home';
}

function navigateAppRoute(route, options = {}) {
    if (routeApplying || !window.history?.pushState) return;
    const path = routePath(route);
    if (window.location.pathname === path && !options.replace) return;
    const method = options.replace ? 'replaceState' : 'pushState';
    window.history[method]({ codedropRoute: route }, '', path);
}

function hideAppOverlaysForRoute() {
    [
        'pause-screen',
        'result-screen',
        'confirm-screen',
        'long-practice-screen',
        'pack-maker-screen',
        'admin-pack-screen',
        'keyboard-test-screen',
        'scenario-screen',
        'lab-screen',
        'dashboard-screen',
        'learn-screen'
    ].forEach(id => document.getElementById(id)?.classList.add('hidden'));

    const learnChat = document.getElementById('learn-chat-panel');
    if (learnChat) learnChat.classList.add('hidden');
}

function restoreStartShellForRoute() {
    state.isPlaying = false;
    state.isPaused = false;
    state.studyDurationMs = 0;
    state.studyEndsAt = 0;
    state.endReason = '';
    state.pauseStartedAt = 0;
    setGameChrome(false);
    setBottomWidgetsTranslucent(false);
    els.screens.start.classList.remove('hidden');
    els.input.field.value = '';
    els.input.field.disabled = true;
    updateTargetDisplay('');
    state.targetId = null;
    state.lastInputLength = 0;
    els.gameArea.innerHTML = '';
    state.activeWords = [];
    hideAppOverlaysForRoute();
    syncOverlayChrome();
}

function applyAppRoute(route) {
    routeApplying = true;
    try {
        restoreStartShellForRoute();

        const studyKey = route.startsWith('github') ? 'github' : (route.startsWith('ocp') ? 'ocp' : '');
        if (studyKey) {
            window.CodeDropModeControls?.openStudyEdition(studyKey);
        } else {
            window.CodeDropModeControls?.closeStudyEdition();
        }

        if (route === 'play' || route === 'ocpPlay' || route === 'githubPlay') {
            if (studyKey) {
                window.CodeDropModeControls?.setMode('DROP');
                forceStudyDropPackSync({ notify: false });
            }
            void startGame();
        } else if (route === 'packMaker') {
            window.PackMaker?.open();
        } else if (route === 'longPractice') {
            window.LongPractice?.open();
        } else if (route === 'adminPacks') {
            window.AdminPacks?.open();
        } else if (route === 'keyTest') {
            window.KeyboardTest?.open();
        } else if (route === 'ocpDashboard' || route === 'githubDashboard') {
            if (typeof Dashboard !== 'undefined') Dashboard.open();
        } else if (route === 'ocpLearn' || route === 'githubLearn') {
            window.CodeDropModeControls?.setMode('LEARN');
            els.screens.start.classList.add('hidden');
            if (typeof LearnMode !== 'undefined') LearnMode.openPicker();
        } else if (route === 'ocpScenario' || route === 'githubScenario') {
            window.CodeDropModeControls?.setMode('SCENARIO');
            els.screens.start.classList.add('hidden');
            if (typeof ScenarioMode !== 'undefined') {
                ScenarioMode.start(document.getElementById('scenario-category-select')?.value);
            }
        } else if (route === 'ocpLab' || route === 'githubLab') {
            window.CodeDropModeControls?.setMode('LAB');
            els.screens.start.classList.add('hidden');
            if (typeof LabMode !== 'undefined') {
                LabMode.start(document.getElementById('lab-select')?.value);
            }
        } else if (route === 'ocpIncident' || route === 'githubIncident') {
            window.CodeDropModeControls?.setMode('INCIDENT');
            els.screens.start.classList.add('hidden');
            if (typeof ScenarioMode !== 'undefined') ScenarioMode.startIncidentDrill();
        } else if (route === 'ocpExam' || route === 'githubExam') {
            window.CodeDropModeControls?.setMode('EXAM');
            els.screens.start.classList.add('hidden');
            if (typeof ScenarioMode !== 'undefined') ScenarioMode.startExam();
        }

        applyAppLanguage(appLang());
        syncOverlayChrome();
    } finally {
        routeApplying = false;
    }
}

function initAppRouter() {
    if (window.CodeDropRouter?.initialized) return;

    window.CodeDropRouter = {
        initialized: true,
        navigate: navigateAppRoute,
        routeFromPath,
        apply: applyAppRoute
    };

    document.getElementById('pack-maker-btn')?.addEventListener('click', () => navigateAppRoute('packMaker'));
    document.getElementById('pack-maker-close')?.addEventListener('click', () => navigateAppRoute(isStudyEditionActive() ? currentStudyHomeRoute() : 'home'));
    document.getElementById('long-home')?.addEventListener('click', () => navigateAppRoute('home'));
    document.getElementById('keyboard-test-btn')?.addEventListener('click', () => navigateAppRoute('keyTest'));
    document.getElementById('keytest-close')?.addEventListener('click', () => navigateAppRoute(isStudyEditionActive() ? currentStudyHomeRoute() : 'home'));
    document.getElementById('dashboard-close')?.addEventListener('click', () => navigateAppRoute(currentStudyHomeRoute()));
    document.getElementById('scenario-quit')?.addEventListener('click', () => navigateAppRoute(currentStudyHomeRoute()));
    document.getElementById('lab-home')?.addEventListener('click', () => navigateAppRoute(currentStudyHomeRoute()));
    document.getElementById('learn-picker-home')?.addEventListener('click', () => navigateAppRoute(currentStudyHomeRoute()));
    document.getElementById('learn-home')?.addEventListener('click', () => navigateAppRoute(currentStudyHomeRoute()));

    window.addEventListener('popstate', () => {
        applyAppRoute(routeFromPath(window.location.pathname));
    });

    const currentRoute = routeFromPath(window.location.pathname);
    const canonicalPath = routePath(currentRoute);
    if (!window.location.pathname.startsWith(CODEDROP_BASE_PATH)) {
        navigateAppRoute('home', { replace: true });
    } else if (window.location.pathname !== canonicalPath && currentRoute === 'home') {
        navigateAppRoute('home', { replace: true });
    }

    setTimeout(() => applyAppRoute(routeFromPath(window.location.pathname)), 0);
}

function reapplyCurrentRouteAfterAuth() {
    const route = window.CodeDropRouter?.routeFromPath?.(window.location.pathname);
    if (!route || route === 'home') return;
    setTimeout(() => {
        window.CodeDropRouter?.apply?.(route);
    }, 0);
}

window.CodeDropRouter = {
    initialized: false,
    navigate: navigateAppRoute,
    routeFromPath,
    apply: applyAppRoute
};

function setGameChrome(active) {
    document.body.classList.toggle('game-active', Boolean(active));
    document.body.classList.toggle('study-active', Boolean(active && state.playMode === 'STUDY'));
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
        document.getElementById('global-lang-toggle'),
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
    inputType = 'text',
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
        c.input.type = inputType === 'password' ? 'password' : 'text';
        c.input.autocomplete = inputType === 'password' ? 'current-password' : 'off';
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

function clearLlmFallbackScope(scope) {
    llmStatus.fallbackScopes.delete(scope);
    llmStatus.fallbackEngines.delete(scope);
    llmStatus.promptedScopes.delete(scope);
    llmStatus.promptedScopes.delete(`${scope}:kugnus:gemini`);
    llmStatus.promptedScopes.delete(`${scope}:gemini:openai`);
}

async function maybeSwitchFromOfflineKugnus(scope = 'chat') {
    const status = await startKugnusHealthCheck(true);
    if (status.ok !== false) {
        clearLlmFallbackScope(scope);
        return null;
    }
    const fallbackEngine = llmStatus.fallbackEngines.get(scope);
    if (fallbackEngine === 'gemini' || fallbackEngine === 'openai') return fallbackEngine;

    const promptKey = `${scope}:kugnus:gemini`;
    if (llmStatus.promptedScopes.has(promptKey)) return null;

    llmStatus.promptedScopes.add(promptKey);
    const result = await showCommandDialog({
        title: 'KUGNUS SERVER OFFLINE',
        message: 'KUGNUS SERVER 응답이 없습니다. GEMINI 2.5 FLASH로 전환합니다.',
        extraText: status.reason ? `Reason: ${status.reason}` : '',
        okText: 'SWITCH',
        cancelText: 'STAY',
        danger: true
    });

    if (!result.accepted) return null;

    llmStatus.fallbackScopes.add(scope);
    llmStatus.fallbackEngines.set(scope, 'gemini');
    window.dispatchEvent(new CustomEvent('codedrop:llm-fallback', {
        detail: { scope, engine: 'gemini' }
    }));
    return 'gemini';
}

async function maybeSwitchFromFailedEngine(scope = 'chat', engine = '', reason = '') {
    if (engine !== 'gemini') return null;

    const fallbackEngine = llmStatus.fallbackEngines.get(scope);
    if (fallbackEngine === 'openai') return 'openai';

    const promptKey = `${scope}:gemini:openai`;
    if (llmStatus.promptedScopes.has(promptKey)) return null;
    llmStatus.promptedScopes.add(promptKey);

    const result = await showCommandDialog({
        title: 'GEMINI ROUTE FAILED',
        message: 'GEMINI 응답이 불안정합니다. GPT 5.4 MINI로 전환하고 같은 질문을 한 번 다시 시도합니다.',
        extraText: reason ? `Reason: ${reason}` : '',
        okText: 'GPT 5.4 MINI',
        cancelText: 'STAY',
        danger: true
    });

    if (!result.accepted) return null;

    llmStatus.fallbackScopes.add(scope);
    llmStatus.fallbackEngines.set(scope, 'openai');
    window.dispatchEvent(new CustomEvent('codedrop:llm-fallback', {
        detail: { scope, engine: 'openai' }
    }));
    return 'openai';
}

window.CodeDropLlmStatus = {
    startKugnusHealthCheck,
    maybeSwitchFromOfflineKugnus,
    maybeSwitchFromFailedEngine,
    isFallbackScope(scope) {
        return llmStatus.fallbackScopes.has(scope);
    },
    snapshot(scope = '') {
        return {
            checked: llmStatus.checked,
            checking: llmStatus.checking,
            ok: llmStatus.ok,
            reason: llmStatus.reason,
            provider: llmStatus.provider,
            route: llmStatus.route,
            model: llmStatus.model,
            fallbackEngine: llmStatus.fallbackEngines.get(scope) || ''
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

function soundAssetPath(file) {
    return `${CODEDROP_BASE_PATH}/sound/${file}`;
}

// --- Sound FX (Web Audio API & WAVs) ---
const sfx = {
    ctx: null,
    sounds: {},
    bgm: null,
    loaded: false,
    init: function () {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            try {
                if (!this.ctx) {
                    this.ctx = new AudioContextClass();
                } else if (this.ctx.state === 'suspended') {
                    this.ctx.resume().catch(() => { });
                }
            } catch (error) {
                this.ctx = null;
            }
        }

        if (!this.loaded) {
            // Load WAVs
            this.sounds.enter = new Audio(soundAssetPath('enter.wav'));
            this.sounds.backspace = new Audio(soundAssetPath('backspace2.wav'));
            this.sounds.space = new Audio(soundAssetPath('spacebar.wav'));
            this.sounds.space.volume = 0.5;
            this.sounds.key = new Audio(soundAssetPath('key.wav'));
            this.sounds.correct = new Audio(soundAssetPath('correct_sound.wav'));

            this.bgm = new Audio(soundAssetPath('mainpage_bgm.wav'));
            this.bgm.loop = false;
            this.bgm.volume = 0.5;

            this.loaded = true;
        }
    },
    ensureReady: function () {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => { });
        }
        return this.ctx;
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
        this.init();
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
        const ctx = this.ensureReady();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + duration);
    },
    playSweep: function (startFreq, endFreq, type, duration, vol = 0.08, delay = 0) {
        const ctx = this.ensureReady();
        if (!ctx) return;
        const now = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), now + duration);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(vol, now + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + duration + 0.02);
    },
    playSuccess: function () {
        this.init();
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
    },
    playPackLatch: function () {
        this.playSweep(920, 260, 'triangle', 0.045, 0.075, 0);
        this.playSweep(190, 68, 'square', 0.16, 0.11, 0.048);
        this.playSweep(62, 42, 'sine', 0.21, 0.13, 0.078);
    },
    playEditionBurst: function () {
        this.playSweep(220, 1280, 'sawtooth', 0.12, 0.065, 0);
        this.playSweep(1040, 180, 'square', 0.18, 0.08, 0.035);
        this.playTone(54, 'sine', 0.16, 0.09);
    },
    playBoot: function () {
        this.playSweep(160, 420, 'square', 0.09, 0.055, 0);
        this.playSweep(420, 760, 'triangle', 0.1, 0.06, 0.08);
        this.playSweep(760, 1180, 'sine', 0.12, 0.055, 0.17);
    }
};
window.sfx = sfx;

const CodeDropTypingSfx = {
    bound: false,
    lastByTarget: new WeakMap(),
    lastLoose: { key: '', at: 0 },
    isAudibleKey(event) {
        if (!event || event.metaKey || event.ctrlKey || event.altKey || event.isComposing) return false;
        if (event.key === 'Process') return false;
        return event.key === 'Enter'
            || event.key === 'Backspace'
            || event.key === 'Delete'
            || event.key === ' '
            || String(event.key || '').length === 1;
    },
    isEditableTarget(target) {
        if (!target || !(target instanceof Element)) return false;
        const editable = target.closest('textarea, input, [contenteditable="true"]');
        if (!editable) return false;
        if (editable.matches('[disabled], [readonly]')) return false;
        if (editable instanceof HTMLInputElement) {
            const type = String(editable.type || 'text').toLowerCase();
            return !['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'].includes(type);
        }
        return true;
    },
    play(eventOrKey, options = {}) {
        const event = eventOrKey && typeof eventOrKey === 'object' && 'key' in eventOrKey ? eventOrKey : null;
        const key = event ? event.key : eventOrKey;
        if (event && !this.isAudibleKey(event)) return false;
        if (event && options.force !== true && !this.isEditableTarget(event.target)) return false;

        const now = Date.now();
        const signature = `${key || 'a'}:${event?.code || ''}`;
        if (event?.target && typeof event.target === 'object') {
            const last = this.lastByTarget.get(event.target);
            if (last && last.signature === signature && now - last.at < 45) return false;
            this.lastByTarget.set(event.target, { signature, at: now });
        } else if (this.lastLoose.key === signature && now - this.lastLoose.at < 45) {
            return false;
        } else {
            this.lastLoose = { key: signature, at: now };
        }

        if (!window.sfx || typeof window.sfx.playKey !== 'function') return false;
        window.sfx.playKey(key === ' ' ? ' ' : (key || 'a'));
        return true;
    },
    bindGlobal() {
        if (this.bound) return;
        this.bound = true;
        document.addEventListener('keydown', (event) => {
            if (!this.isEditableTarget(event.target)) return;
            this.play(event, { source: 'global' });
        }, true);
    }
};
window.CodeDropTypingSfx = CodeDropTypingSfx;
CodeDropTypingSfx.bindGlobal();

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
    GITHUB_CORE: { title: 'GitHub', chip: 'GH', style: 'github_core' },
    VOCAB: { title: 'Vocabulary', chip: 'WORDS', style: 'vocab' },
    MIX: { title: 'Mix', chip: 'MIX', style: 'mix' }
};
let activePackDragMeta = null;
let standardMode = 'DROP';
let selectedLongPackId = '';
const LONG_SELECTOR_PREFIX = 'LONG__';
const LONG_SELECTOR_FEATURED_IDS = [
    'ko_keyboard_reviewer_flow',
    'ko_aegukga_safe_practice',
    'en_keyboard_reviewer_pangram',
    'mixed_keyboard_reviewer',
    'ko_focus_flow',
    'en_tech_onboarding'
];

function isLongSelectorMode() {
    return typeof standardMode !== 'undefined' && standardMode === 'LONG';
}

function longSelectorText(en, ko) {
    return appLang() === 'ko' ? ko : en;
}

function longPackValue(id) {
    return `${LONG_SELECTOR_PREFIX}${id}`;
}

function longPackIdFromValue(value) {
    const text = String(value || '');
    return text.startsWith(LONG_SELECTOR_PREFIX) ? text.slice(LONG_SELECTOR_PREFIX.length) : '';
}

function longPackListForSelector() {
    const keepVisiblePack = pack => pack?.showInSelector !== false || pack?.type === 'template' || isUserProvidedLongPack(pack);
    if (window.LongPractice && typeof window.LongPractice.listPacks === 'function') {
        return window.LongPractice.listPacks().filter(keepVisiblePack);
    }
    return Array.isArray(window.LONG_TEXT_PACKS) ? window.LONG_TEXT_PACKS.filter(keepVisiblePack) : [];
}

function customPackStyle(seed = '') {
    const styles = ['custom', 'custom-blue', 'custom-green', 'custom-violet', 'custom-amber'];
    const text = String(seed || 'custom');
    let hash = 0;
    for (let index = 0; index < text.length; index += 1) {
        hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
    }
    return styles[Math.abs(hash) % styles.length];
}

function isUserProvidedLongPack(pack) {
    if (!pack || pack.type === 'template') return false;
    const source = String(pack.source || '').toUpperCase();
    const tags = Array.isArray(pack.tags) ? pack.tags.join(' ').toLowerCase() : '';
    return source.includes('USER PROVIDED')
        || source.includes('MY PACK')
        || (source.includes('PUBLIC PACK') && tags.includes('user-provided'));
}

function longPackStyle(pack) {
    const group = String(pack?.group || '').toLowerCase();
    const tags = Array.isArray(pack?.tags) ? pack.tags.join(' ').toLowerCase() : '';
    if (pack?.type === 'template') return 'custom-blue';
    if (isUserProvidedLongPack(pack)) return customPackStyle(`${pack.id}:${pack.title || pack.label || ''}`);
    if (group.includes('korean') || tags.includes('korean')) return 'vocab';
    if (group.includes('english') || tags.includes('english')) return 'js';
    if (group.includes('mixed') || tags.includes('mixed')) return 'http';
    return 'vocab';
}

function longPackChip(pack) {
    if (pack?.type === 'template') return 'PASTE';
    if (isUserProvidedLongPack(pack)) return 'USER';
    const group = String(pack?.group || '').toLowerCase();
    const tags = Array.isArray(pack?.tags) ? pack.tags.join(' ').toLowerCase() : '';
    if (group.includes('korean') || tags.includes('korean')) return 'KOR';
    if (group.includes('english') || tags.includes('english')) return 'ENG';
    if (group.includes('mixed') || tags.includes('mixed')) return 'MIX';
    return 'TEXT';
}

function packMetaFromLongPack(pack) {
    if (!pack) {
        return {
            value: longPackValue('__custom__'),
            title: longSelectorText('Paste Text', '직접 붙여넣기'),
            chip: 'PASTE',
            style: 'custom-blue',
            group: longSelectorText('Direct Input', '직접 입력'),
            longPackId: '__custom__',
            deletable: false
        };
    }
    const title = pack.title || pack.label || pack.id || 'Long Text';
    const userProvided = isUserProvidedLongPack(pack);
    return {
        value: longPackValue(pack.id),
        title,
        chip: longPackChip(pack),
        style: longPackStyle(pack),
        group: userProvided
            ? longSelectorText('My Text Packs', '내 장문팩')
            : pack.group || longSelectorText('Practice Texts', '추천 문장팩'),
        longPackId: pack.id,
        deletable: false
    };
}

function ensureSelectedLongPackId() {
    const packs = longPackListForSelector();
    if (selectedLongPackId && (selectedLongPackId === '__custom__' || packs.some(pack => pack.id === selectedLongPackId))) {
        return selectedLongPackId;
    }
    selectedLongPackId = longPackDefaultId(packs);
    return selectedLongPackId;
}

function longPackDefaultId(packs = longPackListForSelector()) {
    const saved = packs.find(isUserProvidedLongPack);
    if (saved) return saved.id;
    const featured = LONG_SELECTOR_FEATURED_IDS
        .map(id => packs.find(pack => pack.id === id))
        .find(Boolean);
    if (featured) return featured.id;
    const official = packs.find(pack => pack.type !== 'template');
    if (official) return official.id;
    const template = packs.find(pack => pack.id === 'template_lyrics_user_provided');
    return template?.id || '__custom__';
}

function longPackMetaForValue(value) {
    const packId = longPackIdFromValue(value) || ensureSelectedLongPackId();
    if (packId === '__custom__') return packMetaFromLongPack(null);
    return packMetaFromLongPack(longPackListForSelector().find(pack => pack.id === packId));
}

function selectedLongPackMeta() {
    return longPackMetaForValue(longPackValue(ensureSelectedLongPackId()));
}

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
        style: customPackStyle(`${value}:${option.textContent}`),
        group,
        customPackId: customPackIdFromValue(value),
        deletable: option.dataset.deletablePack === 'true'
    };
}

function packMetaForValue(value) {
    if (String(value || '').startsWith(LONG_SELECTOR_PREFIX)) return longPackMetaForValue(value);
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

function longPackGroupsForSelector() {
    const packs = longPackListForSelector();
    const byId = new Map(packs.map(pack => [pack.id, pack]));
    const savedItems = packs
        .filter(isUserProvidedLongPack)
        .map(packMetaFromLongPack);
    const inputItems = [];
    const lyricTemplate = byId.get('template_lyrics_user_provided');
    if (lyricTemplate) inputItems.push(packMetaFromLongPack(lyricTemplate));
    if (!lyricTemplate) inputItems.push(packMetaFromLongPack(null));
    const featuredItems = LONG_SELECTOR_FEATURED_IDS
        .map(id => byId.get(id))
        .filter(Boolean)
        .map(packMetaFromLongPack);

    return [
        savedItems.length ? { label: longSelectorText('My Text Packs', '내 장문팩'), items: savedItems } : null,
        featuredItems.length ? { label: longSelectorText('Recommended Practice', '추천 문장팩'), items: featuredItems } : null,
        { label: longSelectorText('Direct Input', '직접 입력'), items: inputItems }
    ].filter(Boolean);
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
    const style = String(meta.style || 'custom');
    logo.className = `pack-card-logo ${style.startsWith('custom') ? 'pack-logo-custom' : `pack-logo-${style}`}`;
    logo.setAttribute('aria-hidden', 'true');
    logo.textContent = packLogoText(style);
    if (style === 'python') {
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
    sfx.playPackLatch();
}

function isPointInsideElement(event, element) {
    if (!event || !element) return false;
    const rect = element.getBoundingClientRect();
    return event.clientX >= rect.left
        && event.clientX <= rect.right
        && event.clientY >= rect.top
        && event.clientY <= rect.bottom;
}

function setPackTrashReady(active, hot = false) {
    const trash = els.controls.packTrashZone;
    if (!trash) return;
    trash.classList.toggle('drag-ready', Boolean(active));
    trash.classList.toggle('drop-hot', Boolean(hot));
}

async function deletePackFromUi(meta) {
    if (!meta || !meta.deletable || !meta.customPackId) return false;
    const title = meta.title || 'Custom Pack';
    const result = await showCommandDialog({
        title: 'DELETE MY PACK',
        message: `${title} 팩을 삭제합니다. 삭제하면 SELECT PACK 목록과 전용 랭킹에서 사라집니다.`,
        okText: 'DELETE',
        cancelText: 'CANCEL',
        danger: true
    });
    if (!result.accepted) return false;

    try {
        if (!window.PackMaker || typeof window.PackMaker.deletePack !== 'function') {
            throw new Error('Pack Maker delete API unavailable');
        }
        await window.PackMaker.deletePack(meta.customPackId);
        const select = els.controls.packSelect;
        if (select && select.value === meta.value) {
            select.value = 'PYTHON';
            syncPackSelector();
            select.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            syncPackSelector();
            fetchLeaderboard();
        }
        renderLeaderboardMessage('PACK DELETED', 'var(--primary-neon)');
        return true;
    } catch (err) {
        await showCommandDialog({
            title: 'DELETE FAILED',
            message: err.message || 'Pack delete failed',
            okText: 'OK',
            cancelText: '',
            danger: true
        });
        return false;
    }
}

function createPackCard(meta) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `pack-cartridge pack-style-${meta.style}`;
    card.dataset.packValue = meta.value;
    card.dataset.packCard = 'true';
    card.dataset.deletablePack = meta.deletable ? 'true' : 'false';
    card.draggable = true;
    card.setAttribute('aria-label', `${meta.title} pack`);
    let pointerDrag = null;
    let mouseDrag = null;
    let suppressNextClick = false;

    const finishManualDrag = (event, dragState) => {
        card.classList.remove('dragging');
        if (els.controls.packConsole) els.controls.packConsole.classList.remove('drag-ready');
        setPackTrashReady(false);
        if (!dragState || !dragState.moved) return false;

        suppressNextClick = true;
        window.setTimeout(() => {
            suppressNextClick = false;
        }, 250);

        if (meta.deletable && isPointInsideElement(event, els.controls.packTrashZone)) {
            event.preventDefault();
            event.stopPropagation();
            deletePackFromUi(meta);
            return true;
        }

        const dock = els.controls.packConsoleDock;
        if (!dock) return false;
        if (!isPointInsideElement(event, dock)) return false;

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
            setPackTrashReady(meta.deletable, meta.deletable && isPointInsideElement(event, els.controls.packTrashZone));
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
            setPackTrashReady(meta.deletable, meta.deletable && isPointInsideElement(event, els.controls.packTrashZone));
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
        setPackTrashReady(false);
    });
    card.addEventListener('dragstart', event => {
        activePackDragMeta = meta;
        card.classList.add('dragging');
        event.dataTransfer.effectAllowed = meta.deletable ? 'copyMove' : 'copy';
        event.dataTransfer.setData('text/plain', meta.value);
        event.dataTransfer.setData('application/x-codedrop-pack-deletable', meta.deletable ? 'true' : 'false');
        setPackTrashReady(meta.deletable);
    });
    card.addEventListener('dragend', () => {
        activePackDragMeta = null;
        card.classList.remove('dragging');
        setPackTrashReady(false);
    });
    return card;
}

function renderPackCards() {
    const container = els.controls.packCardGroups;
    if (!container) return;
    container.replaceChildren();
    const currentValue = isLongSelectorMode()
        ? longPackValue(ensureSelectedLongPackId())
        : (els.controls.packSelect ? els.controls.packSelect.value : '');

    const groups = isLongSelectorMode() ? longPackGroupsForSelector() : packGroupsFromSelect();
    groups.forEach(group => {
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
    const longMode = isLongSelectorMode();
    const option = selectedPackOption();
    const meta = longMode ? selectedLongPackMeta() : packMetaFromOption(option);
    const controls = els.controls;
    const packGroupLabel = document.querySelector('#drop-pack-group > label');
    const packTriggerKicker = controls.packTrigger?.querySelector('.pack-trigger-kicker');
    const popoverTitle = controls.packPopover?.querySelector('.pack-popover-head > span');
    if (controls.packSelector) controls.packSelector.classList.toggle('long-mode', longMode);
    if (packGroupLabel) packGroupLabel.textContent = longMode ? t('menu.selectText') : t('menu.selectPack');
    if (packTriggerKicker) packTriggerKicker.textContent = longMode ? t('menu.selectText') : t('menu.selectPack');
    if (popoverTitle) popoverTitle.textContent = longMode ? t('menu.selectTextCartridge') : t('menu.selectCartridge');
    if (controls.packCurrentTitle) controls.packCurrentTitle.textContent = meta.title;
    if (controls.packCurrentChip) controls.packCurrentChip.textContent = meta.chip;
    if (controls.packDockLabel) controls.packDockLabel.textContent = longMode
        ? (meta.chip ? `${meta.chip} TEXT` : 'TEXT DOCK')
        : (meta.chip ? `${meta.chip} DOCK` : 'PACK DOCK');
    if (controls.packTrashZone) controls.packTrashZone.classList.toggle('hidden', longMode);
    if (controls.packConsoleStatusArt && controls.packConsole && !controls.packConsole.classList.contains('pack-inserting')) {
        controls.packConsoleStatusArt.textContent = '';
    }
    if (controls.packConsole) {
        controls.packConsole.dataset.packValue = meta.value || (longMode ? longPackValue(ensureSelectedLongPackId()) : 'PYTHON');
        controls.packConsole.className = `pack-console pack-style-${meta.style}`;
    }
    renderPackCards();
}

function forceStudyDropPackSync({ notify = true } = {}) {
    const select = els.controls.packSelect;
    if (!select) return;
    const packValue = currentStudyConfig()?.dropPack || 'OC_CORE';
    const hasStudyPack = Array.from(select.options).some(option => option.value === packValue);
    if (!hasStudyPack) return;

    const changed = select.value !== packValue;
    select.value = packValue;
    syncPackSelector();
    closePackPopover();

    if (changed && notify) {
        select.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

function forceOcpDropPackSync(options) {
    forceStudyDropPackSync(options);
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
    if (isLongSelectorMode()) {
        const packId = longPackIdFromValue(value);
        if (!packId) return;
        selectedLongPackId = packId;
        syncPackSelector();
        if (sourceEl && sourceEl.classList) {
            sourceEl.classList.add('selected');
        }
        playPackLatchSound();
        window.setTimeout(closePackPopover, 220);
        return;
    }

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
    if (controls.packTrashZone) {
        controls.packTrashZone.addEventListener('dragover', event => {
            const value = event.dataTransfer.getData('text/plain');
            const meta = activePackDragMeta || (value ? packMetaForValue(value) : null);
            if (!meta || !meta.deletable) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            setPackTrashReady(true, true);
        });
        controls.packTrashZone.addEventListener('dragleave', () => setPackTrashReady(false));
        controls.packTrashZone.addEventListener('drop', event => {
            event.preventDefault();
            event.stopPropagation();
            setPackTrashReady(false);
            const value = event.dataTransfer.getData('text/plain');
            const meta = activePackDragMeta || (value ? packMetaForValue(value) : null);
            activePackDragMeta = null;
            if (!meta || !meta.deletable) return;
            deletePackFromUi(meta);
        });
    }
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

function normalizeSessionMode(value) {
    return value === 'STUDY' ? 'STUDY' : 'MISSION';
}

function isStudyMode() {
    return state.playMode === 'STUDY';
}

function activeStudyTimeInput() {
    if (isStudyEditionActive() && els.controls.ocpStudyTimeInput) {
        return els.controls.ocpStudyTimeInput;
    }
    return els.controls.studyTimeInput;
}

function parseStudyDurationMs() {
    const input = activeStudyTimeInput();
    const minutes = Number(input && input.value ? input.value : 0);
    if (!Number.isFinite(minutes) || minutes <= 0) return 0;
    return Math.min(minutes, 240) * 60_000;
}

function formatStudyTime(ms) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

function updateStudyTimerHUD() {
    if (!els.hud.studyTimer || !isStudyMode() || !state.startTime) return;
    const timerMs = state.studyEndsAt
        ? state.studyEndsAt - Date.now()
        : Date.now() - state.startTime;
    els.hud.studyTimer.textContent = formatStudyTime(timerMs);
}

function syncStudyDifficultyControls() {
    if (els.controls.studyTimeRow) {
        els.controls.studyTimeRow.classList.toggle('hidden', !isStudyDifficulty(els.controls.diffSelect && els.controls.diffSelect.value));
    }
    if (els.controls.ocpStudyTimeRow) {
        const ocpDiff = document.getElementById('ocp-difficulty-select');
        els.controls.ocpStudyTimeRow.classList.toggle('hidden', !isStudyDifficulty(ocpDiff && ocpDiff.value));
    }
}

function setSessionMode(mode) {
    const nextMode = normalizeSessionMode(mode);
    if (els.controls.diffSelect) els.controls.diffSelect.value = nextMode === 'STUDY' ? 'STUDY' : 'NORMAL';
    syncStudyDifficultyControls();
}

function initSessionModeControls() {
    syncStudyDifficultyControls();
}

window.CodeDropPackSelector = {
    refresh: syncPackSelector,
    render: renderPackCards,
    select: selectPackFromUi
};

function leaderboardSelection() {
    const studyConfig = currentStudyConfig();
    if (studyConfig) {
        const ocpDiff = document.getElementById('ocp-difficulty-select');
        return {
            diff: effectiveDifficultyKey((ocpDiff && ocpDiff.value) || 'NORMAL').toLowerCase(),
            pack: String(studyConfig.dropPack || 'OC_CORE').toLowerCase(),
            customPackId: null
        };
    }

    const packValue = els.controls.packSelect.value;
    return {
        diff: effectiveDifficultyKey(els.controls.diffSelect.value).toLowerCase(),
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
    document.body.classList.toggle('study-active', Boolean(state.isPlaying && isStudyMode()));

    const diffKey = effectiveDifficultyKey(state.difficulty);
    els.hud.diff.textContent = isStudyMode() ? 'STUDY' : diffKey;

    // Update Pause Button Text
    if (els.hud.btnPause) {
        els.hud.btnPause.textContent = state.isPaused ? "RESUME" : "PAUSE";
    }

    if (isStudyMode()) {
        els.hud.progress.textContent = `∞ / ${state.spawnedCount}`;
        els.hud.lives.textContent = '∞';
        updateStudyTimerHUD();
        return;
    }

    els.hud.progress.textContent = `${state.spawnedCount}/100`;
    if (els.hud.studyTimer) els.hud.studyTimer.textContent = '00:00';

    let hearts = '';
    for (let i = 0; i < state.lives; i++) hearts += '♥';
    els.hud.lives.textContent = hearts;
}

function gameLoop(timestamp) {
    if (!state.isPlaying) return;

    if (state.isPaused) {
        updateBottomWidgetOverlap(timestamp);
        requestAnimationFrame(gameLoop);
        return;
    }

    const diffKey = effectiveDifficultyKey(state.difficulty);
    const diffConfig = DIFFICULTY[diffKey];
    const playfieldHeight = els.gameArea.clientHeight;

    if (isStudyMode() && state.studyEndsAt && Date.now() >= state.studyEndsAt) {
        state.endReason = 'study-time';
        updateStudyTimerHUD();
        gameOver(true);
        return;
    }
    updateStudyTimerHUD();

    // Spawning
    if (isStudyMode() || state.spawnedCount < 100) {
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
    const diffKey = effectiveDifficultyKey(state.difficulty);
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

function isCaseInsensitivePackActive() {
    return Boolean(customPackIdFromValue(state.pack));
}

function normalizeWordMatchValue(value) {
    const text = String(value || '');
    return isCaseInsensitivePackActive() ? text.toLocaleLowerCase('en-US') : text;
}

function wordStartsWithInput(wordText, inputText) {
    return normalizeWordMatchValue(wordText).startsWith(normalizeWordMatchValue(inputText));
}

function wordEqualsInput(wordText, inputText) {
    return normalizeWordMatchValue(wordText) === normalizeWordMatchValue(inputText);
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
        const matches = state.activeWords.filter(w => wordStartsWithInput(w.text, inputVal));

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
        if (!target || !wordStartsWithInput(target.text, inputVal)) {
            // Reset target
            state.targetId = null;
            state.activeWords.forEach(w => w.el.classList.remove('target'));

            const matches = state.activeWords.filter(w => wordStartsWithInput(w.text, inputVal));
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

    if (e.key === 'Enter' && (e.isComposing || e.keyCode === 229)) {
        return;
    }

    CodeDropTypingSfx.play(e, { source: 'drop', force: true });

    if (e.key === 'Enter') {
        e.preventDefault();
        const inputVal = els.input.field.value;
        if (!inputVal) {
            return;
        }

        let targetIndex = state.targetId
            ? state.activeWords.findIndex(w => w.id === state.targetId)
            : -1;

        if (targetIndex === -1 || !wordEqualsInput(state.activeWords[targetIndex]?.text, inputVal)) {
            targetIndex = state.activeWords.findIndex(w => wordEqualsInput(w.text, inputVal));
        }

        if (targetIndex !== -1) {
            successWord(targetIndex);
        } else {
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
    if (isStudyMode()) {
        state.combo = 0;
        updateHUD();
        els.hud.lives.style.opacity = 0.5;
        setTimeout(() => els.hud.lives.style.opacity = 1, 200);
        return;
    }

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
    const wasStudyMode = isStudyMode();
    const studyTimedOut = state.endReason === 'study-time';

    // Update Result Screen
    const resultSuccess = wasStudyMode || victory;
    els.result.title.textContent = wasStudyMode
        ? (studyTimedOut ? "STUDY COMPLETE" : "STUDY SESSION")
        : (victory ? "MISSION COMPLETE" : "SYSTEM FAILURE");
    els.result.title.style.color = resultSuccess ? "var(--success-color)" : "var(--danger-color)";
    els.result.title.style.textShadow = resultSuccess ? "0 0 20px var(--success-color)" : "0 0 20px var(--danger-color)";

    els.result.score.textContent = state.score;
    els.result.combo.textContent = state.maxCombo;
    els.result.wpm.textContent = wpm;
    els.result.acc.textContent = accuracy + "%";

    els.screens.result.classList.remove('hidden');
    syncOverlayChrome();

    if (wasStudyMode) {
        els.result.status.textContent = t('score.studyMode');
        return;
    }

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
                    difficulty: effectiveDifficultyKey(state.difficulty).toLowerCase()
                }
                : {
                    score: state.score,
                    wpm: wpm,
                    accuracy: accuracy,
                    difficulty: effectiveDifficultyKey(state.difficulty).toLowerCase(),
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
let activeStudyEditionKey = '';

const STUDY_EDITION_CONFIGS = {
    ocp: {
        key: 'ocp',
        bodyClass: 'ocp-edition',
        dropPack: 'OC_CORE',
        incidentCategory: 'INCIDENTS',
        routes: {
            home: 'ocp',
            play: 'ocpPlay',
            learn: 'ocpLearn',
            scenario: 'ocpScenario',
            lab: 'ocpLab',
            incident: 'ocpIncident',
            exam: 'ocpExam',
            dashboard: 'ocpDashboard'
        },
        packs: () => (typeof SCENARIO_PACKS !== 'undefined' ? SCENARIO_PACKS : {}),
        labs: () => (typeof MOCK_LABS !== 'undefined' ? MOCK_LABS : []),
        lessons: () => (typeof LESSON_TRACKS !== 'undefined' ? LESSON_TRACKS : []),
        examBlueprint: () => (typeof EXAM_BLUEPRINT !== 'undefined' ? EXAM_BLUEPRINT : null),
        copy: {
            title: 'OCP EDITION',
            subtitle: 'EX280 실전 학습 덱',
            learn: '학습 모드',
            learnDesc: '처음이라면 여기부터 — 따라치며 배우는 EX280',
            drop: 'CLI DROP',
            dropDesc: 'OC 핵심 명령 낙하 타자',
            scenario: '시나리오',
            scenarioDesc: '상황별 명령 10문제',
            lab: '모의 랩',
            labDesc: '실전 절차 훈련',
            incident: '진단훈련',
            incidentDesc: 'CrashLoop, Pending, RBAC, SCC 원인 찾기',
            exam: '시험 모드',
            examDesc: '15문제 · 90초',
            fixedPack: 'OpenShift CLI (EX280) 팩으로 고정됩니다.',
            start: 'START OCP',
            dashboard: '학습 대시보드',
            dropDifficulty: 'CLI 드롭 난이도',
            scenarioCategory: '시나리오 카테고리',
            mockLab: '모의 랩 선택',
            examLabel: 'EX280 모의시험',
            examInfo: '15문제 · 문제당 90초 · 힌트 없음 · 70% 이상 합격'
        }
    },
    github: {
        key: 'github',
        bodyClass: 'github-edition',
        dropPack: 'GITHUB_CORE',
        incidentCategory: 'GITHUB_INCIDENTS',
        routes: {
            home: 'github',
            play: 'githubPlay',
            learn: 'githubLearn',
            scenario: 'githubScenario',
            lab: 'githubLab',
            incident: 'githubIncident',
            exam: 'githubExam',
            dashboard: 'githubDashboard'
        },
        packs: () => (typeof GITHUB_SCENARIO_PACKS !== 'undefined' ? GITHUB_SCENARIO_PACKS : {}),
        labs: () => (typeof GITHUB_MOCK_LABS !== 'undefined' ? GITHUB_MOCK_LABS : []),
        lessons: () => (typeof GITHUB_LESSON_TRACKS !== 'undefined' ? GITHUB_LESSON_TRACKS : []),
        examBlueprint: () => (typeof GITHUB_EXAM_BLUEPRINT !== 'undefined' ? GITHUB_EXAM_BLUEPRINT : null),
        copy: {
            title: 'GITHUB EDITION',
            subtitle: 'GitHub 자격증 실전 학습 덱',
            learn: '학습 모드',
            learnDesc: 'Foundations부터 Copilot까지 따라치며 정리',
            drop: 'GITHUB DROP',
            dropDesc: 'GitHub 핵심 용어 낙하 타자',
            scenario: '시나리오',
            scenarioDesc: 'Actions, 보안, 관리 상황별 문제',
            lab: '모의 랩',
            labDesc: '워크플로, 브랜치 보호, 보안 절차 훈련',
            incident: '진단훈련',
            incidentDesc: 'Action 실패, 권한, Secret, 보안 알림 원인 찾기',
            exam: '시험 모드',
            examDesc: '5개 GitHub 자격증 범위',
            fixedPack: 'GitHub Certification 핵심 팩으로 고정됩니다.',
            start: 'START GITHUB',
            dashboard: 'GitHub 학습 대시보드',
            dropDifficulty: 'GitHub 드롭 난이도',
            scenarioCategory: 'GitHub 시나리오 카테고리',
            mockLab: 'GitHub 모의 랩 선택',
            examLabel: 'GitHub Certification',
            examInfo: 'Foundations, Actions, Security, Admin, Copilot · 15문제 · 90초'
        },
        copyEn: {
            title: 'GITHUB EDITION',
            subtitle: 'GitHub certification practice deck',
            learn: 'LEARN MODE',
            learnDesc: 'Type through Foundations, Actions, Security, Admin, and Copilot',
            drop: 'GITHUB DROP',
            dropDesc: 'Falling typing drill for core GitHub terms',
            scenario: 'SCENARIO',
            scenarioDesc: 'Situational drills for Actions, security, and administration',
            lab: 'MOCK LAB',
            labDesc: 'Workflow, branch protection, and security procedure training',
            incident: 'INCIDENT DRILL',
            incidentDesc: 'Diagnose Actions failures, permissions, secrets, and alerts',
            exam: 'EXAM MODE',
            examDesc: 'Five GitHub certification domains',
            fixedPack: 'Fixed to the GitHub Certification core pack.',
            start: 'START GITHUB',
            dashboard: 'GitHub Study Dashboard',
            dropDifficulty: 'GitHub Drop Difficulty',
            scenarioCategory: 'GitHub Scenario Category',
            mockLab: 'GitHub Mock Lab',
            examLabel: 'GitHub Certification',
            examInfo: 'Foundations, Actions, Security, Admin, Copilot · 15 questions · 90 seconds'
        }
    }
};

function isOcpEditionActive() {
    return document.body.classList.contains('ocp-edition');
}

function currentStudyConfig() {
    return STUDY_EDITION_CONFIGS[activeStudyEditionKey] || null;
}

function isStudyEditionActive() {
    return Boolean(currentStudyConfig());
}

function currentStudyHomeRoute() {
    return currentStudyConfig()?.routes?.home || 'home';
}

function currentStudyPlayRoute() {
    return currentStudyConfig()?.routes?.play || 'play';
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

function getOcpPracticeStyle() {
    const active = document.querySelector('#practice-style-toggle [data-practice-style].active');
    return active && active.dataset.practiceStyle === 'follow' ? 'follow' : 'solve';
}

function handleStart() {
    const studyConfig = currentStudyConfig();
    if (!studyConfig) {
        handleStandardStart();
        return;
    }
    const practiceStyle = getOcpPracticeStyle();
    if (gameMode === 'LEARN') {
        navigateAppRoute(studyConfig.routes.learn);
        els.screens.start.classList.add('hidden');
        LearnMode.openPicker({ practiceMode: practiceStyle });
    } else if (gameMode === 'SCENARIO') {
        navigateAppRoute(studyConfig.routes.scenario);
        const catSelect = document.getElementById('scenario-category-select');
        els.screens.start.classList.add('hidden');
        if (practiceStyle === 'follow') ScenarioMode.startGuided(catSelect.value);
        else ScenarioMode.start(catSelect.value);
    } else if (gameMode === 'LAB') {
        navigateAppRoute(studyConfig.routes.lab);
        const labSelect = document.getElementById('lab-select');
        els.screens.start.classList.add('hidden');
        if (practiceStyle === 'follow') LabMode.startGuided(labSelect.value);
        else LabMode.start(labSelect.value);
    } else if (gameMode === 'INCIDENT') {
        navigateAppRoute(studyConfig.routes.incident);
        els.screens.start.classList.add('hidden');
        if (practiceStyle === 'follow') ScenarioMode.startGuided(studyConfig.incidentCategory);
        else ScenarioMode.startIncidentDrill();
    } else if (gameMode === 'EXAM') {
        navigateAppRoute(studyConfig.routes.exam);
        els.screens.start.classList.add('hidden');
        ScenarioMode.startExam();
    } else {
        if (isStudyEditionActive()) {
            const ocpDiff = document.getElementById('ocp-difficulty-select');
            if (ocpDiff) els.controls.diffSelect.value = ocpDiff.value;
            forceStudyDropPackSync({ notify: false });
        }
        startGame();
    }
}

function handleStandardStart() {
    if (standardMode === 'LONG') {
        const packId = ensureSelectedLongPackId();
        navigateAppRoute('longPractice');
        window.LongPractice?.open({ packId, autoStart: true });
        return;
    }

    startGame();
}

function syncStandardModeUi() {
    const buttons = Array.from(document.querySelectorAll('[data-standard-mode]'));
    buttons.forEach(btn => btn.classList.toggle('active', btn.dataset.standardMode === standardMode));
    if (els.controls.startBtn) {
        els.controls.startBtn.textContent = standardMode === 'LONG'
            ? t('menu.startLongPractice')
            : t('menu.startCodedrop');
    }
    syncPackSelector();
}

function setStandardMode(mode) {
    standardMode = mode === 'LONG' ? 'LONG' : 'DROP';
    syncStandardModeUi();
}

function initStandardModeControls() {
    const buttons = Array.from(document.querySelectorAll('[data-standard-mode]'));
    if (buttons.length === 0) return;

    buttons.forEach(btn => {
        btn.addEventListener('click', () => setStandardMode(btn.dataset.standardMode));
    });

    syncStandardModeUi();
}

function initModeControls() {
    const modeButtons = Array.from(document.querySelectorAll('[data-mode]'));
    const catSelect = document.getElementById('scenario-category-select');
    const labSelect = document.getElementById('lab-select');
    const standardMenu = document.getElementById('standard-menu');
    const ocpMenu = document.getElementById('ocp-menu');
    const editionCodeBtn = document.getElementById('edition-code-btn');
    const editionOcpBtn = document.getElementById('edition-ocp-btn');
    const editionGithubBtn = document.getElementById('edition-github-btn');
    const ocpDiffSelect = document.getElementById('ocp-difficulty-select');
    const ocpStartBtn = document.getElementById('ocp-start-btn');
    const dashboardBtn = document.getElementById('dashboard-btn');
    const practiceStyleGroup = document.getElementById('practice-style-group');
    const practiceStyleButtons = Array.from(document.querySelectorAll('[data-practice-style]'));
    const practiceStyleInfo = document.getElementById('practice-style-info');
    const modeGroups = {
        LEARN: ['learn-info-group'],
        DROP: ['ocp-drop-group'],
        SCENARIO: ['scenario-select-group'],
        LAB: ['lab-select-group'],
        INCIDENT: [],
        EXAM: ['exam-info-group']
    };

    if (modeButtons.length === 0) return;
    initStandardModeControls();
    initDifficultyPickers();

    function configureStudyModules(config) {
        if (!config) return;
        if (typeof ScenarioMode !== 'undefined') {
            ScenarioMode.configure({
                packs: config.packs,
                examBlueprint: config.examBlueprint,
                bestKey: `codedrop_${config.key}_scenario_best`,
                incidentCategory: config.incidentCategory,
                examLabel: config.copy.examLabel,
                edition: config.key
            });
        }
        if (typeof LabMode !== 'undefined') {
            LabMode.configure({
                labs: config.labs,
                bestKey: `codedrop_${config.key}_lab_best`,
                trackTitle: `${config.copy.title} Mock Labs`,
                edition: config.key
            });
        }
        if (typeof LearnMode !== 'undefined') {
            LearnMode.configure({
                tracks: config.lessons,
                scenarioPacks: config.packs,
                edition: config.key,
                progressKey: `codedrop_${config.key}_learn_progress`
            });
        }
    }

    function populateStudySelectors(config) {
        if (!config) return;
        if (catSelect) {
            catSelect.replaceChildren();
            Object.entries(config.packs()).forEach(([key, pack]) => {
                if (key === config.incidentCategory) return;
                const opt = document.createElement('option');
                opt.value = key;
                opt.textContent = pack.label;
                catSelect.appendChild(opt);
            });
        }

        if (labSelect) {
            labSelect.replaceChildren();
            config.labs().forEach((lab, index) => {
                const opt = document.createElement('option');
                opt.value = lab.id;
                opt.textContent = `${String(index + 1).padStart(2, '0')}. ${lab.title}`;
                labSelect.appendChild(opt);
            });
        }
    }

    function applyStudyEditionCopy(config) {
        if (!config) return;
        const copy = config.key === 'github' && appLang() === 'en' && config.copyEn
            ? config.copyEn
            : config.copy;
        const setText = (selector, text) => {
            const el = document.querySelector(selector);
            if (el && text) el.textContent = text;
        };
        const setModeCopy = (mode, title, desc) => {
            const btn = document.querySelector(`[data-mode="${mode}"]`);
            if (!btn) return;
            const strong = btn.querySelector('strong');
            const span = btn.querySelector('span');
            if (strong && title) strong.textContent = title;
            if (span && desc) span.textContent = desc;
        };

        setText('.ocp-title', copy.title);
        setText('.ocp-subtitle', copy.subtitle);
        setModeCopy('LEARN', copy.learn, copy.learnDesc);
        setModeCopy('DROP', copy.drop, copy.dropDesc);
        setModeCopy('SCENARIO', copy.scenario, copy.scenarioDesc);
        setModeCopy('LAB', copy.lab, copy.labDesc);
        setModeCopy('INCIDENT', copy.incident, copy.incidentDesc);
        setModeCopy('EXAM', copy.exam, copy.examDesc);
        setText('#ocp-drop-group > label', copy.dropDifficulty);
        setText('#ocp-drop-group .mode-info', copy.fixedPack);
        setText('#scenario-select-group > label', copy.scenarioCategory);
        setText('#lab-select-group > label', copy.mockLab);
        setText('#exam-info-group > label', copy.examLabel);
        setText('#exam-info-group .mode-info', copy.examInfo);
        if (ocpStartBtn) ocpStartBtn.textContent = copy.start;
        if (dashboardBtn) dashboardBtn.textContent = copy.dashboard;
    }

    // 초기 OCP 데이터로 기본 셀렉터를 채운다. 에디션 전환 시 아래에서 다시 교체된다.
    if (catSelect && catSelect.options.length === 0) {
        Object.entries(STUDY_EDITION_CONFIGS.ocp.packs()).forEach(([key, pack]) => {
            if (key === STUDY_EDITION_CONFIGS.ocp.incidentCategory) return;
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = pack.label;
            catSelect.appendChild(opt);
        });
    }

    if (labSelect && labSelect.options.length === 0) {
        STUDY_EDITION_CONFIGS.ocp.labs().forEach((lab, index) => {
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

        if (practiceStyleGroup) {
            practiceStyleGroup.classList.toggle('hidden', !['LEARN', 'SCENARIO', 'LAB', 'INCIDENT'].includes(mode));
        }

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

        if (mode === 'DROP' && isStudyEditionActive()) {
            forceStudyDropPackSync();
        }
        syncStudyDifficultyControls();
    }

    function setEditionButtons(activeKey) {
        if (editionCodeBtn) editionCodeBtn.classList.toggle('active', !activeKey);
        if (editionOcpBtn) editionOcpBtn.classList.toggle('active', activeKey === 'ocp');
        if (editionGithubBtn) editionGithubBtn.classList.toggle('active', activeKey === 'github');
    }

    function clearStudyEditionClasses() {
        Object.values(STUDY_EDITION_CONFIGS).forEach(config => {
            document.body.classList.remove(config.bodyClass);
        });
    }

    function openStudyEdition(key = 'ocp') {
        const config = STUDY_EDITION_CONFIGS[key] || STUDY_EDITION_CONFIGS.ocp;
        navigateAppRoute(config.routes.home);
        if (activeStudyEditionKey === config.key) {
            configureStudyModules(config);
            populateStudySelectors(config);
            applyStudyEditionCopy(config);
            setMode('DROP');
            forceStudyDropPackSync();
            return;
        }
        clearStudyEditionClasses();
        activeStudyEditionKey = config.key;
        document.body.classList.add(config.bodyClass);
        sfx.playEditionBurst();
        triggerEditionBurst();
        if (standardMenu) standardMenu.classList.add('hidden');
        if (ocpMenu) ocpMenu.classList.remove('hidden');
        setEditionButtons(config.key);
        configureStudyModules(config);
        populateStudySelectors(config);
        applyStudyEditionCopy(config);
        setMode('DROP');
        forceStudyDropPackSync({ notify: false });
        fetchLeaderboard();
    }

    function closeStudyEdition() {
        navigateAppRoute('home');
        if (!isStudyEditionActive()) return;
        sfx.playEditionBurst();
        triggerEditionBurst();
        clearStudyEditionClasses();
        activeStudyEditionKey = '';
        if (ocpMenu) ocpMenu.classList.add('hidden');
        if (standardMenu) standardMenu.classList.remove('hidden');
        setEditionButtons('');
        setMode('DROP');
        fetchLeaderboard();
    }

    function openOcpEdition() {
        openStudyEdition('ocp');
    }

    function openGithubEdition() {
        openStudyEdition('github');
    }

    function closeOcpEdition() {
        closeStudyEdition();
    }

    function refreshActiveCopy() {
        const config = currentStudyConfig();
        if (config) applyStudyEditionCopy(config);
    }

    window.CodeDropModeControls = {
        openStudyEdition,
        closeStudyEdition,
        openOcpEdition,
        closeOcpEdition,
        openGithubEdition,
        setMode,
        refreshActiveCopy,
        currentMode: () => gameMode,
        currentConfig: currentStudyConfig
    };

    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });

    practiceStyleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            practiceStyleButtons.forEach(item => item.classList.toggle('active', item === btn));
            if (practiceStyleInfo) {
                practiceStyleInfo.textContent = t(btn.dataset.practiceStyle === 'follow'
                    ? 'ocp.practiceFollowInfo'
                    : 'ocp.practiceSolveInfo');
            }
        });
    });

    if (editionOcpBtn) {
        editionOcpBtn.addEventListener('click', openOcpEdition);
    }

    if (editionGithubBtn) {
        editionGithubBtn.addEventListener('click', openGithubEdition);
    }

    if (editionCodeBtn) {
        editionCodeBtn.addEventListener('click', closeStudyEdition);
    }

    if (ocpStartBtn) {
        ocpStartBtn.addEventListener('click', handleStart);
    }

    if (dashboardBtn) {
        dashboardBtn.addEventListener('click', () => {
            navigateAppRoute(currentStudyConfig()?.routes.dashboard || 'ocpDashboard');
            Dashboard.open();
        });
    }

    if (els.controls.diffSelect) {
        els.controls.diffSelect.addEventListener('change', () => {
            syncStudyDifficultyControls();
            fetchLeaderboard();
        });
    }
    if (els.controls.packSelect) {
        els.controls.packSelect.addEventListener('change', fetchLeaderboard);
    }
    if (ocpDiffSelect) {
        ocpDiffSelect.addEventListener('change', () => {
            syncStudyDifficultyControls();
            fetchLeaderboard();
        });
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
    const playMode = isStudyDifficulty(diff) ? 'STUDY' : 'MISSION';
    if (!await ensureSelectedPackReady(pack)) return;
    navigateAppRoute(isStudyEditionActive() ? currentStudyPlayRoute() : 'play');
    sfx.playBoot();

    state.difficulty = diff;
    state.pack = pack;
    state.playMode = playMode;
    state.studyDurationMs = playMode === 'STUDY' ? parseStudyDurationMs() : 0;
    state.studyEndsAt = state.studyDurationMs > 0 ? Date.now() + state.studyDurationMs : 0;
    state.endReason = '';
    state.pauseStartedAt = 0;
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

}

function togglePause() {
    if (!state.isPlaying) return;

    state.isPaused = !state.isPaused;

    if (state.isPaused) {
        state.pauseStartedAt = Date.now();
        els.hud.btnPause.textContent = "PLAY";
        els.screens.pause.classList.remove('hidden');
        els.input.field.disabled = true;
    } else {
        if (isStudyMode() && state.studyEndsAt && state.pauseStartedAt) {
            state.studyEndsAt += Date.now() - state.pauseStartedAt;
        }
        state.pauseStartedAt = 0;
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
    state.studyDurationMs = 0;
    state.studyEndsAt = 0;
    state.endReason = '';
    state.pauseStartedAt = 0;

    // Clear game area
    els.gameArea.innerHTML = '';
    state.activeWords = [];

    fetchLeaderboard();
    initGameControls();
    navigateAppRoute(isStudyEditionActive() ? currentStudyHomeRoute() : 'home', { replace: true });
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
    state.studyDurationMs = 0;
    state.studyEndsAt = 0;
    state.endReason = '';
    state.pauseStartedAt = 0;
    fetchLeaderboard();
    navigateAppRoute(isStudyEditionActive() ? currentStudyHomeRoute() : 'home', { replace: true });
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

function tutorialOverlay() {
    return document.getElementById('tutorial-overlay');
}

function openTutorialOverlay(options = {}) {
    const overlay = tutorialOverlay();
    if (!overlay) return;

    const manual = Boolean(options.manual);
    overlay.dataset.tutorialLang = appLang();
    overlay.classList.remove('hidden');
    if (!manual) {
        localStorage.setItem(TUTORIAL_SEEN_STORAGE_KEY, '1');
    }
    if (options.sound !== false) sfx.playKey('Enter');
}

function closeTutorialOverlay() {
    const overlay = tutorialOverlay();
    if (overlay) overlay.classList.add('hidden');
    localStorage.setItem(TUTORIAL_SEEN_STORAGE_KEY, '1');
}

function maybeShowFirstRunTutorial() {
    if (localStorage.getItem(TUTORIAL_SEEN_STORAGE_KEY) === '1') return;

    window.setTimeout(() => {
        if (localStorage.getItem(TUTORIAL_SEEN_STORAGE_KEY) === '1') return;
        const blockingScreens = [
            'confirm-screen',
            'pack-maker-screen',
            'admin-pack-screen',
            'keyboard-test-screen',
            'learn-screen',
            'dashboard-screen'
        ];
        const blocked = state.isPlaying || blockingScreens.some(id => {
            const el = document.getElementById(id);
            return el && !el.classList.contains('hidden');
        });
        if (!blocked) openTutorialOverlay({ manual: false, sound: false });
    }, 650);
}

function handleTutorialCloseClick() {
    closeTutorialOverlay();
}

function handleTutorialOverlayClick(e) {
    if (e.target === e.currentTarget) closeTutorialOverlay();
}

function handleReadmeTutorialClick(e) {
    e.preventDefault();
    const readmeOverlay = document.getElementById('readme-overlay');
    if (readmeOverlay) readmeOverlay.classList.add('hidden');
    openTutorialOverlay({ manual: true });
}

function handleTutorialKeydown(e) {
    if (e.key !== 'Escape') return;
    const overlay = tutorialOverlay();
    if (overlay && !overlay.classList.contains('hidden')) closeTutorialOverlay();
}

function normalizeAppLanguage(value) {
    return value === 'ko' ? 'ko' : 'en';
}

function appLang() {
    return normalizeAppLanguage(
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

function setPreviousText(selector, key) {
    const el = document.querySelector(selector);
    if (el?.previousElementSibling) el.previousElementSibling.textContent = t(key);
}

function setOptionText(selector, key) {
    document.querySelectorAll(selector).forEach(option => {
        option.textContent = t(key);
    });
}

function setAttribute(selector, attr, key) {
    document.querySelectorAll(selector).forEach(el => {
        el.setAttribute(attr, t(key));
    });
}

function updateWelcomeText() {
    const welcome = document.querySelector('.welcome-msg');
    if (welcome && welcome.firstChild) {
        welcome.firstChild.nodeValue = t('auth.welcome');
    }
}

function applyAppLanguage(value) {
    const lang = normalizeAppLanguage(value);
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
    setText('#study-time-row label', 'menu.studyTime');
    setText('#ocp-study-time-row label', 'menu.studyTime');
    setPlaceholder('#study-time-input', 'menu.studyTimePlaceholder');
    setPlaceholder('#ocp-study-time-input', 'menu.studyTimePlaceholder');
    setText('#drop-pack-group > label', 'menu.selectPack');
    setText('.pack-trigger-kicker', 'menu.selectPack');
    setText('.pack-popover-head > span', 'menu.selectCartridge');
    setText('#pack-popover-close', 'menu.close');
    setText('#pack-trash-zone span', 'menu.deletePackHint');
    setText('#start-btn', 'menu.startCodedrop');
    setText('#pack-maker-btn', 'menu.packMaker');
    setText('#keyboard-test-btn', 'menu.keyTest');
    setText('#leaderboard-preview h3', 'menu.topAgents');
    setText('[data-standard-mode="DROP"] span', 'menu.dropDesc');
    setText('[data-standard-mode="LONG"] span', 'menu.longDesc');
    const standardModeGrid = document.getElementById('standard-mode-grid');
    if (standardModeGrid) standardModeGrid.setAttribute('aria-label', lang === 'en' ? 'CodeDrop practice mode' : 'CodeDrop 연습 모드');
    const packSelect = document.getElementById('pack-select');
    if (packSelect) packSelect.setAttribute('aria-label', lang === 'en' ? 'Select CodeDrop data pack' : 'CodeDrop 데이터 팩 선택');
    syncStandardModeUi();
    setOptionText('#difficulty-select option[value="EASY"], #ocp-difficulty-select option[value="EASY"]', 'difficulty.easy');
    setOptionText('#difficulty-select option[value="NORMAL"], #ocp-difficulty-select option[value="NORMAL"]', 'difficulty.normal');
    setOptionText('#difficulty-select option[value="DEVELOPER"], #ocp-difficulty-select option[value="DEVELOPER"]', 'difficulty.developer');
    setOptionText('#difficulty-select option[value="STUDY"], #ocp-difficulty-select option[value="STUDY"]', 'difficulty.study');
    refreshDifficultyPickers();
    syncStudyDifficultyControls();

    setText('.ocp-title', 'ocp.title');
    setText('.ocp-subtitle', 'ocp.subtitle');
    setText('#mode-learn strong', 'ocp.learn');
    setText('#mode-learn span', 'ocp.learnDesc');
    setText('#mode-drop span', 'ocp.dropDesc');
    setText('#mode-scenario strong', 'ocp.scenario');
    setText('#mode-scenario span', 'ocp.scenarioDesc');
    setText('#mode-lab strong', 'ocp.lab');
    setText('#mode-lab span', 'ocp.labDesc');
    setText('#mode-incident strong', 'ocp.incident');
    setText('#mode-incident span', 'ocp.incidentDesc');
    setText('#mode-exam strong', 'ocp.exam');
    setText('#mode-exam span', 'ocp.examDesc');
    setText('#learn-info-group label', 'ocp.learnMode');
    const learnInfo = document.getElementById('learn-info-text');
    if (learnInfo && /로딩|Loading/i.test(learnInfo.textContent)) learnInfo.textContent = t('ocp.loadingCurriculum');
    setText('#ocp-drop-group label', 'ocp.cliDropDifficulty');
    setText('#ocp-drop-group .mode-info', 'ocp.fixedPack');
    setText('#scenario-select-group label', 'ocp.scenarioCategory');
    setText('#lab-select-group label', 'ocp.mockLab');
    setText('#practice-style-group label', 'ocp.practiceStyle');
    setText('[data-practice-style="solve"]', 'ocp.practiceSolve');
    setText('[data-practice-style="follow"]', 'ocp.practiceFollow');
    const practiceInfo = document.getElementById('practice-style-info');
    const activePracticeStyle = document.querySelector('#practice-style-toggle [data-practice-style].active');
    if (practiceInfo && activePracticeStyle) {
        practiceInfo.textContent = t(activePracticeStyle.dataset.practiceStyle === 'follow'
            ? 'ocp.practiceFollowInfo'
            : 'ocp.practiceSolveInfo');
    }
    setText('#exam-info-group label', 'ocp.examMode');
    setText('#exam-info-group .mode-info:not(.exam-gate-note)', 'ocp.examInfo');
    setText('#ocp-start-btn', 'ocp.start');
    setText('#dashboard-btn', 'ocp.dashboard');

    setPreviousText('#score', 'hud.score');
    setPreviousText('#combo', 'hud.combo');
    setPreviousText('#lives-display', 'hud.lives');
    setPreviousText('#study-timer-display', 'hud.timer');
    setPreviousText('#progress', 'hud.progress');
    setPreviousText('#diff-badge', 'hud.difficulty');
    setText('#btn-pause', 'hud.pause');
    setText('#btn-home', 'hud.home');
    setPlaceholder('#input-field', 'hud.inputPlaceholder');

    setText('.stat-item:nth-child(1) .stat-label', 'result.finalScore');
    setText('.stat-item:nth-child(2) .stat-label', 'result.maxCombo');
    setText('.stat-item:nth-child(4) .stat-label', 'result.accuracy');
    setText('#restart-btn', 'result.reboot');

    setText('.pack-maker-title', 'packMaker.title');
    setText('.pack-maker-subtitle', 'packMaker.subtitle');
    setText('#pack-maker-close', 'packMaker.home');
    setText('#pack-maker-tab-chat', 'packMaker.tabChat');
    setText('#pack-maker-tab-edit', 'packMaker.tabEdit');
    setText('#pack-maker-tab-review', 'packMaker.tabReview');
    setText('#pack-maker-word-mode', 'packMaker.wordMode');
    setText('#pack-maker-long-mode', 'packMaker.longMode');
    setPlaceholder('#pack-maker-input', 'packMaker.inputPlaceholder');
    setText('#pack-maker-term-label', 'packMaker.termLanguage');
    setText('#pack-maker-desc-label', 'packMaker.descLanguage');
    setText('#pack-maker-term-ko', 'packMaker.langKorean');
    setText('#pack-maker-desc-ko', 'packMaker.langKorean');
    setText('#pack-maker-term-en', 'packMaker.langEnglish');
    setText('#pack-maker-desc-en', 'packMaker.langEnglish');
    setText('#pack-maker-send', stateRefSafePackMakerBusy() ? 'packMaker.stop' : 'packMaker.ask');
    setPlaceholder('#pack-maker-title', 'packMaker.packTitle');
    setPlaceholder('#pack-maker-description', 'packMaker.packDescription');
    setText('.pack-maker-table thead th:nth-child(2)', 'packMaker.term');
    setText('.pack-maker-table thead th:nth-child(3)', 'packMaker.desc');
    setText('.pack-maker-table thead th:nth-child(4)', 'packMaker.source');
    setText('#pack-maker-add-item', 'packMaker.addItem');
    setText('#pack-maker-save', 'packMaker.save');
    setText('#pack-maker-submit', 'packMaker.submit');
    setText('.pack-maker-review-note', 'packMaker.reviewNote');

    setText('.admin-pack-title', 'admin.title');
    setText('.admin-pack-subtitle', 'admin.subtitle');
    setText('#admin-pack-close', 'admin.home');
    setOptionText('#admin-pack-status-filter option[value="pending"]', 'admin.pending');
    setOptionText('#admin-pack-status-filter option[value="approved"]', 'admin.approved');
    setOptionText('#admin-pack-status-filter option[value="rejected"]', 'admin.rejected');
    setText('#admin-pack-refresh', 'admin.refresh');
    setAttribute('#admin-pack-screen .admin-pack-panel:nth-of-type(1)', 'aria-label', 'admin.listAria');
    setAttribute('#admin-pack-screen .admin-pack-panel:nth-of-type(2)', 'aria-label', 'admin.detailAria');

    const readmeBox = document.getElementById('readme-box');
    if (readmeBox) readmeBox.dataset.manualLang = lang;
    const tutorial = tutorialOverlay();
    if (tutorial) tutorial.dataset.tutorialLang = lang;
    document.querySelectorAll('#global-lang-toggle [data-app-lang-select]').forEach(langButton => {
        const active = normalizeAppLanguage(langButton.dataset.appLangSelect) === lang;
        langButton.classList.toggle('active', active);
        langButton.setAttribute('aria-pressed', String(active));
    });

    if (els.auth && els.auth.btns) {
        if (els.auth.btns.withdraw) els.auth.btns.withdraw.textContent = t('auth.withdraw');
        if (els.auth.btns.logout) {
            els.auth.btns.logout.textContent = state.userToken ? t('auth.logout') : t('auth.loginAction');
        }
    }

    if (window.CodeDropModeControls?.currentConfig?.()?.key === 'github') {
        window.CodeDropModeControls.refreshActiveCopy?.();
    }

    window.dispatchEvent(new CustomEvent('codedrop:language', { detail: { lang } }));
}

function stateRefSafePackMakerBusy() {
    return window.PackMaker && typeof window.PackMaker.isBusy === 'function' && window.PackMaker.isBusy();
}

window.CodeDropI18n = {
    t,
    lang: appLang,
    set: setAppLanguage,
    apply: applyAppLanguage
};

function setAppLanguage(value, options = {}) {
    const lang = normalizeAppLanguage(value);
    applyAppLanguage(lang);
    if (options.sound) sfx.playKey('Tab');
}

function initAppLanguage() {
    setAppLanguage(localStorage.getItem(APP_LANGUAGE_STORAGE_KEY) || localStorage.getItem(README_LANGUAGE_STORAGE_KEY) || 'en');
}

function handleAppLanguageClick(e) {
    const button = e.target.closest('[data-app-lang-select]');
    if (!button) return;

    const lang = normalizeAppLanguage(button.dataset.appLangSelect);
    setAppLanguage(lang, { sound: true });
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
    els.controls.startBtn.removeEventListener('click', handleStandardStart);
    if (els.musicWidget) els.musicWidget.removeEventListener('click', handleMusicWidgetClick);

    // Add
    els.input.field.addEventListener('input', handleInput);
    els.input.field.addEventListener('keydown', handleKeydown);
    els.hud.btnPause.addEventListener('click', togglePause);
    els.hud.btnHome.addEventListener('click', goHome);
    els.screens.pause.addEventListener('click', togglePause);
    els.controls.restartBtn.addEventListener('click', handleRestart);
    els.controls.startBtn.addEventListener('click', handleStandardStart);
    initSessionModeControls();

    // Music Widget Logic
    if (els.musicWidget) {
        initMusicWidgetPreference();
        els.musicWidget.addEventListener('click', handleMusicWidgetClick);
    }


    // Readme Logic
    const readmeWidget = document.getElementById('readme-widget');
    const readmeOverlay = document.getElementById('readme-overlay');
    const readmeClose = document.getElementById('readme-close');
    const appLangToggle = document.getElementById('global-lang-toggle');
    const readmeTutorialBtn = document.getElementById('readme-tutorial-btn');
    const tutorial = tutorialOverlay();
    const tutorialClose = document.getElementById('tutorial-close');
    const tutorialStart = document.getElementById('tutorial-start-btn');

    if (appLangToggle) {
        appLangToggle.removeEventListener('click', handleAppLanguageClick);
        appLangToggle.addEventListener('click', handleAppLanguageClick);
    }
    initAppLanguage();

    if (readmeWidget && readmeOverlay && readmeClose) {
        readmeWidget.removeEventListener('click', handleReadmeWidgetClick);
        readmeClose.removeEventListener('click', handleReadmeCloseClick);
        readmeOverlay.removeEventListener('click', handleReadmeOverlayClick);
        if (readmeTutorialBtn) readmeTutorialBtn.removeEventListener('click', handleReadmeTutorialClick);
        readmeWidget.addEventListener('click', handleReadmeWidgetClick);
        readmeClose.addEventListener('click', handleReadmeCloseClick);
        readmeOverlay.addEventListener('click', handleReadmeOverlayClick);
        if (readmeTutorialBtn) readmeTutorialBtn.addEventListener('click', handleReadmeTutorialClick);
    }

    if (tutorial && tutorialClose && tutorialStart) {
        tutorial.removeEventListener('click', handleTutorialOverlayClick);
        tutorialClose.removeEventListener('click', handleTutorialCloseClick);
        tutorialStart.removeEventListener('click', handleTutorialCloseClick);
        document.removeEventListener('keydown', handleTutorialKeydown);
        tutorial.addEventListener('click', handleTutorialOverlayClick);
        tutorialClose.addEventListener('click', handleTutorialCloseClick);
        tutorialStart.addEventListener('click', handleTutorialCloseClick);
        document.addEventListener('keydown', handleTutorialKeydown);
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
    initAppRouter();
    maybeShowFirstRunTutorial();


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
            const adminPacks = document.getElementById('admin-pack-screen');
            const keyboardTest = document.getElementById('keyboard-test-screen');
            if (!els.screens.start.classList.contains('hidden') &&
                els.auth.loggedInView.classList.contains('active') &&
                (!dashboard || dashboard.classList.contains('hidden')) &&
                (!commandDialog || commandDialog.classList.contains('hidden')) &&
                (!packMaker || packMaker.classList.contains('hidden')) &&
                (!adminPacks || adminPacks.classList.contains('hidden')) &&
                (!keyboardTest || keyboardTest.classList.contains('hidden')) &&
                !state.isPlaying) {
                if (isStudyEditionActive()) {
                    handleStart();
                } else {
                    handleStandardStart();
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

    // Start button is routed through handleStandardStart so DROP and LONG PRACTICE share one CTA.

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

    document.querySelectorAll('#pack-maker-screen, #admin-pack-screen, #learn-screen, #dashboard-screen')
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
        inputType: 'password',
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
    els.screens.start.querySelector('.card')?.classList.remove('auth-mode');
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
    reapplyCurrentRouteAfterAuth();
    syncOverlayChrome();
}

function showAuthView() {
    Object.values(STUDY_EDITION_CONFIGS).forEach(config => {
        document.body.classList.remove(config.bodyClass);
    });
    activeStudyEditionKey = '';
    setGameChrome(false);
    const standardMenu = document.getElementById('standard-menu');
    const ocpMenu = document.getElementById('ocp-menu');
    const editionCodeBtn = document.getElementById('edition-code-btn');
    const editionOcpBtn = document.getElementById('edition-ocp-btn');
    const editionGithubBtn = document.getElementById('edition-github-btn');
    if (standardMenu) standardMenu.classList.remove('hidden');
    if (ocpMenu) ocpMenu.classList.add('hidden');
    if (editionOcpBtn) editionOcpBtn.classList.remove('active');
    if (editionGithubBtn) editionGithubBtn.classList.remove('active');
    if (editionCodeBtn) editionCodeBtn.classList.add('active');
    els.auth.authContainer.style.display = 'block';
    els.auth.loggedInView.classList.remove('active');
    els.screens.start.querySelector('.card')?.classList.add('auth-mode');
    switchTab('login');
    syncOverlayChrome();
}

// Start
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', init, { once: true });
} else {
    init();
}
