import fs from 'fs';
import path from 'path';
import vm from 'vm';

const root = process.cwd();
const index = read('index.html');
const game = read('js/game.js');
const wordPacks = read('js/word_packs.js');
const githubEditionPacks = read('js/github_edition_packs.js');
const packMaker = read('js/pack_maker.js');
const adminPacks = read('js/admin_packs.js');
const server = read('server.js');
const dashboard = read('js/dashboard.js');
const stats = read('js/study_stats.js');
const learn = read('js/learn_mode.js');
const scenario = read('js/scenario_mode.js');
const lab = read('js/lab_mode.js');
const dockerCompose = read('docker-compose.local.yml');
const localSchema = read('db/init/001_schema.sql');
const localEnvExample = read('.env.local.example');
const productionEnvExample = read('.env.production.example');
const kugnusGatewayEnvExample = read('.env.kugnus-gateway.example');
const renderYaml = read('render.yaml');
const verifyWorkflow = read('.github/workflows/verify.yml');
const verifyAll = read('scripts/verify_all.mjs');
const verifyDb = read('scripts/verify_db_e2e.mjs');
const verifyServerSmoke = read('scripts/verify_server_smoke.mjs');
const releaseCheck = read('scripts/check_release_readiness.mjs');
const systemDoctor = read('scripts/system_doctor.mjs');
const kugnusGatewayContract = read('scripts/verify_kugnus_gateway_contract.mjs');
const packageJson = JSON.parse(read('package.json'));

function read(file) {
    return fs.readFileSync(path.join(root, file), 'utf8');
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function extractJsConstObject(source, constName) {
    const marker = `const ${constName} =`;
    const markerIndex = source.indexOf(marker);
    assert(markerIndex !== -1, `missing JS const object: ${constName}`);
    const start = source.indexOf('{', markerIndex);
    assert(start !== -1, `missing object body for ${constName}`);

    let depth = 0;
    for (let i = start; i < source.length; i++) {
        if (source[i] === '{') depth++;
        if (source[i] === '}') {
            depth--;
            if (depth === 0) {
                return Function(`return (${source.slice(start, i + 1)})`)();
            }
        }
    }

    throw new Error(`unterminated JS const object: ${constName}`);
}

function assertUniqueIds(html) {
    const counts = new Map();
    for (const match of html.matchAll(/\bid="([^"]+)"/g)) {
        const id = match[1];
        counts.set(id, (counts.get(id) || 0) + 1);
    }

    const duplicates = [...counts.entries()]
        .filter(([, count]) => count > 1)
        .map(([id, count]) => `${id}:${count}`);

    assert(duplicates.length === 0, `index.html should not contain duplicate ids: ${duplicates.join(', ')}`);
}

assertUniqueIds(index);
assert(index.includes('rel="icon" type="image/svg+xml" href="/games/codedrop/assets/favicon.svg"'), 'favicon link should point at the subpath-safe CodeDrop icon');
assert(fs.existsSync(path.join(root, 'assets/favicon.svg')), 'CodeDrop favicon asset file is missing');
assert(read('assets/favicon.svg').includes('CodeDrop CD favicon'), 'CodeDrop favicon should be the retro CD icon asset');
assert(server.includes('express.json({ limit: "2mb" })'), 'server JSON body limit should support Pack Maker drafts with source metadata');

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cssBlocks(selector) {
    const pattern = new RegExp(`(^|\\n)\\s*${escapeRegex(selector)}\\s*\\{`, 'g');
    const blocks = [];
    let match;

    while ((match = pattern.exec(index)) !== null) {
        const start = match.index + match[0].indexOf(selector);
        const brace = index.indexOf('{', start);
        let depth = 0;
        for (let i = brace; i < index.length; i++) {
            if (index[i] === '{') depth++;
            if (index[i] === '}') {
                depth--;
                if (depth === 0) {
                    blocks.push(index.slice(start, i + 1));
                    break;
                }
            }
        }
    }

    return blocks;
}

function cssBlock(selector, predicate = () => true) {
    const block = cssBlocks(selector).find(predicate);
    assert(block, `missing CSS block: ${selector}`);
    return block;
}

function pxValue(block, prop) {
    const match = block.match(new RegExp(`${prop}:\\s*(\\d+)px`));
    assert(match, `missing ${prop} px value in block:\n${block}`);
    return Number(match[1]);
}

function loadGithubEditionData() {
    const sandbox = {};
    vm.runInNewContext(`${githubEditionPacks}
globalThis.__githubEditionData = {
    GITHUB_SCENARIO_PACKS,
    GITHUB_EXAM_BLUEPRINT,
    GITHUB_MOCK_LABS,
    GITHUB_LESSON_TRACKS
};`, sandbox);
    return sandbox.__githubEditionData;
}

function collectObjectIds(value, ids = []) {
    if (!value || typeof value !== 'object') return ids;
    if (Array.isArray(value)) {
        value.forEach(item => collectObjectIds(item, ids));
        return ids;
    }
    if (typeof value.id === 'string') ids.push(value.id);
    Object.values(value).forEach(item => collectObjectIds(item, ids));
    return ids;
}

function assertNoDuplicateValues(values, label) {
    const counts = new Map();
    values.forEach(value => counts.set(value, (counts.get(value) || 0) + 1));
    const duplicates = [...counts.entries()].filter(([, count]) => count > 1).map(([value, count]) => `${value}:${count}`);
    assert(duplicates.length === 0, `${label} should not contain duplicates: ${duplicates.join(', ')}`);
}

function hasId(id) {
    return index.includes(`id="${id}"`);
}

const scripts = [...index.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1]);
const expectedOrder = [
    'js/word_packs.js',
    'js/scenario_packs.js',
    'js/lab_packs.js',
    'js/lesson_packs.js',
    'js/github_edition_packs.js',
    'js/long_packs.js',
    'js/study_stats.js',
    'js/game.js',
    'js/scenario_mode.js',
    'js/lab_mode.js',
    'js/learn_mode.js',
    'js/dashboard.js',
    'js/long_mode.js',
    'js/pack_maker.js',
    'js/admin_packs.js',
    'js/keyboard_test.js'
];

let lastIndex = -1;
expectedOrder.forEach(src => {
    const current = scripts.indexOf(src);
    assert(current !== -1, `missing script tag for ${src}`);
    assert(current > lastIndex, `script order is wrong around ${src}`);
    lastIndex = current;
    assert(fs.existsSync(path.join(root, src)), `script file does not exist: ${src}`);
});

const i18nText = extractJsConstObject(game, 'I18N_TEXT');
const enI18nKeys = Object.keys(i18nText.en || {}).sort();
const koI18nKeys = Object.keys(i18nText.ko || {}).sort();
assert(enI18nKeys.length === koI18nKeys.length, `EN/KO i18n key counts differ: ${enI18nKeys.length} vs ${koI18nKeys.length}`);
assert(enI18nKeys.every((key, index) => key === koI18nKeys[index]), 'EN/KO i18n keys must match exactly');
[
    'menu.startCodedrop',
    'ocp.start',
    'menu.packMaker',
    'menu.keyTest',
    'packMaker.title',
    'packMaker.home',
    'packMaker.ask',
    'packMaker.stop'
].forEach(key => {
    assert(i18nText.ko[key] === i18nText.en[key], `${key} should stay as a stable game/action label across languages`);
});

[
    'edition-switch',
    'edition-code-btn',
    'edition-ocp-btn',
    'edition-github-btn',
    'standard-menu',
    'ocp-menu',
    'mode-grid',
    'mode-drop',
    'mode-scenario',
    'mode-lab',
    'mode-exam',
    'ocp-drop-group',
    'scenario-select-group',
    'lab-select-group',
    'exam-info-group',
    'ocp-start-btn',
    'dashboard-btn',
    'leaderboard-preview',
    'scenario-screen',
    'scenario-timer',
    'lab-screen',
    'dashboard-screen',
    'dashboard-learn',
    'dashboard-next-btn',
    'dashboard-reset-btn',
    'confirm-screen',
    'confirm-title',
    'confirm-message',
    'confirm-input',
    'confirm-error',
    'confirm-cancel',
    'confirm-ok',
    'learn-screen',
    'learn-picker',
    'learn-card',
    'learn-summary',
    'learn-picker-progress',
    'learn-picker-home',
    'learn-picker-chat',
    'learn-continue-btn',
    'learn-track-list',
    'learn-lesson-title',
    'learn-progress',
    'learn-quit',
    'learn-prev-step',
    'learn-next-step',
    'learn-intro-wrap',
    'learn-intro',
    'learn-begin-btn',
    'learn-work-wrap',
    'learn-desc',
    'learn-target',
    'learn-input',
    'learn-output',
    'learn-feedback',
    'learn-peek',
    'learn-hint',
    'learn-skip',
    'learn-next',
    'learn-chat-panel',
    'learn-chat-title',
    'learn-chat-engine',
    'learn-chat-engine-shell',
    'learn-chat-engine-toggle',
    'learn-chat-engine-label',
    'learn-chat-engine-menu',
    'learn-chat-status',
    'learn-chat-context',
    'learn-chat-log',
    'learn-chat-form',
    'learn-chat-input',
    'learn-chat-send',
    'learn-chat-clear',
    'learn-summary-title',
    'learn-summary-stats',
    'learn-summary-review',
    'learn-retry-quiz',
    'learn-next-lesson',
    'learn-list-btn',
    'learn-home',
    'mode-learn',
    'learn-info-group',
    'exam-gate-note'
    ,
    'pack-selector',
    'pack-selector-trigger',
    'pack-current-title',
    'pack-current-chip',
    'pack-console',
    'pack-popover',
    'pack-popover-close',
    'pack-card-groups',
    'readme-tutorial-btn',
    'tutorial-overlay',
    'tutorial-close',
    'tutorial-start-btn',
    'study-time-row',
    'study-time-input',
    'ocp-study-time-row',
    'ocp-study-time-input',
    'pack-maker-btn',
    'pack-maker-screen',
    'pack-maker-close',
    'pack-maker-status',
    'pack-maker-engine',
    'pack-maker-chat-log',
    'pack-maker-chat-bottom',
    'pack-maker-chat-form',
    'pack-maker-input',
    'pack-maker-example-text',
    'pack-maker-term-language',
    'pack-maker-desc-language',
    'pack-maker-term-ko',
    'pack-maker-term-en',
    'pack-maker-desc-ko',
    'pack-maker-desc-en',
    'pack-maker-send',
    'pack-maker-clear',
    'pack-maker-title',
    'pack-maker-description',
    'pack-maker-item-table',
    'pack-maker-items-body',
    'pack-maker-add-item',
    'pack-maker-save',
    'pack-maker-submit'
].forEach(id => assert(hasId(id), `missing DOM id: ${id}`));

assert(index.includes('class="difficulty-native-select"'), 'difficulty native select must be hidden behind a custom picker');
assert(index.includes('class="difficulty-picker" data-difficulty-for="difficulty-select"'), 'standard difficulty custom picker is missing');
assert(index.includes('class="difficulty-picker" data-difficulty-for="ocp-difficulty-select"'), 'OCP difficulty custom picker is missing');
assert(index.includes('.difficulty-menu'), 'difficulty picker neon menu styles are missing');
assert(index.includes('.select-group select.difficulty-native-select'), 'hidden difficulty select must override generic select width');
assert(index.includes('clip-path: inset(50%)'), 'hidden native selects must be clipped so browser popovers cannot leak visually');
assert(index.includes('display: none !important;'), 'hidden native selects must be removed from layout so browser popovers cannot open');
assert(index.includes('opacity: 0 !important;'), 'native difficulty select should be visually invisible');
assert(index.includes('pointer-events: none !important;'), 'native difficulty select should not receive clicks');
const difficultyTrigger = cssBlock('.difficulty-trigger');
assert(difficultyTrigger.includes('background:'), 'difficulty trigger should be a themed control, not a browser default select');
assert(difficultyTrigger.includes('border: 1px solid rgba(0, 243, 255'), 'difficulty trigger should use neon theme border styling');
const difficultyMenu = cssBlock('.difficulty-menu');
assert(difficultyMenu.includes('position: absolute;'), 'difficulty menu should render as an in-app popover');
assert(difficultyMenu.includes('linear-gradient'), 'difficulty menu should use the CodeDrop themed background');
const difficultyActive = cssBlock('.difficulty-option.active::after');
assert(difficultyActive.includes('content: "ACTIVE";'), 'difficulty active option should render an in-theme active marker');
assert(game.includes('function initDifficultyPickers()'), 'difficulty picker initializer is missing');
assert(game.includes("select.dispatchEvent(new Event('change', { bubbles: true }))"), 'difficulty picker must dispatch native select change events');

assert(game.includes('LearnMode.openPicker()'), 'LEARN mode route is missing');
assert(index.includes('mode-choice-wide'), 'learn tile should span the mode grid');
assert(index.includes('<option value="STUDY">INVINCIBLE [STUDY]</option>'), 'standard difficulty should include invincible study mode');
assert((index.match(/<option value="STUDY">INVINCIBLE \[STUDY\]<\/option>/g) || []).length >= 2, 'standard and OCP difficulty should both include invincible study mode');
assert(index.includes('id="study-time-input"') && index.includes('id="ocp-study-time-input"') && index.includes('MINUTES (blank = infinite)'), 'study mode should expose optional duration input in standard and OCP menus');
assert(index.includes('id="study-timer-display"') && index.includes('body.study-active .study-timer-item'), 'study mode should expose a dedicated HUD timer beside lives');
assert(game.includes('function isStudyMode()'), 'study mode state helper is missing');
assert(game.includes("isStudyDifficulty(diff) ? 'STUDY' : 'MISSION'"), 'study mode should be driven by the difficulty selection');
assert(game.includes('function updateStudyTimerHUD()') && game.includes('state.studyEndsAt - Date.now()') && game.includes('Date.now() - state.startTime'), 'study mode HUD should show countdown or elapsed timer');
assert(game.includes('isStudyMode() || state.spawnedCount < 100'), 'study mode should bypass the 100-word mission cap');
assert(game.includes('if (isStudyMode())') && game.includes("els.hud.lives.textContent = '∞'"), 'study mode should not spend the three life hearts');
assert(game.includes('t(\'score.studyMode\')'), 'study mode results should not upload leaderboard scores');
assert(game.includes('soundAssetPath('), 'sound effects should use app-base sound asset URLs');
assert(game.includes('playPackLatch') && game.includes('playEditionBurst') && game.includes('playBoot'), 'pack latch, edition switch, and game start SFX should be wired');
assert(game.includes('TUTORIAL_SEEN_STORAGE_KEY'), 'tutorial first-run storage key is missing');
assert(game.includes('function maybeShowFirstRunTutorial()'), 'tutorial should auto-open on first visit');
assert(game.includes("localStorage.setItem(TUTORIAL_SEEN_STORAGE_KEY, '1')"), 'tutorial should mark itself seen after first display/close');
assert(game.includes('handleReadmeTutorialClick'), 'README tutorial button should manually open the tutorial');
assert(index.includes('class="readme-action-row"'), 'README language toggle should sit beside the tutorial action row');
assert(index.includes('id="readme-tutorial-btn"'), 'README tutorial button is missing');
assert(index.includes('id="tutorial-overlay"') && index.includes('data-tutorial-lang="en"'), 'tutorial overlay shell is missing');

assert(index.includes('assets/red-hat-logo.svg'), 'OCP hat asset is not referenced');
assert(fs.existsSync(path.join(root, 'assets/red-hat-logo.svg')), 'OCP hat asset file is missing');
assert(index.includes('scaleX(-1) rotate(-12deg)'), 'OCP hat should be mirrored and lightly tilted');

const startScreen = cssBlock('#start-screen');
assert(startScreen.includes('justify-content: center;'), 'start screen should center the title and menu group by default');

const baseCard = cssBlock('#start-screen .card', block => block.includes('width: 840px'));
assert(pxValue(baseCard, 'width') === 840, 'standard card should match the OCP-grade frame width for the expanded menu');
assert(pxValue(baseCard, 'height') === 760, 'standard card should grow with the Study/Pack Maker/Long Practice menu stack');
assert(pxValue(baseCard, 'min-height') === 760, 'standard card min-height must protect against clipping the expanded menu');
assert(baseCard.includes('max-height: calc(100dvh - 120px);'), 'standard card should stay inside MacBook/desktop viewports');

const ocpCard = cssBlock('body.ocp-edition #start-screen .card');
assert(pxValue(ocpCard, 'width') === 840, 'OCP card must match the standard card width so edition switching only changes theme');
assert(pxValue(ocpCard, 'height') === 760, 'OCP card must match the standard card height so edition switching does not jump');
assert(pxValue(ocpCard, 'min-height') === 760, 'OCP card min-height must match the standard frame and protect against clipping');
assert(ocpCard.includes('overflow: hidden;'), 'OCP desktop card should grow instead of relying on inner scroll');

const ocpLoggedIn = cssBlock('body.ocp-edition #logged-in-view');
assert(ocpLoggedIn.includes('height: 100%;'), 'OCP logged-in view should fill the enlarged card without squeezing controls');
assert(ocpLoggedIn.includes('min-height: 0;'), 'OCP logged-in view should allow balanced inner grid sizing');
assert(ocpLoggedIn.includes('justify-content: flex-start;'), 'OCP controls should not be vertically squeezed');

const ocpMenu = cssBlock('body.ocp-edition .ocp-menu');
assert(ocpMenu.includes('display: grid;'), 'OCP menu should use the expanded frame instead of stacking every control');
assert(ocpMenu.includes('grid-template-columns: minmax(0, 1.18fr) minmax(270px, 0.82fr);'), 'OCP menu should balance mode tiles and controls side-by-side');
assert(ocpMenu.includes('border: 0;'), 'OCP menu should not look like a nested card frame');
assert(ocpMenu.includes('background: transparent;'), 'OCP menu should rely on the outer card frame');

const editionSwitch = cssBlock('.edition-switch');
assert(editionSwitch.includes('min-height: 52px;'), 'edition switch needs a stable, visually balanced tap height');
assert(!index.includes('font-size: 5rem; text-shadow: 0 0 20px var(--primary-neon);'), 'brand title should not use fixed inline mobile-hostile sizing');

const standardLeaderboard = cssBlock('#leaderboard-preview');
assert(pxValue(standardLeaderboard, 'width') === 440, 'standard leaderboard should balance the larger menu card width');
assert(pxValue(standardLeaderboard, 'height') === 760, 'standard leaderboard should align with the enlarged standard menu card');
assert(pxValue(standardLeaderboard, 'min-height') === 760, 'standard leaderboard should protect the aligned desktop frame height');
assert(standardLeaderboard.includes('max-height: calc(100dvh - 120px);'), 'standard leaderboard should stay aligned without overflowing desktop viewports');

const authContainer = cssBlock('#auth-container');
assert(authContainer.includes('width: min(660px, 100%);'), 'login card should keep a deliberate console width inside the larger frame');
assert(authContainer.includes('url("assets/auth-city.svg")'), 'login card should use the dedicated neon city backdrop instead of empty side space');
assert(!authContainer.includes('rgba(255, 214, 0'), 'login card should not keep the rejected amber treatment');
const authFrameDecor = cssBlock('#start-screen .card.auth-mode::after');
assert(authFrameDecor.includes('url("assets/auth-city.svg")'), 'login outer frame gap should include the city backdrop layer');
assert(authFrameDecor.includes('mask-image'), 'login outer frame city layer should be masked into the gap around the inner auth panel');
assert(index.includes('class="auth-gap-decor"'), 'login outer frame should include a dedicated gap decoration layer');
assert(index.includes('.auth-city-wing') && index.includes('.auth-circuit-rail'), 'login gap should use cyber city/circuit decoration instead of empty margins');
assert(index.includes('clip-path: polygon') && index.includes('mix-blend-mode: screen;'), 'login gap decoration should be shaped and blended, not a flat rectangle');
const authDecor = cssBlock('#auth-container::before');
assert(authDecor.includes('repeating-linear-gradient'), 'login city backdrop should retain scanline texture');
assert(fs.existsSync(path.join(root, 'assets/auth-city.svg')), 'login city backdrop asset must be committed');
assert(game.includes("querySelector('.card')?.classList.add('auth-mode')"), 'auth view should enable the outer frame city layer');
assert(game.includes("querySelector('.card')?.classList.remove('auth-mode')"), 'logged-in view should remove the auth-only outer frame city layer');

const modeGrid = cssBlock('body.ocp-edition .mode-grid');
assert(modeGrid.includes('repeat(2, minmax(0, 1fr))'), 'OCP mode grid should remain a balanced 2x2 grid');
assert(index.includes('grid-auto-rows: minmax(68px, auto);'), 'compact OCP mode grid must keep tile height instead of collapsing');
assert(index.includes('body.ocp-edition #learn-info-group,'), 'learn mode controls must use the same right column as other OCP controls');

const modeChoice = cssBlock('body.ocp-edition .mode-choice');
assert(pxValue(modeChoice, 'min-height') >= 80, 'OCP mode tiles should be large enough to read comfortably');

const ocpLeaderboard = cssBlock('body.ocp-edition #leaderboard-preview');
assert(pxValue(ocpLeaderboard, 'width') === 440, 'OCP leaderboard should match the standard leaderboard width for balanced mode switching');
assert(pxValue(ocpLeaderboard, 'height') === 760, 'OCP leaderboard should match the standard leaderboard height');
assert(pxValue(ocpLeaderboard, 'min-height') === 760, 'OCP leaderboard min-height should preserve the aligned desktop frame');
assert(ocpLeaderboard.includes('max-height: calc(100dvh - 120px);'), 'OCP leaderboard should not overflow short desktop viewports');

assert(index.includes('<button class="btn-small" id="edition-github-btn" type="button">GITHUB EDITION</button>'), 'GitHub Edition switch button is missing');
assert(index.includes('<option value="GITHUB_CORE">GitHub</option>'), 'GitHub DROP pack option is missing');
assert(index.includes('js/github_edition_packs.js'), 'GitHub Edition data script is missing');
assert(wordPacks.includes('GITHUB_ENTRIES'), 'GitHub core word entries are missing');
assert(wordPacks.includes('WORD_PACKS.GITHUB_CORE'), 'GitHub core word pack should be registered');
assert(game.includes('STUDY_EDITION_CONFIGS') && game.includes('github-edition') && game.includes('GITHUB_CORE'), 'GitHub Edition study config is missing');
assert(game.includes('openGithubEdition'), 'GitHub Edition open helper is missing');
assert(game.includes('configureStudyModules(config)'), 'study edition module configuration should be shared by OCP and GitHub');
assert(game.includes('populateStudySelectors(config)'), 'study selectors should be data-driven by edition config');
assert(index.includes('body.github-edition'), 'GitHub Edition theme styles are missing');
assert(index.includes('.pack-style-github_core'), 'GitHub cartridge style is missing');
assert(githubEditionPacks.includes('GITHUB_SCENARIO_PACKS'), 'GitHub scenario packs are missing');
assert(githubEditionPacks.includes('GITHUB_MOCK_LABS'), 'GitHub mock labs are missing');
assert(githubEditionPacks.includes('GITHUB_LESSON_TRACKS'), 'GitHub lesson tracks are missing');
assert(githubEditionPacks.includes('GITHUB_EXAM_BLUEPRINT'), 'GitHub exam blueprint is missing');
assert(githubEditionPacks.includes('GITHUB_INCIDENTS'), 'GitHub incident drills are missing');
assert(['GH_FOUNDATIONS', 'GH_ACTIONS', 'GH_SECURITY', 'GH_ADMIN', 'GH_COPILOT'].every(key => githubEditionPacks.includes(key)), 'GitHub cert category coverage is incomplete');
const githubEditionContractText = githubEditionPacks.toLowerCase();
[
    'workflow_call',
    'actions/caches',
    'actions/oidc/customization/sub',
    'environments',
    'credential-authorizations',
    'push protection',
    'code-scanning/default-setup',
    'copilot/metrics/reports/organization-28-day/latest',
    'copilot/metrics/reports/users-28-day/latest',
    'copilot/billing/selected_users'
].forEach(term => assert(githubEditionContractText.includes(term.toLowerCase()), `GitHub Edition should include ${term} coverage`));
[
    'canonical: "gh api orgs/octo-org/copilot/usage"',
    'canonical: "gh api orgs/octo-org/copilot/metrics"',
    'copilot/billing/seats --field selected_usernames',
    'copilot/billing/seats/dev1'
].forEach(stale => assert(!githubEditionPacks.includes(stale), `GitHub Edition should not use stale Copilot API pattern: ${stale}`));
const githubEditionData = loadGithubEditionData();
const githubCertCategories = ['GH_FOUNDATIONS', 'GH_ACTIONS', 'GH_SECURITY', 'GH_ADMIN', 'GH_COPILOT'];
function assertGitHubCanonicalMatches(item, label) {
    assert(item.answers.some(pattern => new RegExp(pattern).test(item.canonical)), `${label} canonical does not match its answer patterns: ${item.id}`);
}
for (const category of githubCertCategories) {
    const questions = githubEditionData.GITHUB_SCENARIO_PACKS?.[category]?.questions || [];
    assert(questions.length >= 10, `GitHub category ${category} should include at least 10 scenario questions`);
    for (const question of questions) {
        assert(question.id && question.scenario && question.canonical && question.hint && question.explain, `GitHub question ${question.id || '(missing id)'} is incomplete`);
        assert(Array.isArray(question.answers) && question.answers.length > 0, `GitHub question ${question.id} should have answer patterns`);
        question.answers.forEach(pattern => new RegExp(pattern));
        assertGitHubCanonicalMatches(question, 'GitHub question');
    }
}
const githubIncidentQuestions = githubEditionData.GITHUB_SCENARIO_PACKS?.GITHUB_INCIDENTS?.questions || [];
assert(githubIncidentQuestions.length >= 10, 'GitHub Edition should include real incident drill coverage');
githubIncidentQuestions.forEach(question => {
    assert(question.id && question.scenario && question.canonical && question.hint && question.explain, `GitHub incident ${question.id || '(missing id)'} is incomplete`);
    assert(Array.isArray(question.answers) && question.answers.length > 0, `GitHub incident ${question.id} should have answer patterns`);
    question.answers.forEach(pattern => new RegExp(pattern));
    assertGitHubCanonicalMatches(question, 'GitHub incident');
});
const githubExamTotal = Object.values(githubEditionData.GITHUB_EXAM_BLUEPRINT).reduce((sum, count) => sum + count, 0);
assert(githubExamTotal >= 30, 'GitHub exam blueprint should be certification-sized, not a tiny sample');
for (const [category, count] of Object.entries(githubEditionData.GITHUB_EXAM_BLUEPRINT)) {
    assert(githubCertCategories.includes(category), `GitHub exam category ${category} should be one of the certification domains`);
    assert(githubEditionData.GITHUB_SCENARIO_PACKS[category].questions.length >= count, `GitHub exam category ${category} does not have enough questions for its blueprint`);
}
assert(githubEditionData.GITHUB_MOCK_LABS.length >= 7, 'GitHub mock labs should cover multiple certification workflows');
const githubLabSteps = githubEditionData.GITHUB_MOCK_LABS.flatMap(lab => lab.steps || []);
assert(githubLabSteps.length >= 35, 'GitHub mock labs should include enough hands-on steps');
githubLabSteps.forEach(step => {
    assert(step.id && step.scenario && step.canonical && step.hint && step.explain, `GitHub lab step ${step.id || '(missing id)'} is incomplete`);
    assert(Array.isArray(step.answers) && step.answers.length > 0, `GitHub lab step ${step.id} should have answer patterns`);
    step.answers.forEach(pattern => new RegExp(pattern));
    assertGitHubCanonicalMatches(step, 'GitHub lab step');
});
const githubLessons = githubEditionData.GITHUB_LESSON_TRACKS.flatMap(track => track.lessons || []);
assert(githubLessons.length >= 10, 'GitHub learn mode should have a full lesson track, not a shallow picker');
const githubLessonSteps = githubLessons.flatMap(lesson => lesson.steps || []);
assert(githubLessonSteps.length >= 50, 'GitHub learn mode should include enough follow-along typing steps');
const githubLessonOrder = githubLessons.map(lesson => lesson.id);
assert(githubLessonOrder[0] === 'gh-lesson-git-core', 'GitHub learn mode should start with the highest-priority Git work loop');
assert(githubLessonOrder[1] === 'gh-lesson-pr-review', 'GitHub learn mode should teach PR review/checks immediately after Git basics');
assert(githubLessonOrder[2] === 'gh-lesson-repo-guardrails', 'GitHub learn mode should cover repository guardrails before Actions/Admin extras');
['gh-lesson-actions-basic', 'gh-lesson-actions-ops', 'gh-lesson-actions-security', 'gh-lesson-ghas', 'gh-lesson-admin', 'gh-lesson-admin-policy', 'gh-lesson-copilot-cli'].forEach((lessonId, expectedIndex) => {
    assert(githubLessonOrder[expectedIndex + 3] === lessonId, `GitHub learn priority order is wrong at ${lessonId}`);
});
const githubFirstLessonCommands = githubLessons[0].steps.map(step => step.cmd);
['git clone https://github.com/octo-org/app.git', 'git status', 'git switch -c login-fix', 'git add .', 'git commit -m "add login flow"', 'git push -u origin login-fix'].forEach(cmd => {
    assert(githubFirstLessonCommands.includes(cmd), `GitHub first lesson should include practical Git command: ${cmd}`);
});
githubLessons.forEach(lesson => {
    assert(lesson.quizCount >= 5, `GitHub lesson ${lesson.id} should include enough quiz practice`);
    assert(githubCertCategories.includes(lesson.quizFrom), `GitHub lesson ${lesson.id} should quiz from a certification category`);
});
const githubAllIds = collectObjectIds(githubEditionData);
assertNoDuplicateValues(githubAllIds, 'GitHub Edition ids');
assert(learn.includes('function currentStudyEditionText'), 'learn mode must derive edition-specific copy from the active study edition');
assert(learn.includes('GitHub Certification 커리큘럼'), 'GitHub learn picker copy is missing');
assert(learn.includes('`${copy.key}-learn-picker`'), 'learn picker chat history key must be edition-specific');
assert(learn.includes('ui.pickerIntro.textContent = currentStudyEditionText().pickerIntro'), 'learn picker intro must follow the active edition');
const githubCard = cssBlock('body.github-edition #start-screen .card');
assert(pxValue(githubCard, 'width') === 840, 'GitHub card must match the standard/OCP frame width');
assert(pxValue(githubCard, 'height') === 760, 'GitHub card must match the standard/OCP frame height');
assert(pxValue(githubCard, 'min-height') === 760, 'GitHub card min-height must protect its full menu');
assert(githubCard.includes('overflow: hidden;'), 'GitHub desktop card should use the same complete frame treatment as OCP');
const githubMenu = cssBlock('body.github-edition .ocp-menu');
assert(githubMenu.includes('display: grid;'), 'GitHub menu should use the copied OCP edition grid engine');
assert(githubMenu.includes('grid-template-columns: minmax(0, 1.18fr) minmax(270px, 0.82fr);'), 'GitHub menu should preserve the OCP two-column balance');
const githubChatPanel = cssBlock('body.github-edition .learn-chat-panel', block => block.includes('box-shadow: 0 0 28px rgba(47, 129, 247'));
assert(githubChatPanel.includes('background: rgba(4, 8, 18, 0.94);'), 'GitHub learn chat panel should use a blue-black shell');
assert(!/255,\s*48,\s*69|#ff3045/i.test(githubChatPanel), 'GitHub learn chat panel should not keep OCP red glow');
const githubEngineToggle = cssBlock('body.github-edition .learn-engine-toggle');
assert(githubEngineToggle.includes('rgba(47, 129, 247'), 'GitHub learn engine toggle should use blue accents');
assert(!/255,\s*48,\s*69|#ff3045/i.test(githubEngineToggle), 'GitHub learn engine toggle should not keep OCP red accents');
const githubChatUser = cssBlock('body.github-edition .learn-chat-msg.user');
assert(githubChatUser.includes('rgba(47, 129, 247'), 'GitHub learn user chat bubbles should use blue accents');
assert(!/255,\s*48,\s*69|#ff3045/i.test(githubChatUser), 'GitHub learn user chat bubbles should not keep OCP red accents');
const githubChatInput = cssBlock('body.github-edition #learn-chat-input');
assert(githubChatInput.includes('rgba(47, 129, 247'), 'GitHub learn chat input should use blue accents');
const githubScenarioCards = cssBlock('body.github-edition .card.scenario-card,\n        body.github-edition .dashboard-card');
assert(githubScenarioCards.includes('rgba(47, 129, 247'), 'GitHub scenario/lab/dashboard cards should use blue glow');
const githubLeaderboard = cssBlock('body.github-edition #leaderboard-preview');
assert(pxValue(githubLeaderboard, 'width') === 440, 'GitHub leaderboard should match the standard/OCP leaderboard width');
assert(pxValue(githubLeaderboard, 'height') === 760, 'GitHub leaderboard should match the standard/OCP leaderboard height');
assert(pxValue(githubLeaderboard, 'min-height') === 760, 'GitHub leaderboard should preserve the aligned desktop frame');
assert(index.includes('@media (max-height: 780px)') && index.includes('body.github-edition .mode-grid'), 'GitHub Edition should have compact-height responsive guards');
assert(index.includes('@media (max-width: 700px)') && index.includes('body.github-edition #logged-in-view'), 'GitHub Edition should have mobile responsive guards');

const learnRow = cssBlock('.learn-lesson-row');
assert(learnRow.includes('grid-template-columns: 28px minmax(0, 1fr) auto;'), 'learn lesson rows should keep long titles and quiz meta aligned');
const learnPicker = cssBlock('#learn-picker');
assert(learnPicker.includes('width: min(860px, 92vw);'), 'learn picker should be large enough for the OCP curriculum list');
assert(learnPicker.includes('min-height: min(720px, calc(100dvh - 92px));'), 'learn picker should expand vertically without overflowing desktop viewports');
assert(index.includes('body.ocp-edition .learn-output'), 'learn terminal output should inherit the OCP red edition skin');
assert(index.includes('#learn-screen.learn-session-active'), 'learn chat should use a lesson-only side panel layout');
const learnSession = cssBlock('#learn-screen.learn-session-active');
assert(learnSession.includes('display: grid;'), 'learn session should use the full viewport as a two-panel grid');
assert(learnSession.includes('align-items: stretch;'), 'learn session should use large balanced dual panels');
assert(learnSession.includes('place-content: center;'), 'learn session panels should stay centered in the viewport');
assert(learnSession.includes('max-width: none;'), 'learn session overlay must keep the full viewport backdrop instead of anchoring left');
assert(index.includes('#learn-screen.learn-session-active #learn-card'), 'learn session card should have its own larger sizing');
const learnSessionCard = cssBlock('#learn-screen.learn-session-active #learn-card');
assert(learnSessionCard.includes('height: min(820px, calc(100dvh - 72px));'), 'learn panel should be much larger and balanced on desktop');
assert(learnSessionCard.includes('max-height: calc(100dvh - 72px);'), 'learn panel should stay inside the viewport');
const learnChat = cssBlock('.learn-chat-panel');
assert(learnChat.includes('display: flex;'), 'learn chat panel should be a real tool panel, not loose text');
assert(learnChat.includes('width: 100%;'), 'learn chat panel should fill its grid column');
assert(learnChat.includes('height: min(820px, calc(100dvh - 72px));'), 'learn chat panel should be taller on desktop');
const learnStepNav = cssBlock('.learn-step-nav');
assert(learnStepNav.includes('display: flex;'), 'learn previous/next navigation should be visible in the lesson header');
assert(learn.includes('function goPrevStage()'), 'learn mode should support previous stage navigation');
assert(learn.includes('function goNextStage()'), 'learn mode should support next stage navigation');
assert(learn.includes('function returnToNavTarget()'), 'learn mode should return from review without resetting progress');
assert(learn.includes("nextLabel = '보던 단계로 →'"), 'learn review navigation should label return-to-current state clearly');
assert(learn.includes('function showStepHint()'), 'learn step hints should open through the hint button');
assert(learn.includes("ui.hintBtn.addEventListener('click', showLearnHint)"), 'learn hint button should route to the current phase');
assert(learn.includes("ui.hintBtn.classList.toggle('hidden', review || !hasStepHint);"), 'learn step hints should not render automatically');
assert(learn.includes('session.stepHintOpen = !') || learn.includes('if (session.stepHintOpen)'), 'learn step hints should be closable after opening');
assert(learn.includes('session.quizHintOpen = !') || learn.includes('if (session.quizHintOpen)'), 'learn quiz hints should be closable after opening');
assert(learn.includes("ui.peekBtn.textContent = session.peeked ? '정답 닫기' : '정답 보기';"), 'learn answer peek should toggle open and closed');
assert(index.includes('ASK TO GEMINI 2.5 FLASH'), 'learn chat should default the assistant title to Gemini for public clones');
assert(index.includes('data-engine="kugnus"') && index.includes('KUGNUS SERVER'), 'learn chat should expose KUGNUS SERVER as the local engine choice');
assert(index.includes('data-engine="openai"') && index.includes('GPT 5.4 MINI'), 'learn chat should expose GPT 5.4 MINI as an engine choice');
assert(index.includes('id="scenario-chat"'), 'scenario/exam/incident screens should expose the shared OCP chat button');
assert(index.includes('id="lab-chat"'), 'mock lab screens should expose the shared OCP chat button');
assert(index.includes('id="learn-picker-chat"'), 'learn picker route should expose the shared OCP chat button');
assert(learn.includes('ui.pickerChat.addEventListener') && learn.includes('function openPickerChat(options = {})'), 'learn picker chat button should open the shared learning chat panel');
assert(learn.includes('openPickerChat({ focus: false });'), 'learn picker should auto-place the shared chat panel without stealing curriculum focus');
assert(learn.includes('function openContextChat(context = {}, options = {})'), 'shared OCP chat should support non-focus auto placement');
assert(index.includes('#learn-screen.learn-session-active #learn-picker'), 'learn picker should have a two-panel layout when chat is open');
assert(scenario.includes('function hasStudyChat()') && scenario.includes('return !!session.opts;'), 'scenario chat must be available for every OCP scenario-style session, including exam');
assert(!scenario.includes("session.opts && session.opts.mode !== 'exam'"), 'exam mode must not be excluded from OCP study chat');
assert(scenario.includes("if (session.opts?.mode === 'exam') return '시험 연습';"), 'exam chat context should be labelled as exam practice');
assert(scenario.includes("openStudyChat({ focus: false });"), 'scenario/exam/incident screens should auto-place the shared chat panel on entry');
assert(scenario.includes("LearnMode.openContextChat(chatContextForCurrentQuestion(), options)"), 'scenario screens should open the shared LearnMode chat panel');
assert(scenario.includes("LearnMode.setExternalChatContext(chatContextForCurrentQuestion())"), 'scenario screens should refresh shared chat context per question');
assert(lab.includes("openStudyChat({ focus: false });"), 'mock lab screens should auto-place the shared chat panel on entry');
assert(lab.includes("LearnMode.openContextChat(chatContextForCurrentStep(), options)"), 'lab screens should open the shared LearnMode chat panel');
assert(lab.includes("if (ui.chatBtn) ui.chatBtn.classList.remove('hidden');"), 'lab chat button should stay visible outside guided mode');
assert(index.includes('data-engine="gemini"') && index.includes('GEMINI 2.5 FLASH'), 'learn chat and Pack Maker should expose Gemini 2.5 Flash as an engine choice');
assert(index.includes('<option value="gemini" selected>GEMINI 2.5 FLASH</option>'), 'learn chat hidden select should default to Gemini');
assert(learn.includes('LEARN_API_BASE') && learn.includes('`${LEARN_API_BASE}/api/learn-chat/stream`'), 'learn chat should call the base-prefixed streaming server-side LLM proxy');
assert(learn.includes("engine: ui.chatEngine.value"), 'learn chat should send the selected LLM engine');
assert(!learn.includes('TEST_CHAT_ENGINE'), 'localhost GPT test lock should be removed');
assert(learn.includes('offerKugnusFallbackIfNeeded()'), 'learn chat should offer KUGNUS-to-GPT fallback');
assert(!learn.includes('sessionStorage'), 'learn chat fallback should not persist across page reloads');
assert(learn.includes('function syncChatEngineUi()'), 'custom learn chat engine picker should sync with the hidden select value');
assert(learn.includes('function toggleChatEngineMenu()'), 'custom learn chat engine picker should use a themed popover');
assert(index.includes('.learn-engine-menu'), 'learn chat engine popover should be themeable instead of native browser blue');
const learnEngineNative = cssBlock('#learn-chat-engine');
assert(learnEngineNative.includes('display: none;'), 'learn chat native engine select should be removed from layout');
assert(index.includes('id="learn-chat-engine" aria-label="LLM 엔진 선택" aria-hidden="true" tabindex="-1"'), 'learn chat hidden engine select should not be accessible as the visible control');
assert(server.includes('app.post("/api/learn-chat"'), 'learn chat proxy route is missing');
assert(server.includes('app.post("/api/learn-chat/stream"'), 'streaming learn chat proxy route is missing');
assert(server.includes("조교의 한마디:") && server.includes("6~10줄"), 'learn chat prompt should enforce concise tutor-style answers across all LLM engines');
assert(server.includes('application/x-ndjson'), 'streaming learn chat should emit NDJSON');
assert(server.includes('writeNdjson(res, "meta"'), 'streaming learn chat should emit meta events');
assert(server.includes('writeNdjson(res, "delta"'), 'streaming learn chat should emit delta events');
assert(server.includes('writeNdjson(res, "done"'), 'streaming learn chat should emit done events');
assert(server.includes('writeNdjson(res, "error"'), 'streaming learn chat should emit error events');
assert(server.includes('llmPayload(target, messages, true'), 'LLM stream requests must set stream:true');
assert(learn.includes('new AbortController()'), 'learn chat should use AbortController for STOP');
assert(learn.includes('chatSubmitting: false'), 'learn chat should keep a submit lock separate from visual busy state');
assert(learn.includes('chatActiveRequestId'), 'learn chat should track the active request id to ignore stale stream events');
assert(learn.includes('if (session.chatBusy || session.chatSubmitting) return;'), 'learn chat should lock duplicate sends at the top of sendChatText');
assert(learn.includes('if (requestId !== session.chatActiveRequestId) return;'), 'learn chat should ignore stale stream events from obsolete requests');
assert(!learn.includes('offerKugnusFallbackIfNeeded().catch'), 'learn chat should not show KUGNUS fallback prompts just by opening the panel');
assert(learn.includes("ui.chatSend.textContent = busy ? 'STOP' : 'ASK'"), 'ASK button should turn into STOP while streaming');
assert(index.includes('learn-chat-bottom'), 'learn chat should include a scroll-to-latest button');
assert(cssBlocks('.learn-chat-bottom').some(block => block.includes('right: 42px;')), 'learn chat NEW button should sit clear of the scrollbar and panel edge');
assert(learn.includes('renderMarkdownInto'), 'learn chat should render markdown through a safe DOM renderer');
assert(learn.includes('appendInline'), 'learn chat markdown renderer should build inline nodes safely');
assert(learn.includes('createAssistantActions'), 'assistant answers should expose copy/retry/regenerate actions');
assert(learn.includes('persistChatHistory()'), 'learn chat should persist lesson history');
assert(!/innerHTML\s*=\s*(markdown|answer|text|data\.answer)/.test(learn), 'markdown/chat answers must not be assigned through raw innerHTML');
assert(server.includes('KUGNUS_GATEWAY_BASE_URL'), 'KUGNUS SERVER should prefer the public gateway base URL');
assert(server.includes('KUGNUS_GATEWAY_API_KEY'), 'KUGNUS SERVER should read the public gateway API key');
assert(server.includes('KUGNUS_GATEWAY_MODEL'), 'KUGNUS SERVER should read the gateway model id');
assert(server.includes('KUGNUS_CHAT_MODEL'), 'KUGNUS SERVER should accept the public gateway chat model alias');
assert(server.includes('GEMINI_API_KEY'), 'server should support Gemini as an optional comparison engine');
assert(server.includes('streamGenerateContent?alt=sse'), 'server should stream Gemini through the official SSE endpoint');
assert(server.includes('LLM_TARGET_DIAGNOSTICS'), 'KUGNUS health target host diagnostics should be gated in production');
assert(!server.includes('shouldUseOpenAiEnvForKugnus'), 'KUGNUS routing must not treat OPENAI_* as a KUGNUS alias');
assert(!server.includes('function openAiEnvKugnusAliasReady'), 'obsolete OPENAI_* KUGNUS alias helper should not exist');
assert(server.includes('function kugnusRouteFromEnvName'), 'KUGNUS health should identify gateway routing');
assert(server.includes('route: target.route'), 'KUGNUS health and stream meta should expose sanitized routing type');
assert(game.includes('route: llmStatus.route'), 'front-end KUGNUS status snapshot should preserve the current route');
assert(learn.includes('function chatEngineStatus'), 'learn chat status should include KUGNUS route context');
assert(learn.includes('function isObsoleteKugnusRouteEntry'), 'learn chat should clean stale pre-gateway KUGNUS route chat history');
assert(learn.includes('previous.role === \'user\'') && learn.includes("cleaned[cleaned.length - 1] = item"), 'learn chat should collapse orphan consecutive user messages after stale route cleanup');
assert(index.includes('id="learn-chat-route"'), 'learn chat should show the active KUGNUS route separately from task status');
assert(learn.includes('function updateChatRouteStatus'), 'learn chat should update the visible KUGNUS route indicator');
assert(learn.includes("if (value === 'direct') return 'LOCAL DIRECT';"), 'learn chat should label direct KUGNUS routing as local-only');
assert(server.includes('normalizeOpenAiMiniModel'), 'OpenAI model ids should be normalized before use');
assert(server.includes('function normalizedEngineName(value, fallback = "gemini")'), 'server chat engine default should prefer Gemini for public clones');
assert(server.includes('app.get("/api/llm/kugnus/health"'), 'KUGNUS health endpoint is missing');
assert(game.includes('startKugnusHealthCheck()'), 'app should start a background KUGNUS health check');
assert(game.includes('maybeSwitchFromOfflineKugnus'), 'app should expose KUGNUS fallback confirmation helper');
assert(game.includes('llmStatus.fallbackScopes.delete(scope)') && game.includes('llmStatus.promptedScopes.delete(scope)'), 'KUGNUS online health should clear stale fallback prompts/scopes');
assert(game.includes('extraText: status.reason'), 'KUGNUS fallback prompt should show the current health failure reason');
assert(server.includes('Only OpenAI mini models are allowed for learn chat'), 'learn chat must refuse non-mini OpenAI models');
assert(server.includes('DUCKDUCKGO_API_KEY'), 'future web search should support DUCKDUCKGO_API_KEY');
assert(server.includes('duckDuckGoConfig()'), 'DuckDuckGo config helper is missing');
assert(server.includes('duckDuckGoHtmlSearch'), 'Pack Maker search should fall back to DuckDuckGo HTML results when Instant Answer is empty');
assert(server.includes('normalizeDuckDuckGoHref'), 'DuckDuckGo HTML result redirect URLs should be normalized before becoming sources');
assert(server.includes('async function wikipediaSearch'), 'Pack Maker should enrich search grounding with Wikipedia');
assert(server.includes('async function wikidataSearch'), 'Pack Maker should enrich search grounding with Wikidata entity search');
assert(server.includes('async function collectPackMakerSources'), 'Pack Maker should merge multiple grounding sources before LLM generation');
assert(server.includes('function packMakerSourceQueries'), 'Pack Maker should build domain-specific multi-query source searches');
assert(server.includes('async function wikipediaSearchQuery'), 'Pack Maker Wikipedia grounding should fetch page extracts per query');
assert(server.includes('apiUrl.searchParams.set("generator", "search")'), 'Wikipedia grounding should use generator search for page metadata');
assert(server.includes('apiUrl.searchParams.set("prop", "extracts|info")'), 'Wikipedia grounding should include intro extracts, not only search snippets');
assert(server.includes('apiUrl.searchParams.set("explaintext", "1")'), 'Wikipedia extracts should be plain text before entering prompts');
assert(server.includes('const queries = packMakerSourceQueries(intent, message);'), 'Pack Maker source collection should use multi-query intent grounding');
assert(server.includes('function filterPackMakerSourcesByProfile'), 'Pack Maker should filter grounding sources by detected domain profile');
assert(server.includes('국가대표|축구|대통령'), 'country-name packs should reject common Korean country/anthem/team ambiguities');
assert(server.includes('mergePackMakerSources(wikipediaResults, wikidataResults, duckResults)'), 'Pack Maker source merge should prioritize Wikipedia/Wikidata before broad DuckDuckGo results');
assert(server.includes('function isLyricsExtractionRequest'), 'Pack Maker should detect lyrics-based extraction requests explicitly');
assert(server.includes('function hasUserProvidedLyricsText'), 'Pack Maker should require pasted lyric text before lyrics extraction');
assert(server.includes('LYRICS TEXT REQUIRED'), 'Pack Maker should not hallucinate packs from missing lyric bodies');
assert(server.includes('가사에서 단어를 뽑는 요청은 가사 본문이 필요합니다'), 'lyrics guard should explain that search snippets are not the lyric body');
assert(server.includes('route: "lyrics-text-required"'), 'lyrics guard should return a non-generation route before LLM draft generation');
assert(server.includes('label: packMakerEngineLabel(engine)'), 'Pack Maker brief/guard routes should not reference an unbuilt LLM target');

const dashboardCard = cssBlock('.dashboard-card');
assert(dashboardCard.includes('max-height: calc(100dvh - 80px);'), 'dashboard card should be scrollable inside the viewport');
assert(dashboardCard.includes('overflow-y: auto;'), 'dashboard card should not clip its content');

const surgeAfter = cssBlock('.edition-surge::after');
assert(!surgeAfter.includes('linear-gradient(112deg'), 'old X transition gradient should not return');
assert(!surgeAfter.includes('linear-gradient(68deg'), 'old X transition gradient should not return');
assert(index.includes('body.edition-burst .edition-surge'), 'edition switch burst animation is missing');

assert(!game.includes('confirm('), 'native confirm should be replaced with the in-app themed modal');
assert(!game.includes('prompt('), 'native prompt should be replaced with the in-app themed modal');
assert(!game.includes('alert('), 'native alert should be replaced with the in-app themed modal');
assert(!game.includes('Loop:') && !game.includes('Spawning Word...'), 'DROP game loop should not keep noisy debug logging');
assert(!game.includes('Game Controls Initialized') && !game.includes('Audio Initialized & BGM Started'), 'game startup should not emit debug-only console logs');
assert(game.includes('showCommandDialog({'), 'themed command dialog route is missing');
const confirmScreen = cssBlock('#confirm-screen');
assert(confirmScreen.includes('z-index: 260;'), 'themed confirm dialog should sit above every app overlay');
assert(game.includes('setGameChrome(true)'), 'game HUD/input should only activate during actual gameplay');
assert(game.includes('MutationObserver(syncOverlayChrome)'), 'overlay chrome observer is missing');
assert(!game.includes("    'start-screen',\n    'result-screen'"), 'start screen should keep the bottom music/readme toggles visible');

const hudHidden = cssBlock('body:not(.game-active) #hud');
assert(hudHidden.includes('pointer-events: none;'), 'inactive HUD should not intercept input');
const inputHidden = cssBlock('body:not(.game-active) #input-area');
assert(inputHidden.includes('pointer-events: none;'), 'inactive command input should not intercept input');
assert(!index.includes('body.overlay-chrome-hidden #music-widget'), 'music widget should stay visible on every app screen');
assert(!index.includes('body.overlay-chrome-hidden #readme-widget'), 'readme widget should stay visible on every app screen');
assert(index.includes('<label>SELECT PACK</label>'), 'DROP pack selector label should be SELECT PACK');
assert(!index.includes('<label>Data Pack</label>'), 'old Data Pack label should not return');
assert(index.includes('class="pack-native-select"'), 'native pack select should stay in the DOM as the hidden state source');
assert(index.includes('class="pack-selector"'), 'custom pack selector shell is missing');
assert(index.includes('class="pack-console"'), 'retro console dropzone is missing');
assert(index.includes('class="pack-popover hidden"'), 'pack cartridge popover is missing');
assert(index.includes('class="pack-popover-body"'), 'pack selector popover should own the cartridge shelf body');
assert(index.includes('class="pack-popover-console"'), 'console dropzone should live inside the popover');
assert(index.indexOf('id="pack-console"') > index.indexOf('id="pack-popover"'), 'console dropzone should not consume main menu height');
assert(index.includes('.pack-cartridge'), 'CSS cartridge card styling is missing');
assert(index.includes('.pack-console-deck'), 'retro console should render a visible game deck');
assert(index.includes('id="pack-console-dock"'), 'pack console should include a handheld-style dock display');
assert(index.includes('id="pack-console-status-art"'), 'pack console should include READY text art feedback');
assert(index.includes('id="pack-trash-zone"'), 'pack selector should include a trash drop zone for My Packs');
assert(index.includes('.pack-trash-zone.drop-hot'), 'pack selector trash drop zone should expose a hot drop state');
[
    'pack-console-sfc-dot',
    'pack-console-slot',
    'pack-console-buttons',
    'pack-console-face',
    'pack-console-port',
    'pack-console-led',
    'pack-console-brand'
].forEach(stale => {
    assert(!index.includes(stale), `stale console skin should be removed: ${stale}`);
});
assert(index.includes('.pack-logo-python'), 'Python pack should have a cartridge logo mark');
assert(game.includes('function createPackLogo(meta)'), 'pack cards should render logo marks');
assert(game.includes("card.dataset.packCard = 'true';"), 'pack cards should expose a stable card-only selector');
assert(game.includes('function playPackLatchSound()'), 'pack insertion should have a click/latch sound cue');
assert(game.includes('packReadyText(meta)'), 'pack insertion should show READY text art');
assert(game.includes('function animatePackEquip(meta, sourceEl)'), 'pack equip animation should target the handheld dock');
assert(game.includes('async function deletePackFromUi'), 'pack selector should support deleting My Packs from the UI');
assert(game.includes('packTrashZone'), 'pack selector should wire the trash drop zone');
assert(game.includes('meta.deletable'), 'pack selector should protect official/public packs from trash deletion');
assert(game.includes('window.PackMaker.deletePack'), 'pack selector delete flow should call PackMaker.deletePack');
assert(!game.includes('animatePackInsert'), 'old slot insertion animation name should not remain');
assert(index.includes('@keyframes packDockAfterimage'), 'pack dock afterimage animation is missing');
const packPopover = cssBlock('.pack-popover', block => block.includes('width: min(780px, calc(100vw - 32px));'));
assert(packPopover.includes('position: fixed;'), 'desktop pack popover should overlay the menu instead of stretching it');
assert(packPopover.includes('left: 50%;'), 'desktop pack popover should center horizontally');
assert(packPopover.includes('transform: translate(-50%, -50%);'), 'desktop pack popover should center in the viewport');
assert(packPopover.includes('height: min(660px, calc(100dvh - 80px));'), 'pack popover should keep a stable scrollable height');
assert(game.includes('function initPackSelector()'), 'pack selector interaction initializer is missing');
assert(game.includes('select.dispatchEvent(new Event(\'change\', { bubbles: true }))'), 'pack selector should drive the native select change event');
assert(game.includes('async function selectPackFromUi'), 'custom pack selection should be able to wait for pack detail loading');
assert(game.includes("await window.PackMaker.loadPackDetail(customPackId);"), 'custom pack selection should load detail data before gameplay');
assert(game.includes('const previousValue = select.value;'), 'custom pack selection should remember the previous pack before async loading');
assert(game.includes('select.value = previousValue;'), 'custom pack selection should revert if custom pack detail loading fails');
assert(game.includes('!Array.isArray(WORD_PACKS[value]) || WORD_PACKS[value].length === 0'), 'custom pack selection should verify playable WORD_PACKS data before committing');
assert(game.includes('async function ensureSelectedPackReady(pack)'), 'DROP start should guard custom packs before game launch');
assert(game.includes('if (!await ensureSelectedPackReady(pack)) return;'), 'DROP start should not launch with an unloaded custom pack');
assert(game.includes('function isCaseInsensitivePackActive()'), 'custom packs should opt into case-insensitive word matching');
assert(game.includes('function wordEqualsInput(wordText, inputText)'), 'custom pack Enter matching should normalize user input and falling terms');
assert(game.includes('event.dataTransfer.setData'), 'pack selector should support drag-to-console');
assert(game.includes('window.CodeDropPackSelector'), 'custom packs should be able to refresh the visual pack selector');
assert(packMaker.includes("throw new Error('Pack detail is empty')"), 'pack maker detail loading should fail loudly when a saved pack has no playable items');
assert(packMaker.includes('select.dispatchEvent(new Event(\'change\', { bubbles: true }))'), 'saved custom packs should dispatch native select change after being selected');
assert(packMaker.includes('function showSaveSuccessNotice'), 'pack maker save should show an explicit success notice');
assert(packMaker.includes('PACK SAVED'), 'pack maker save notice should use a clear saved title');
const packMakerShell = cssBlock('.pack-maker-shell');
assert(packMakerShell.includes('width: min(1680px, calc(100vw - 88px));'), 'pack maker shell should be wide enough for 50-item editing');
assert(packMakerShell.includes('minmax(0, 1.48fr)'), 'pack maker editor panel should stay inside the shell and let its table scroll');
const packMakerTableWrap = cssBlock('.pack-maker-table-wrap');
assert(packMakerTableWrap.includes('overflow: auto;') && packMakerTableWrap.includes('scrollbar-gutter: stable both-edges;'), 'pack maker table should scroll cleanly when rows or columns overflow');
const packMakerTable = cssBlock('.pack-maker-table');
assert(packMakerTable.includes('min-width: 760px;') && packMakerTable.includes('table-layout: fixed;'), 'pack maker table should keep source fields visible inside a stable editable grid');
const packMakerActionColumn = cssBlock('.pack-maker-table th:last-child,\n        .pack-maker-table td:last-child');
assert(packMakerActionColumn.includes('position: sticky;') && packMakerActionColumn.includes('right: 0;'), 'pack maker row action column should stay visible while the editor table scrolls');
const packMakerSourceCell = cssBlock('.pack-maker-source-cell');
assert(packMakerSourceCell.includes('display: table-cell;'), 'pack maker source cell should participate in table column sizing');
assert(!packMakerSourceCell.includes('display: grid;'), 'pack maker source td should not break table layout with grid display');
assert(index.includes('class="pack-maker-review-note"'), 'pack maker should explain public review before submission');
assert(game.includes("'packMaker.submit': '공개 요청'"), 'pack maker public listing action should use natural Korean copy');
assert(game.includes('운영자 검수 후'), 'pack maker public listing copy should clarify operator review');
assert(index.includes('#music-widget.widget-overlap'), 'music widget should only fade when it overlaps falling words');
assert(index.includes('#readme-widget.widget-overlap'), 'readme widget should only fade when it overlaps falling words');
assert(index.includes('--corner-widget-size: 60px;'), 'bottom corner widgets should share one size token');
assert(index.includes('--corner-widget-offset: 24px;'), 'bottom corner widgets should use the balanced default offset token');
const gameActiveBlocks = cssBlocks('body.game-active');
assert(gameActiveBlocks.some(block => block.includes('--corner-widget-offset: 28px;')), 'DROP mode should lift the bottom corner widgets into the input panel rhythm');
assert(gameActiveBlocks.some(block => block.includes('--corner-widget-offset: 20px;')), 'mobile DROP mode should keep the bottom corner widget lift conservative');
assert(index.includes('--music-island-safe-width: calc(100vw - (var(--corner-widget-offset) * 2) - 12px);'), 'music island width should account for the right corner offset');
assert(index.includes('--music-island-width: min(380px, var(--music-island-safe-width));'), 'compact music island should stay inside the safe viewport width');
assert(index.includes('--music-island-expanded-width: min(640px, var(--music-island-safe-width));'), 'expanded music island should grow left while staying inside the safe viewport width');
assert(index.includes('data-player-ui="island"'), 'music widget should default to island player UI');
assert(index.includes('class="music-control-btn music-ui-toggle"'), 'music widget should expose a SoundCloud view icon toggle');
assert(index.includes('id="music-detail-toggle"'), 'music island should expose a left-side detail toggle');
assert(index.includes('class="music-detail-icon"'), 'music detail toggle should be a compact SVG icon');
assert(!index.includes('.music-detail-toggle::before'), 'music detail toggle should not use an oversized text glyph');
const musicDetailButton = cssBlock('.music-control-btn.music-detail-toggle');
assert(musicDetailButton.includes('width: 24px;'), 'music detail toggle should render as a compact icon button');
assert(musicDetailButton.includes('min-width: 24px;'), 'music detail toggle should not inherit the wide music button min-width');
assert(index.includes('id="music-track-toggle"'), 'music island should expose a playlist popover toggle');
assert(index.includes('id="music-track-popover"'), 'music island should render the playlist popover');
assert(index.includes('class="soundcloud-mark"'), 'legacy music view should be opened through a SoundCloud icon');
assert(index.includes('class="music-control-btn music-play-toggle"'), 'music play control should be an icon button');
assert(index.includes('class="music-play-icon"'), 'music play control should include a play icon');
assert(index.includes('class="music-pause-icon"'), 'music play control should include a pause icon');
assert(!index.includes('id="music-play-toggle" data-music-action="toggle" type="button">PLAY'), 'music play control should not use PLAY text');
assert(!index.includes('>UI 2<'), 'music player should not expose the stale UI 2 label');
assert(index.includes('<span class="icon-label">MUSIC</span>'), 'music widget closed label should be MUSIC');
assert(!index.includes('MUSICBOX'), 'old MUSICBOX label should not return');
const musicWidget = cssBlock('#music-widget');
assert(musicWidget.includes('z-index: 120;'), 'music widget should sit above app screens');
assert(musicWidget.includes('bottom: var(--corner-widget-offset);'), 'music widget should follow the shared corner widget offset');
assert(musicWidget.includes('right: var(--corner-widget-offset);'), 'music widget should follow the shared corner widget offset');
const musicClosed = cssBlock('#music-widget.closed');
assert(musicClosed.includes('width: var(--corner-widget-size);'), 'music widget should use the shared corner widget width');
assert(musicClosed.includes('height: var(--corner-widget-size);'), 'music widget should use the shared corner widget height');
const musicIsland = cssBlock('#music-widget[data-player-ui="island"].island-open');
assert(musicIsland.includes('width: var(--music-island-width);'), 'music island player should use the island width token');
assert(musicIsland.includes('z-index: 132;'), 'open music island should sit above the closed corner buttons');
const musicIslandExpanded = cssBlock('#music-widget[data-player-ui="island"].island-open.track-open');
assert(musicIslandExpanded.includes('width: var(--music-island-expanded-width);'), 'music island detail player should use the expanded island width token');
assert(cssBlocks('#music-widget[data-player-ui="island"].island-open').some(block => block.includes('bottom: calc(var(--corner-widget-offset) + var(--corner-widget-size) + 12px);')), 'mobile music island should lift above the corner buttons instead of covering README');
const trackOpenContent = cssBlock('#music-widget[data-player-ui="island"].island-open.track-open .widget-content');
assert(trackOpenContent.includes('gap: 8px;') && trackOpenContent.includes('padding: 0 10px 0 12px;'), 'expanded music island content should be compact enough to keep controls inside the pill');
assert(index.includes('#music-widget.open.legacy-open'), 'legacy square music player should remain as the SoundCloud view');
const musicLegacy = cssBlock('#music-widget.open.legacy-open');
assert(musicLegacy.includes('z-index: 132;'), 'legacy music view should sit above the closed corner buttons');
const readmeWidget = cssBlock('#readme-widget');
assert(readmeWidget.includes('z-index: 120 !important;'), 'readme widget should sit above app screens despite inline legacy styles');
assert(readmeWidget.includes('bottom: var(--corner-widget-offset);'), 'readme widget should follow the shared corner widget offset');
assert(readmeWidget.includes('left: var(--corner-widget-offset);'), 'readme widget should follow the shared corner widget offset');
assert(readmeWidget.includes('width: var(--corner-widget-size);'), 'readme widget should use the shared corner widget width');
assert(readmeWidget.includes('height: var(--corner-widget-size);'), 'readme widget should use the shared corner widget height');
assert(game.includes('function updateBottomWidgetOverlap'), 'DROP mode should detect when falling words overlap the bottom widgets');
assert(game.includes("classList.toggle('widget-overlap'"), 'bottom widget overlap should be controlled by a class');
assert(game.includes('updateBottomWidgetOverlap(timestamp);'), 'DROP game loop should refresh bottom widget overlap state');
assert(game.includes("const MUSIC_UI_STORAGE_KEY = 'codedrop_music_ui'"), 'music player UI choice should persist locally');
assert(!game.includes("playToggle.textContent = musicPlaying ? 'PAUSE' : 'PLAY'"), 'music play icon should not be replaced with text');
assert(game.includes('function openMusicWidget'), 'music widget should open through a mode-aware helper');
assert(game.includes("els.musicWidget.classList.add('island-open')"), 'music widget default UI should open as a dynamic island');

assert(server.includes('app.post("/api/pack-maker/chat/stream", authUser'), 'pack maker stream endpoint should require auth');
assert(server.includes('function extractPackIntent'), 'pack maker should parse realistic natural-language pack requests');
assert(server.includes('function normalizePackLanguageOverride'), 'pack maker should normalize explicit language overrides from the UI');
assert(server.includes('termLanguageOverride') && server.includes('descriptionLanguageOverride'), 'pack maker stream should accept term/description language overrides');
assert(server.includes('function cleanPackTitleCandidate'), 'pack maker should clean extracted pack titles through a dedicated helper');
assert(server.includes('function isPackGenerationRequest'), 'pack maker should gate vague chat before starting search/generation');
assert(server.includes('PACK BRIEF REQUIRED'), 'pack maker should answer vague prompts with a brief request instead of generating');
assert(server.includes('됩니다. 다만 Pack Maker는 일반 대화보다 데이터팩 생성 요청에 맞춰져 있습니다.'), 'server-side Pack Maker brief answer should explain capability instead of sounding like a hard failure');
assert(server.includes('requestedCount'), 'pack maker should track the requested item count');
assert(server.includes('packMakerTokenBudget'), 'pack maker should scale LLM token budget from target item count');
assert(server.includes('normalizePackDescriptionForItems'), 'pack save should normalize stale/wrong item-count descriptions');
assert(server.includes('\\\\d{1,3}\\\\s*개(?:만)?\\\\s*(?:로|으로)\\\\s*${titlePhrase}'), 'pack title parser should capture titles after count connectors like 50개로');
assert(server.includes('뽑아서|뽑아\\\\s*서|추려서|골라서|정리해서'), 'pack title parser should capture titles after natural Korean extraction verbs');
assert(server.includes('(?:한글|한국어|한국말|영어|영문|english)\\s*(?:로\\s*된|로된|로)?'), 'pack title parser should strip Korean language particles such as 영어로/한글로');
assert(server.includes('PACK_MAKER_BATCH_TIMEOUT_MS'), 'pack maker should bound each LLM batch so requests do not hang indefinitely');
assert(server.includes('600_000'), 'pack maker should allow realistic KUGNUS 50-item drafts to run long enough');
assert(server.includes('180_000'), 'pack maker batch timeout should allow Gemma-class batches enough time');
assert(server.includes('linkedTimeoutSignal'), 'pack maker should link per-batch timeout to client aborts');
assert(server.includes('readLearnLlmStream('), 'pack maker batch generation should stream LLM deltas instead of hiding work until the end');
assert(server.includes('function buildPackMakerFillMessages'), 'pack maker should have a dedicated missing-item repair prompt');
assert(server.includes('generatePackMakerFillDraft'), 'pack maker should repair low-yield batches instead of blindly continuing');
assert(server.includes('PACK_REPAIR_ATTEMPTS'), 'pack maker should retry/repair drafts that are short');
assert(server.includes('draftMeetsPackIntent'), 'pack maker should verify draft count/language before success');
assert(server.includes('function packDomainProfile'), 'pack maker should classify prompt domains before building generation prompts');
assert(server.includes('"country_names"'), 'pack maker should have a dedicated country-name domain profile');
assert(server.includes('"us_states"'), 'pack maker should have a dedicated U.S. states domain profile');
assert(server.includes('"korean_mountains"'), 'pack maker should have a dedicated Korean mountains domain profile');
assert(server.includes('"art_creators"'), 'pack maker should have a dedicated art creators domain profile');
assert(server.includes('"kpop_idol_groups"'), 'pack maker should have a dedicated K-pop idol group domain profile');
assert(server.includes('"kpop_song_theme"'), 'pack maker should have a dedicated K-pop song/theme domain profile');
assert(server.includes('"genz_slang"'), 'pack maker should have a dedicated Gen Z slang domain profile');
assert(server.includes('"workplace_it_slang"'), 'pack maker should have a dedicated workplace IT slang domain profile');
assert(server.includes('"parenting_items"'), 'pack maker should have a dedicated parenting items domain profile');
assert(server.includes('function classifyPackMakerConversation'), 'pack maker should classify generate/ideate/clarify chat turns before LLM generation');
assert(server.includes('PACK IDEA CHECK') && server.includes('PACK IDEAS READY'), 'pack maker should have clarification and idea-ready statuses');
assert(server.includes('function isPackConfirmationResponse'), 'pack maker should let users confirm a suggested pack with a short reply');
assert(server.includes('대한민국 아이돌 그룹 목록'), 'K-pop idol group packs should use Korean idol group source queries');
assert(server.includes('BTS, NCT, IVE'), 'K-pop idol group profile should allow official stylized English group names');
assert(server.includes('멤버 개인명, 솔로 가수명, 곡명, 앨범명, 팬덤명은 제외'), 'K-pop idol group prompt should exclude members, soloists, songs, albums, and fandom names');
assert(server.includes('function isAllowedKpopGroupTerm'), 'K-pop idol group term filter should keep official English names but reject unrelated CJK hallucinations');
assert(server.includes('[\\u3400-\\u9fff\\u3040-\\u30ff]'), 'K-pop idol group term filter should reject Han/Japanese character hallucinations');
assert(server.includes('KPOP_NON_GROUP_TERM_RE'), 'K-pop idol group term filter should reject common solo/individual artist false positives');
assert(server.includes('KPOP_IDOL_GROUP_TERMS'), 'K-pop idol group profile should have a verified fallback seed list');
assert(server.includes('function fillKpopGroupDraftItems'), 'K-pop idol group drafts should fill missing slots from verified groups instead of hallucinating');
assert(server.includes('if (packDomainProfile(intent) === "kpop_idol_groups") return isAllowedKpopGroupTerm(term);'), 'K-pop idol group term filtering should run even when requested language is auto');
assert(server.includes('packMakerSearchQuery(intent, message)'), 'pack maker search query should be derived from the parsed domain intent');
assert(server.includes('const mode = body?.mode === "revision" ? "revision" : "new";'), 'pack maker server should distinguish fresh generation from draft revision');
assert(server.includes('useContext ? sanitizeChatHistory(body?.history) : []'), 'fresh pack maker generation should ignore stale chat history');
assert(server.includes('useContext ? normalizeDraftFromLlm(body?.draft || {}, searchResults) : normalizeDraftFromLlm({}, searchResults)'), 'fresh pack maker generation should ignore stale draft context');
assert(!server.includes('자동차 현장 용어'), 'generic Korean pack language instruction must not force car-repair terms');
assert(!server.includes('관련 자동차 정비 용어입니다.'), 'generic Pack Maker fallback descriptions must not mention car repair');
assert(server.includes('DRAFT SHORT'), 'pack maker should fail visibly when the target draft is still short');
assert(server.includes('writeNdjson(res, "status"'), 'pack maker stream should send generation status events');
assert(!server.includes('{ maxTokens: 2200 }'), 'pack maker should not use a fixed 2200-token budget for every pack');
assert(server.includes('app.post("/api/packs", authUser'), 'custom pack save endpoint should require auth');
assert(server.includes('app.delete("/api/packs/:id", authUser'), 'custom pack delete endpoint should require auth');
assert(server.includes('DELETE FROM custom_pack_scores WHERE pack_id = ?'), 'custom pack delete should clean pack-specific scores');
assert(server.includes('DELETE FROM custom_pack_items WHERE pack_id = ?'), 'custom pack delete should clean pack items');
assert(server.includes('Only the pack owner can delete this pack'), 'custom pack delete should be owner/admin guarded');
assert(server.includes('app.get("/api/packs?') === false, 'custom pack list should not be hardcoded as a static route');
assert(server.includes('PACK_ADMIN_NICKNAMES'), 'pack review should be guarded by admin nicknames');
assert(server.includes('app.get("/api/admin/packs"'), 'admin pack review queue endpoint is missing');
assert(server.includes('sendPackReviewEmail(req, row, items, req.user)'), 'public review submission should trigger admin email notification');
assert(server.includes('https://api.resend.com/emails'), 'review email should use the configured server-side email API');
assert(server.includes('renderPackReviewEmail'), 'review email should render an HTML review template');
assert(server.includes('custom_pack_scores'), 'custom pack scores should be stored separately from official leaderboard');
assert(server.includes('async function ensureDatabaseSchema()'), 'server should run a DB schema guard before release traffic');
assert(server.includes('INFORMATION_SCHEMA.COLUMNS'), 'server schema guard should inspect existing columns before ALTER');
assert(server.includes('ALTER TABLE ${sqlIdentifier(tableName)} ADD COLUMN'), 'server schema guard should add missing columns for upgraded DBs');
assert(server.includes('function dbSslConfig()'), 'server should allow local Docker DB SSL configuration');
assert(server.includes('process.env.DB_SSL'), 'server DB SSL should be configurable for local Docker MySQL');
assert(dockerCompose.includes('image: mysql:8.4'), 'local Docker DB should use a pinned MySQL image');
assert(dockerCompose.includes('3307:3306'), 'local Docker DB should expose MySQL on host port 3307');
assert(dockerCompose.includes('./db/init:/docker-entrypoint-initdb.d:ro'), 'local Docker DB should mount schema init scripts');
assert(localSchema.includes('CREATE TABLE IF NOT EXISTS users'), 'local Docker schema should initialize users table');
assert(localSchema.includes('CREATE TABLE IF NOT EXISTS custom_packs'), 'local Docker schema should initialize custom pack tables');
assert(localSchema.includes('CREATE TABLE IF NOT EXISTS custom_pack_scores'), 'local Docker schema should initialize custom pack score tables');
assert(localEnvExample.includes('DB_SSL=false'), 'local env example should disable TLS for local Docker MySQL');
assert(localEnvExample.includes('DEFAULT_CHAT_ENGINE=gemini'), 'local env example should default chat to Gemini for public clones');
assert(localEnvExample.includes('# KUGNUS_GATEWAY_BASE_URL='), 'local env example should document KUGNUS as a commented owner/private gateway path');
assert(localEnvExample.includes('# KUGNUS_GATEWAY_API_KEY='), 'local env example should document the commented KUGNUS gateway API key');
assert(localEnvExample.includes('# KUGNUS_GATEWAY_MODEL=gemma4:12b-it-qat'), 'local env example should document the commented KUGNUS gateway chat model');
assert(localEnvExample.includes('# KUGNUS_CHAT_MODEL=gemma4:12b-it-qat'), 'local env example should document the commented KUGNUS chat model alias');
assert(localEnvExample.includes('EMBEDDING_MODEL=embeddinggemma:latest'), 'local env example should document the embedding model as a future optional path');
assert(localEnvExample.includes('KUGNUS_EMBED_MODEL=embeddinggemma:latest'), 'local env example should document the KUGNUS embedding model alias');
assert(fs.existsSync(path.join(root, 'scripts/verify_kugnus_gateway_live.mjs')), 'live KUGNUS gateway verifier script is missing');
assert(packageJson.scripts?.['verify:kugnus-gateway'] === 'node scripts/verify_kugnus_gateway_contract.mjs', 'package should expose the KUGNUS gateway contract verifier command');
assert(packageJson.scripts?.['verify:kugnus-live'] === 'node scripts/verify_kugnus_gateway_live.mjs', 'package should expose the live KUGNUS gateway verifier command');
assert(packageJson.scripts?.['verify:release-matrix'] === 'node scripts/verify_release_readiness_matrix.mjs', 'package should expose release readiness matrix verification');
assert(packageJson.scripts?.['verify:release-runtime'] === 'node scripts/verify_release_runtime_route.mjs', 'package should expose release runtime route verification');
assert(packageJson.scripts?.['verify:release-runtime-contract'] === 'node scripts/verify_release_runtime_contract.mjs', 'package should expose release runtime contract verification');
assert(packageJson.scripts?.['verify:docker'] === 'node scripts/verify_docker_image.mjs', 'package should expose a production Docker image verifier');
assert(fs.existsSync(path.join(root, 'scripts/verify_docker_image.mjs')), 'Docker image verifier script is missing');
assert(fs.existsSync(path.join(root, 'scripts/verify_release_readiness_matrix.mjs')), 'release readiness matrix verifier script is missing');
assert(fs.existsSync(path.join(root, 'scripts/verify_release_runtime_route.mjs')), 'release runtime route verifier script is missing');
assert(fs.existsSync(path.join(root, 'scripts/verify_release_runtime_contract.mjs')), 'release runtime contract verifier script is missing');
const liveGatewayVerifier = read('scripts/verify_kugnus_gateway_live.mjs');
const releaseReadinessMatrix = read('scripts/verify_release_readiness_matrix.mjs');
const releaseRuntimeVerifier = read('scripts/verify_release_runtime_route.mjs');
const releaseRuntimeContract = read('scripts/verify_release_runtime_contract.mjs');
const dockerImageVerifier = read('scripts/verify_docker_image.mjs');
const readme = read('README.md');
assert(liveGatewayVerifier.includes("const envStyle = 'kugnus-gateway';"), 'live gateway verifier should report the canonical gateway env style');
assert(liveGatewayVerifier.includes("const expectedRuntimeRoute = 'gateway';"), 'live gateway verifier should print the canonical gateway route');
assert(liveGatewayVerifier.includes('function observedOpenAiEnv'), 'live gateway verifier should show OPENAI_* as GPT fallback context');
assert(liveGatewayVerifier.includes('GPT fallback only'), 'live gateway verifier should distinguish GPT fallback env from KUGNUS gateway env');
assert(liveGatewayVerifier.includes('DNS lookup failed'), 'live gateway verifier should surface DNS failures clearly');
assert(!releaseReadinessMatrix.includes('OPENAI_* KUGNUS alias'), 'release readiness matrix should not endorse OPENAI_* as KUGNUS');
assert(!releaseReadinessMatrix.includes('direct KUGNUS route is blocked for release'), 'release readiness matrix should not model legacy direct KUGNUS routing');
assert(releaseReadinessMatrix.includes('generic OpenAI fallback must remain mini'), 'release readiness matrix should cover generic GPT mini guard');
assert(releaseReadinessMatrix.includes('firebase placeholder files are blocked by contract'), 'release readiness matrix should block placeholder Firebase files');
assert(releaseReadinessMatrix.includes('firebase release skeleton passes contract checks'), 'release readiness matrix should prove a complete Firebase skeleton can pass contract checks');
assert(releaseRuntimeVerifier.includes('scripts/check_release_readiness.mjs'), 'release runtime verifier should run release preflight before starting server');
assert(releaseRuntimeVerifier.includes('/api/llm/kugnus/health'), 'release runtime verifier should probe the running server KUGNUS health endpoint');
assert(releaseRuntimeVerifier.includes('Release runtime is using the wrong KUGNUS route'), 'release runtime verifier should fail on direct KUGNUS route mismatches');
assert(releaseRuntimeContract.includes('RELEASE_RUNTIME_TEST_MODE'), 'release runtime contract should use explicit test mode');
assert(releaseRuntimeContract.includes('RELEASE_RUNTIME_SKIP_READY_DB'), 'release runtime contract should skip DB only in explicit test mode');
assert(releaseRuntimeContract.includes("mode: 'gateway'"), 'release runtime contract should verify canonical KUGNUS gateway routing');
assert(releaseRuntimeContract.includes("envContract: 'KUGNUS_GATEWAY_* with KUGNUS_CHAT_MODEL alias'"), 'release runtime contract should state the KUGNUS gateway env contract and alias');
assert(dockerImageVerifier.includes("docker', ['build'"), 'Docker verifier should build the production image');
assert(dockerImageVerifier.includes('/health'), 'Docker verifier should probe the container health endpoint');
assert(dockerImageVerifier.includes('.env.production'), 'Docker verifier should reject private production env files in the image');
assert(dockerImageVerifier.includes('100\\\\.99\\\\.'), 'Docker verifier should reject private Tailscale gateway addresses in the image');
assert(dockerImageVerifier.includes('sk-[A-Za-z0-9_-]{16,}'), 'Docker verifier should reject secret-like OpenAI keys in the image');
assert(kugnusGatewayContract.includes('verifyOpenAiEnvDoesNotConfigureKugnus'), 'KUGNUS gateway contract should prove OPENAI_* remains GPT fallback only');
assert(kugnusGatewayContract.includes('verifyCanonicalGatewayRequired'), 'KUGNUS gateway contract should require canonical KUGNUS gateway env');
assert(readme.includes('GEMINI_API_KEY=<GEMINI_API_KEY>'), 'README should document Gemini as the public clone LLM setup path');
assert(readme.includes('# KUGNUS_GATEWAY_BASE_URL=https://llm.example.com/v1'), 'README should document KUGNUS as a commented owner/private gateway path');
assert(readme.includes('.env.kugnus-gateway.example'), 'README should point to the commented KUGNUS owner/private reference template');
assert(readme.includes('npm run verify:kugnus-gateway'), 'README should document the KUGNUS gateway contract verifier command');
assert(readme.includes('verify:release-runtime -- --env-file=.env.production'), 'README should document runtime route verification before release');
assert(readme.includes('`OPENAI_*` remains the ordinary GPT mini path'), 'README should make OPENAI_* the ordinary GPT mini path');
assert(readme.includes('release tooling treats that'), 'README should document explicit release env files as authoritative');
assert(verifyAll.includes('scripts/verify_release_readiness_matrix.mjs'), 'main verification should exercise the release readiness matrix');
assert(verifyAll.includes('scripts/verify_release_runtime_contract.mjs'), 'main verification should exercise the release runtime contract');
assert(fs.existsSync(path.join(root, 'scripts/system_doctor.mjs')), 'system doctor script is missing');
assert(packageJson.scripts?.doctor === 'node scripts/system_doctor.mjs', 'package should expose the system doctor command');
assert(packageJson.scripts?.['doctor:deep'] === 'node scripts/system_doctor.mjs --deep', 'package should expose the deep system doctor command');
assert(packageJson.scripts?.['doctor:full'] === 'node scripts/system_doctor.mjs --deep --packmaker', 'package should expose a full system doctor command with real Pack Maker E2E');
assert(packageJson.scripts?.['doctor:release'] === 'node scripts/system_doctor.mjs --deep --strict', 'package should expose a fail-fast release doctor command');
assert(packageJson.scripts?.['doctor:release:full'] === 'node scripts/system_doctor.mjs --deep --packmaker --strict', 'package should expose a fail-fast release doctor with real Pack Maker E2E');
assert(readme.includes('npm run doctor:full -- --base-url=http://127.0.0.1:3001'), 'README should document the full system doctor release candidate command');
assert(readme.includes('real KUGNUS Pack Maker E2E'), 'README should make clear doctor:full runs the real KUGNUS Pack Maker E2E');
assert(readme.includes('npm run doctor:release -- --base-url=<deployed-or-local-url> --env-file=<release-env-file>'), 'README should document the fail-fast release doctor command');
assert(readme.includes('doctor:release:full'), 'README should document the fail-fast release doctor with Pack Maker E2E');
assert(systemDoctor.includes("if (strict && (result.codedropDoctor === 'FAIL' || result.codedropDoctor === 'BLOCKED'))"), 'system doctor strict mode should fail on FAIL or BLOCKED release states');
assert(releaseCheck.includes("['.env.local', '.env']"), 'release check should load the same default env stack as the server');
assert(releaseCheck.includes('override: Boolean(explicitEnvFile)'), 'release check should let explicit env files override stale shell env');
assert(systemDoctor.includes("['.env.local', '.env']"), 'system doctor should load the same default env stack as the server');
assert(systemDoctor.includes('override: Boolean(explicitEnvFile)'), 'system doctor should let explicit env files override stale shell env');
assert(systemDoctor.includes("'http://127.0.0.1:3001'"), 'system doctor default should use 127.0.0.1 to avoid localhost resolver drift');
assert(liveGatewayVerifier.includes('override: false'), 'live KUGNUS verifier should let process env override env-file values');
assert(releaseCheck.includes('SESSION_SECRET must be a long random production secret'), 'release check should reject local/dev session secrets');
assert(releaseCheck.includes('ALLOWED_ORIGINS must contain only public https origins'), 'release check should reject localhost/private release origins');
assert(releaseCheck.includes('DEFAULT_CHAT_ENGINE must be gemini, openai, or kugnus'), 'release check should allow Gemini, OpenAI, or optional owner/private KUGNUS engines');
assert(releaseCheck.includes('GEMINI_API_KEY is required when DEFAULT_CHAT_ENGINE=gemini'), 'release check should require Gemini API key for Gemini releases');
assert(releaseCheck.includes('hasGenericOpenAiFallback'), 'release check should accept generic OPENAI_* as the GPT mini path');
assert(releaseCheck.includes('Generic OPENAI_MODEL fallback must stay gpt-5.4-mini'), 'release check should enforce mini-only generic GPT fallback');
assert(releaseCheck.includes('Firebase Hosting must rewrite /api/** to Cloud Run or Functions'), 'release check should require Firebase API rewrites');
assert(releaseCheck.includes('.firebaserc projects.default must be the real Firebase project id'), 'release check should reject placeholder Firebase project ids');
assert(releaseCheck.includes('firestore.rules must not use open development allow read/write rules'), 'release check should reject open Firestore rules');
assert(releaseCheck.includes('Firebase API layer must expose required private endpoints'), 'release check should require Firebase private API endpoint contracts');
assert(releaseCheck.includes('function checkRenderBlueprint()'), 'release check should validate the Render Docker Blueprint');
assert(releaseCheck.includes('runtime: docker'), 'release check should require Render Docker runtime');
assert(releaseCheck.includes('healthCheckPath: /health'), 'release check should require Render health checks');
assert(releaseCheck.includes('autoDeployTrigger: checksPass'), 'release check should require Render deploys after CI checks pass');
assert(releaseCheck.includes('renderYamlKeyUsesSyncFalse'), 'release check should verify Render secret env vars are sync:false');
assert(releaseCheck.includes('render.yaml must not contain private gateway addresses or secret-like keys'), 'release check should reject private/secret Render Blueprint values');
assert(renderYaml.includes('runtime: docker'), 'render.yaml should deploy the Docker runtime');
assert(renderYaml.includes('dockerfilePath: ./Dockerfile'), 'render.yaml should build the repository Dockerfile');
assert(renderYaml.includes('healthCheckPath: /health'), 'render.yaml should use the server health endpoint');
assert(renderYaml.includes('autoDeployTrigger: checksPass'), 'render.yaml should wait for CI checks');
[
    'DB_HOST',
    'DB_PASSWORD',
    'SESSION_SECRET',
    'ALLOWED_ORIGINS',
    'REVIEW_NOTIFY_EMAIL',
    'MAIL_FROM',
    'PUBLIC_APP_URL',
    'GEMINI_API_KEY',
    'OPENAI_API_KEY',
    'DUCKDUCKGO_API_KEY'
].forEach(key => {
    const blockPattern = new RegExp(`\\s*- key: ${key}\\n(?:\\s+(?!- key:)[^\\n]*\\n)*\\s+sync: false`);
    assert(blockPattern.test(renderYaml), `render.yaml should prompt Render for ${key}`);
});
assert(readme.includes('Render/Docker deployment is described by `render.yaml`'), 'README should document the Render Blueprint path');
assert(readme.includes('Deployment-specific values are intentionally `sync: false`'), 'README should explain Render secret env prompting');
assert(readme.includes('If you enable the owner/private KUGNUS path'), 'README should frame KUGNUS as an optional owner/private path');
assert(!releaseCheck.includes('function openAiAliasLooksLikeKugnus'), 'release check should not treat OPENAI_* as KUGNUS');
assert(!systemDoctor.includes('function openAiAliasLooksLikeKugnus'), 'system doctor should not treat OPENAI_* as KUGNUS');
assert(systemDoctor.includes('if (strict && !releaseSummary.ok)'), 'strict release doctor should stop before slow/mutating checks when release preflight is blocked');
assert(systemDoctor.includes("gatewayMode: explicitGatewayReady ? 'KUGNUS gateway env' : ''"), 'system doctor should report only canonical KUGNUS gateway env as gateway-ready');
assert(systemDoctor.includes('expectedKugnusRoutes'), 'system doctor should know which runtime KUGNUS route the configured env expects');
assert(systemDoctor.includes("expectedRoutes.length && !expectedRoutes.includes(body.route)"), 'system doctor should block when running server does not use configured KUGNUS gateway route');
assert(verifyWorkflow.includes('npm run verify'), 'CI workflow should run the main verification suite');
assert(verifyWorkflow.includes('npm run verify:db'), 'CI workflow should run database E2E against local MySQL');
assert(verifyWorkflow.includes('npm run verify:docker'), 'CI workflow should verify the production Docker image builds');
assert(verifyWorkflow.includes('npm run doctor'), 'CI workflow should publish the system doctor report');
assert(verifyWorkflow.includes('actions/checkout@v7'), 'CI checkout action should use a Node 24-ready major');
assert(verifyWorkflow.includes('actions/setup-node@v6'), 'CI setup-node action should use a Node 24-ready major');
assert(localEnvExample.includes('PACK_MAKER_TIMEOUT_MS=600000'), 'local env example should allow realistic KUGNUS Pack Maker completion time');
assert(localEnvExample.includes('PACK_MAKER_BATCH_TIMEOUT_MS=180000'), 'local env example should document realistic Pack Maker batch timeout');
assert(productionEnvExample.includes('PACK_MAKER_TIMEOUT_MS=600000'), 'production env example should allow realistic KUGNUS Pack Maker completion time');
assert(productionEnvExample.includes('PACK_MAKER_BATCH_TIMEOUT_MS=180000'), 'production env example should document realistic Pack Maker batch timeout');
assert(packageJson.scripts?.['verify:packmaker:kugnus'] === 'node scripts/verify_packmaker_kugnus_e2e.mjs', 'package should expose the real KUGNUS Pack Maker E2E command');
assert(systemDoctor.includes('function commandCheckDetail'), 'system doctor should include failed command output in reports');
assert(systemDoctor.includes('function packMakerCheckDetail'), 'system doctor should summarize successful Pack Maker KUGNUS E2E evidence');
assert(systemDoctor.includes('function commandStreaming'), 'system doctor should stream long-running verifier progress instead of going silent');
assert(systemDoctor.includes('mirrorPackMakerProgress'), 'system doctor should mirror Pack Maker progress lines during full checks');
assert(systemDoctor.includes('summary.generated?.itemCount'), 'system doctor Pack Maker summary should include generated item count');
assert(systemDoctor.includes('packMakerKugnusE2e'), 'system doctor should parse the Pack Maker KUGNUS verifier JSON payload');
assert(systemDoctor.includes('PACKMAKER_KUGNUS_E2E_TIMEOUT_MS'), 'system doctor should run Pack Maker E2E with a realistic timeout');
assert(systemDoctor.includes('let runtimeHealthOk = false'), 'system doctor should track whether the configured app server is actually reachable');
assert(systemDoctor.includes('Skipped because the configured app base URL is not reachable'), 'system doctor should not run isolated Pack Maker E2E when the app server is down');
assert(server.includes('PACK_FINAL_FILL_ATTEMPTS'), 'Pack Maker should have a final fill loop instead of stopping after ordinary batch repairs');
assert(server.includes('FINAL FILL'), 'Pack Maker should expose final fill status when closing a short draft');
assert(server.includes('PACK_WIDE_FILL_ATTEMPTS'), 'Pack Maker should widen the candidate pool when ordinary repair loops underfill a draft');
assert(server.includes('PACK_MICRO_SWEEP_ATTEMPTS'), 'Pack Maker should have small-count micro sweeps for the stubborn final missing terms');
assert(server.includes('function buildPackMakerTermSweepMessages'), 'Pack Maker should have a simple KUGNUS term sweep for stubborn underfilled drafts');
assert(server.includes('TERM SWEEP'), 'Pack Maker should expose term sweep status during final KUGNUS filling');
assert(server.includes('MICRO SWEEP'), 'Pack Maker should expose micro sweep status before broad final fallback');
assert(server.includes('이미 사용한 단어는 절대 다시 쓰지 마'), 'Pack Maker term sweep should pass existing terms to avoid repeat-heavy outputs');
assert(server.includes('PACK_MAKER_SWEEP_TEMPERATURE'), 'Pack Maker term sweep should use a higher temperature to diversify final candidates');
assert(server.includes('function splitPackMakerCandidateLines'), 'Pack Maker should parse comma-separated KUGNUS term-only outputs');
assert(server.includes('function fallbackItemDescription'), 'Pack Maker term sweep should provide descriptions for term-only candidates');
assert(server.includes('function inferPackDescriptionLanguage'), 'Pack Maker should infer item description language separately from term language');
assert(server.includes('const termScope = source') && server.includes('한줄|한\\s*줄|설명|해설|뜻'), 'Pack Maker term-language parser should ignore description-language clauses');
assert(server.includes('desc 언어: ${packDescriptionLanguageLabel(intent.descriptionLanguage)}'), 'Pack Maker prompt contract should include description language');
assert(server.includes('TARGET ${intent.requestedCount} ${packLanguageLabel(intent.termLanguage)} TERMS · ${packDescriptionLanguageLabel(intent.descriptionLanguage)} NOTES'), 'Pack Maker status should show both term and description language contracts');
assert(server.includes('term이 영어여도 desc는 한국어로 뜻과 쓰임을 설명한다'), 'Pack Maker should support English typing terms with Korean explanations');
assert(server.includes('function normalizeItemDescriptionForIntent'), 'Pack Maker should normalize wrong-language item descriptions server-side');
assert(index.includes('class="pack-maker-example-rail"'), 'Pack Maker input should advertise multiple prompt examples');
assert(index.includes('@keyframes packMakerExampleRise'), 'Pack Maker prompt examples should animate upward and fade');
assert(packMaker.includes('PACK_MAKER_EXAMPLES'), 'Pack Maker client should rotate diverse prompt examples');
assert(packMaker.includes('젠지들이 쓰는 신조어 팩 만들어줘'), 'Pack Maker prompt examples should include Gen Z slang');
assert(packMaker.includes('setPackLanguage') && packMaker.includes('syncLanguageToggles'), 'Pack Maker client should manage term/note language toggles');
assert(packMaker.includes('termLanguageOverride: stateRef.termLanguage'), 'Pack Maker client should send selected term language to the server');
assert(packMaker.includes('descriptionLanguageOverride: stateRef.descriptionLanguage'), 'Pack Maker client should send selected description language to the server');
assert(index.includes('#pack-maker-title,') && index.includes('#pack-maker-description') && index.includes('height: 58px;'), 'Pack Maker title and description fields should use matching header heights');
assert(localEnvExample.includes('OPENAI_MODEL=gpt-5.4-mini'), 'local env example should document the GPT mini fallback model');
assert(localEnvExample.includes('GEMINI_API_KEY='), 'local env example should document the optional Gemini API key');
assert(localEnvExample.includes('GEMINI_MODEL=gemini-2.5-flash'), 'local env example should document the Gemini Flash model');
assert(server.includes('Only OpenAI mini models are allowed for learn chat'), 'OpenAI mini model guard should remain active');
assert(index.includes('<script src="js/pack_maker.js"></script>'), 'pack maker script tag is missing');
assert(index.includes('<script src="js/admin_packs.js"></script>'), 'admin pack review script tag is missing');
assert(index.includes('<script src="js/keyboard_test.js"></script>'), 'keyboard test script tag is missing');
assert(index.includes('id="long-practice-screen"'), 'long practice screen is missing');
assert(index.includes('data-standard-mode="LONG"'), 'standard menu should expose LONG PRACTICE mode');
assert(index.includes('id="pack-maker-long-editor"'), 'Pack Maker long-form editor is missing');
assert(index.includes('id="pack-maker-long-saved"'), 'Pack Maker long-form save confirmation is missing');
assert(index.includes('id="pack-maker-open-long"'), 'Pack Maker should offer a direct jump to LONG PRACTICE after saving');
assert(index.includes('id="pack-maker-long-strip-songform"'), 'Pack Maker long-form editor should expose song-form label cleanup');
assert(index.includes('id="pack-maker-long-strip-punctuation"'), 'Pack Maker long-form editor should expose punctuation cleanup');
assert(index.includes('id="pack-maker-long-four-lines"'), 'Pack Maker long-form editor should expose four-line presentation');
assert(index.includes('id="pack-maker-long-apply-cleanup"'), 'Pack Maker long-form editor should expose a visible cleanup preview action');
assert(fs.existsSync(path.join(root, 'js/long_packs.js')), 'long text pack data file is missing');
assert(fs.existsSync(path.join(root, 'js/long_mode.js')), 'long practice mode file is missing');
const longPacks = read('js/long_packs.js');
const longMode = read('js/long_mode.js');
const longPackSandbox = { window: {} };
vm.runInNewContext(longPacks, longPackSandbox);
const longPackData = longPackSandbox.window.LONG_TEXT_PACKS || [];
assert(Array.isArray(longPackData) && longPackData.length >= 12, 'long packs should evaluate to a substantial LONG_TEXT_PACKS array');
const emptyLongPacks = longPackData
    .filter(pack => pack.type !== 'template')
    .filter(pack => String(pack.text || '').trim().length < 120)
    .map(pack => `${pack.id}:${pack.title}`);
assert(emptyLongPacks.length === 0, `non-template long packs must contain real practice text: ${emptyLongPacks.join(', ')}`);
const templateLongPacks = longPackData.filter(pack => pack.type === 'template');
assert(templateLongPacks.length === 1 && templateLongPacks[0].id === 'template_lyrics_user_provided', 'long packs should have one generic direct-input template, not fake song packs');
assert(longPacks.includes('LONG_TEXT_PACKS'), 'long packs should define LONG_TEXT_PACKS');
assert(longPacks.includes('ko_textbook_poem_practice'), 'long packs should include Korean literary typing practice');
assert(longPacks.includes('en_ballad_practice_safe'), 'long packs should include safe English lyric-rhythm practice');
assert(longPacks.includes("id: 'en_ballad_practice_safe'") && longPacks.includes('showInSelector: false'), 'safe rhythm fallback packs should stay internal instead of cluttering the long-pack selector');
assert(longPacks.includes('ko_keyboard_reviewer_flow'), 'long packs should include a Korean keyboard reviewer passage');
assert(longPacks.includes('en_keyboard_reviewer_pangram'), 'long packs should include an English keyboard reviewer passage');
assert(longPacks.includes('mixed_keyboard_reviewer'), 'long packs should include a mixed-language keyboard reviewer passage');
assert(longPacks.includes('template_lyrics_user_provided'), 'long packs should include one generic user-provided lyric template');
assert(longPacks.includes('manual_lyrics_user_001'), 'user-provided lyric template should carry a generated provider ID');
assert(longPacks.includes("preprocess: 'lyrics'"), 'user-provided lyric template should enable lyrics preprocessing');
assert(longPacks.includes('애국가 따라쓰기') && longPacks.includes('PUBLIC NATIONAL ANTHEM'), 'Aegukga long pack should be an actual public anthem typing pack, not an empty themed placeholder');
assert(!longPacks.includes('template_lyrics_cortis_redred'), 'long packs should not ship song-specific direct-input lyric templates');
assert(!longPacks.includes("Never mind, I'll find someone like you"), 'copyrighted song lyric text must not be bundled in long packs');
assert(!longPacks.includes("I'm unstoppable"), 'copyrighted song lyric text must not be bundled in long packs');
assert(longMode.includes('const LongPractice'), 'long practice mode should expose LongPractice');
assert(longMode.includes("pack?.type === 'template'"), 'long practice should recognize template packs');
assert(longMode.includes('function isPlayableLongPack') && longMode.includes('.filter(isPlayableLongPack);'), 'long practice selector should hide empty or placeholder-only packs');
assert(longMode.includes('function isVisibleLongPack') && longMode.includes('const visiblePacks = longState.packs.filter(isVisibleLongPack);'), 'long practice native selector should hide internal fallback packs');
assert(longMode.includes('function normalizeSavedUserPack') && longMode.includes('function inferUserPackPreprocess'), 'saved user long packs should keep preprocessing metadata when reloaded');
assert(longMode.includes('return pack ? hydratePracticePack(pack) : null;'), 'selected long packs should be hydrated before play so user text cleanup always applies');
assert(longMode.includes('function selectGroupLabel') && longMode.includes('한국어 문장팩') && longMode.includes('Direct Input'), 'long practice native selector should use polished localized group labels');
assert(longMode.includes('const hasDirectInputTemplate') && longMode.includes('if (!hasDirectInputTemplate)'), 'long practice selector should not show a duplicate direct-input option when the template exists');
assert(longMode.includes('function sourceLabel') && longMode.includes('providerId'), 'long practice should surface user-provided provider IDs in pack metadata');
assert(longMode.includes('PASTE TEXT TO START'), 'template packs should require pasted user text before starting');
assert(longMode.includes('USER PROVIDED') && longMode.includes('ui.customText?.focus()'), 'template packs should route practice through user-provided text');
assert(longMode.includes('function cleanLyricsText') && longMode.includes('function isLyricsStopword'), 'long practice should clean lyrics stage markers before typing');
assert(longMode.includes('function normalizeLyricsStopwordToken') && longMode.includes('prechorus') && longMode.includes('postchorus'), 'long practice should normalize varied bracketed song-form labels like prechorus/pre-chorus');
assert(longMode.includes('const chunkSize = lines.length <= 4 ? lines.length : 4;'), 'structured lyric practice should present longer sections in four-line chunks');
assert(longMode.includes('function cleanUserProvidedText') && longMode.includes('function normalizePracticePunctuation'), 'long practice should normalize user-provided brackets, spacing, and quote variants before typing');
assert(longMode.includes("pack?.preprocess === 'structured'") && longMode.includes("pack?.preprocess === 'lyrics' || pack?.preprocess === 'structured'"), 'long practice should preserve structured user-provided long packs');
assert(longMode.includes('function comparableChar') && longMode.includes('isUnitReadyToComplete'), 'long practice should tolerate same-family punctuation variants and advance after a completed line');
assert(longMode.includes('function displayLineBreakPositions') && longMode.includes('function insertLongInputText') && longMode.includes("insertLongInputText('\\n')"), 'long practice Enter should move to the next visible line inside structured passages');
assert(longMode.includes('isAtDisplayLineBreak(value)') && longMode.includes('completeCurrentUnit();'), 'long practice Enter should complete the unit when no next visible line remains');
assert(!longMode.includes(`.replace(/[“”＂"]/g, "'")`), 'long practice should not collapse double quotes into apostrophes');
assert(longMode.includes('duplicate') && longMode.includes('normalizeText(saved.text) === text'), 'long practice should de-duplicate repeated user-provided long pack saves');
assert(longMode.includes('function selectPack') && longMode.includes('pendingPackId'), 'long practice should support opening the just-saved user pack directly');
assert(longMode.includes('open(options = {})') && longMode.includes('options.autoStart') && longMode.includes("window.setTimeout(start, 0)"), 'main LONG PRACTICE should be able to open a selected text pack and start typing immediately');
assert(longMode.includes('function listPacks()') && longMode.includes('return longState.packs.map'), 'main SELECT TEXT UI should be able to read long practice packs');
assert(longMode.includes('function splitPracticeUnits'), 'long practice should split passages into sentence-sized typing units');
assert(longMode.includes('function completeCurrentUnit') && longMode.includes('setCurrentUnit(longState.unitIndex + 1)'), 'long practice should advance to the next unit after a completed line');
assert(longMode.includes('function countCorrectChars'), 'long practice should count current-line accuracy without double-counting completed lines');
assert(longMode.includes('function playLongTypingSound') && longMode.includes('window.sfx.playKey'), 'long practice should reuse CodeDrop key sounds while typing');
assert(game.includes("longPractice: '/long-practice'"), 'app router should include long practice route');
assert(game.includes('LONG_SELECTOR_PREFIX') && game.includes('longPackGroupsForSelector') && game.includes("t('menu.selectText')"), 'LONG PRACTICE should switch the main pack selector into a SELECT TEXT deck');
assert(!game.match(/LONG_SELECTOR_FEATURED_IDS\s*=\s*\[[^\]]*template_lyrics_user_provided/s), 'direct-input lyric template should not be promoted as a featured long pack');
assert(game.includes('keepVisiblePack') && game.includes('showInSelector'), 'main long-pack cartridge picker should also filter internal fallback packs');
assert(game.includes('Recommended Practice') && game.includes('My Text Packs') && game.includes('Direct Input'), 'long practice selector should separate saved/recommended packs from direct-input templates');
assert(game.includes("window.LongPractice?.open({ packId, autoStart: true })"), 'START LONG PRACTICE should pass the selected text pack and auto-start the trainer');
assert(packMaker.includes("packKind: 'word'"), 'Pack Maker should track word/long pack type');
assert(packMaker.includes('saveLongPack'), 'Pack Maker should save user-provided long packs');
assert(packMaker.includes('function cleanLongPackText') && packMaker.includes('function getLongCleanupOptions'), 'Pack Maker should clean long-form pasted text before saving');
assert(packMaker.includes('stripPunctuation') && packMaker.includes('stripSongForm'), 'Pack Maker should support punctuation and song-form cleanup toggles');
assert(packMaker.includes("preprocess: preprocessMode") && packMaker.includes("'structured'"), 'Pack Maker should persist structured long-pack preprocessing metadata');
assert(packMaker.includes('longSaved') && packMaker.includes('openLongPracticeFromMaker') && packMaker.includes('lastLongPackId'), 'Pack Maker long-pack save UX should show feedback and open the saved pack in LONG PRACTICE');
assert(index.includes('id="pack-maker-submit-long"'), 'Pack Maker should expose a public request button for long practice packs');
assert(packMaker.includes('ui.submitLong') && packMaker.includes('saveLongPack(true)'), 'Pack Maker should wire long-pack public requests to the save flow');
assert(packMaker.includes("kind: 'long'") && packMaker.includes('submitForReview: true'), 'Pack Maker should submit long practice packs as reviewable long packs');
assert(packMaker.includes('window.LongPractice?.setRemotePacks?.(stateRef.mine, stateRef.public)'), 'Pack Maker should sync server-backed long packs into LONG PRACTICE');
assert(packMaker.includes('!isLongPackRecord(pack)'), 'DROP custom pack selector should filter long practice packs out of SELECT PACK');
assert(longMode.includes('function setRemotePacks') && longMode.includes('remote_${pack.id}'), 'LONG PRACTICE should accept server-backed long packs with stable ids');
assert(server.includes('pack_kind = ?, text_content = ?, preprocess = ?, tags_json = ?'), 'server should persist long pack type, text, preprocess, and tags');
assert(server.includes('payload.packKind === "long"') && server.includes('DELETE FROM custom_pack_items WHERE pack_id = ?'), 'server should store long packs without word item rows');
assert(server.includes('Long practice packs do not use DROP scores') && server.includes('Long practice packs do not use DROP leaderboards'), 'long practice packs should not use DROP score or leaderboard endpoints');
assert((server.match(/await ensureCustomPackTables\(\);/g) || []).length === 1 && server.includes('async function ensureCustomPackSchema()'), 'pack APIs should ensure migrated custom pack schema, not only table existence');
assert(packMaker.includes('function isLongPackIntent') && packMaker.includes('answerLongPackIntent'), 'Pack Maker should route long/lyrics practice requests into direct-input long pack mode');
assert(packMaker.includes('LONG PACK 직접입력 모드로 전환했습니다'), 'Pack Maker should explain long-pack direct input mode in chat');
assert(index.includes('id="admin-pack-screen"'), 'admin pack review overlay is missing');
assert(index.includes('id="admin-pack-close" href="/games/codedrop/"'), 'admin review HOME should be a real home link fallback');
assert(game.includes("adminPacks: '/admin/packs'"), 'app router should expose /admin/packs route');
assert(game.includes("window.AdminPacks?.open()"), 'app router should open admin pack review screen');
assert(adminPacks.includes("requestJson(`/api/admin/packs?status="), 'admin pack review UI should load server review queue');
assert(adminPacks.includes("requestJson(`/api/packs/${id}/review`"), 'admin pack review UI should call review endpoint');
assert(enI18nKeys.includes('admin.title') && enI18nKeys.includes('admin.approve') && enI18nKeys.includes('admin.reject'), 'admin review screen should be covered by global i18n keys');
assert(game.includes("setText('.admin-pack-title', 'admin.title')"), 'admin review static text should sync with the global language mode');
assert(adminPacks.includes("window.addEventListener('codedrop:language', syncLanguage)"), 'admin review dynamic content should re-render when README language toggles');
assert(adminPacks.includes("function tr(key, replacements = {})"), 'admin review UI should use the shared i18n translator instead of hardcoded copy');
assert(adminPacks.includes("window.location.assign('/games/codedrop/')"), 'admin review HOME should explicitly navigate to the app home when JS is active');
assert(adminPacks.includes('function renderLoginPrompt'), 'admin review screen should render an inline admin login prompt when opened from email while logged out');
assert(adminPacks.includes("fetch(apiPath('/login')"), 'admin review login prompt should authenticate without leaving the review page');
assert(adminPacks.includes('function intentFromUrl') && adminPacks.includes('maybeRunIntent'), 'email approve/reject links should carry intent through to the selected pack');
assert(adminPacks.includes('reviewPack(id, intent)'), 'email approve/reject intent should open the matching review confirmation after login');
assert(adminPacks.includes('class="admin-login-card"'), 'admin review should render the login card from JavaScript');
assert(cssBlock('.admin-login-card').includes('width: min(520px, 100%);'), 'admin review login prompt styles are missing');
assert(index.includes('id="confirm-input" autocomplete="off"'), 'generic command dialog input should not mask ordinary text such as reject reasons');
assert(game.includes("inputType = 'text'"), 'command dialog should default to visible text input');
assert(game.includes("inputType: 'password'"), 'password-only command dialog calls should opt into masking explicitly');
assert(index.includes('id="pack-maker-review-alerts"'), 'Pack Maker should expose public request status/rejection reasons to the submitter');
assert(packMaker.includes('reviewReason') && packMaker.includes('renderReviewAlerts'), 'Pack Maker should render stored review reasons from custom pack status');
assert(index.includes('id="keyboard-test-screen"'), 'keyboard test overlay is missing');
assert(index.includes('id="keyboard-test-btn"'), 'keyboard test menu button is missing');
assert(index.includes('id="keytest-board"'), 'keyboard test board root is missing');
assert(index.includes('.keytest-key.pressed'), 'keyboard test pressed key styling is missing');
assert(index.includes('.keytest-key.tested'), 'keyboard test should keep a visible state for keys that were already tested');
const keyboardTest = read('js/keyboard_test.js');
assert(keyboardTest.includes('window.addEventListener(\'keydown\', handleKeyDown, true)'), 'keyboard test should capture keydown before global game shortcuts');
assert(keyboardTest.includes('window.addEventListener(\'keyup\', handleKeyUp, true)'), 'keyboard test should capture keyup before global game shortcuts');
assert(keyboardTest.includes('event.preventDefault();') && keyboardTest.includes('event.stopPropagation();'), 'keyboard test should isolate captured keystrokes from game shortcuts');
assert(keyboardTest.includes('event.getModifierState'), 'keyboard test should report lock key states');
assert(keyboardTest.includes("key.classList.add('pressed', 'tested')"), 'keyboard test should mark pressed keys as tested');
assert(keyboardTest.includes('function playInputFeedback') && keyboardTest.includes('window.sfx.playKey'), 'keyboard test should play input feedback when a key is registered');
assert(keyboardTest.includes("key.classList.remove('pressed', 'recent', 'tested')"), 'keyboard test CLR should reset tested key states');
assert(keyboardTest.includes("document.getElementById('start-screen')"), 'keyboard test should coordinate with the start screen overlay');
assert(keyboardTest.includes("startScreen?.classList.add('hidden')"), 'keyboard test should hide the start screen while open');
assert(keyboardTest.includes("startScreen.classList.remove('hidden')"), 'keyboard test should restore the start screen on close');
assert(keyboardTest.includes('window.KeyboardTest'), 'keyboard test should expose a small debug handle');
[
    'Escape', 'F12', 'Backspace', 'Tab', 'CapsLock', 'Enter', 'ShiftLeft',
    'ShiftRight', 'ControlLeft', 'ControlRight', 'Space', 'ArrowUp',
    'ArrowDown', 'ArrowLeft', 'ArrowRight', 'NumLock', 'NumpadEnter'
].forEach(code => assert(keyboardTest.includes(`'${code}'`), `keyboard test is missing key code ${code}`));
assert(keyboardTest.includes('MAIN_ROWS') && keyboardTest.includes('NAV_KEYS') && keyboardTest.includes('NUM_KEYS'), 'keyboard test should keep main/nav/numpad zones explicit');
assert(index.includes('min-width: 1120px;'), 'keyboard test board should preserve a stable desktop keyboard width inside its scroll area');
assert(index.includes('<option value="gemini" selected>GEMINI 2.5 FLASH</option>'), 'pack maker should default to Gemini');
assert(index.includes('id="pack-maker-engine-shell"'), 'pack maker should use a themed engine picker shell');
assert(index.includes('id="pack-maker-engine-toggle"'), 'pack maker should use a themed engine picker toggle');
assert(index.includes('id="pack-maker-engine-menu"'), 'pack maker should use a themed engine picker popover');
assert(index.includes('#pack-maker-engine') && index.includes('pointer-events: none;'), 'pack maker native engine select should stay hidden');
assert(longMode.includes('displayTarget') && longMode.includes('function typingTargetFromDisplay'), 'long practice should separate visible multiline text from the comparable typing target');
assert(longMode.includes('function splitLineStructuredUnits') && longMode.includes('preserveLineStructure'), 'long practice should preserve lyric/user-provided line structure instead of flattening every sentence');
assert(longMode.includes('function hasMultiplePracticeLines') && longMode.includes('options.preserveLineStructure && (isLineStructuredText(normalized) || hasMultiplePracticeLines(normalized))'), 'long practice should preserve direct-input lyric line breaks even when a stanza has fewer than four lines');
assert(game.includes("if (!lyricTemplate) inputItems.push(packMetaFromLongPack(null));"), 'long practice selector should not show duplicate direct-input cards when the direct-input template exists');
assert(game.includes("'menu.selectText': '문장팩 선택'") && game.includes("'menu.selectTextCartridge': '문장팩 선택'"), 'Korean long-practice selector labels should use 문장팩 instead of awkward 글감/덱 wording');
assert(packMaker.includes('longPreprocessMode') && packMaker.includes("return 'lyrics';") && packMaker.includes("return 'structured';"), 'Pack Maker long lyric saves should preserve lyrics and structured preprocessing metadata');
assert(learn.includes('function playStudyTypingSound') && learn.includes('window.sfx.playKey'), 'OCP learn inputs should play typing feedback sounds');
assert(scenario.includes('function playStudyTypingSound') && scenario.includes('window.sfx.playKey'), 'OCP scenario inputs should play typing feedback sounds');
assert(lab.includes('function playStudyTypingSound') && lab.includes('window.sfx.playKey'), 'OCP lab inputs should play typing feedback sounds');
assert(game.includes('const CodeDropTypingSfx') && game.includes('bindGlobal()') && game.includes('window.CodeDropTypingSfx = CodeDropTypingSfx'), 'CodeDrop should expose a global typing SFX gate for every editable input');
assert(game.includes('document.addEventListener(\'keydown\', (event) =>') && game.includes('this.isEditableTarget(event.target)'), 'global typing SFX should listen to editable keydown events');
assert(learn.includes('window.CodeDropTypingSfx?.play') && scenario.includes('window.CodeDropTypingSfx?.play') && lab.includes('window.CodeDropTypingSfx?.play'), 'OCP study surfaces should route typing feedback through the shared SFX gate');
assert(longMode.includes('window.CodeDropTypingSfx?.play'), 'long practice should route typing feedback through the shared SFX gate');
const packMakerEngineNative = cssBlock('#pack-maker-engine');
assert(packMakerEngineNative.includes('display: none;'), 'pack maker native engine select should be removed from layout');
assert(index.includes('id="pack-maker-engine" aria-label="Pack maker engine" aria-hidden="true" tabindex="-1"'), 'pack maker hidden engine select should not be accessible as the visible control');
assert(index.includes('--pack-maker-safe-bottom'), 'pack maker overlay should reserve bottom space for global README/MUSIC widgets');
assert(index.includes('100dvh - var(--pack-maker-safe-bottom)'), 'pack maker shell height should avoid the global bottom widget zone');
assert(packMaker.includes('PACK_MAKER_API_BASE') && packMaker.includes("apiPath('/api/pack-maker/chat/stream')"), 'pack maker client should call the base-prefixed stream endpoint');
assert(packMaker.includes('function syncEnginePicker'), 'pack maker should sync hidden engine select with the visible picker');
assert(packMaker.includes('function chooseEngine'), 'pack maker engine popover should update the active LLM engine');
assert(packMaker.includes('function engineStatus'), 'pack maker status should include KUGNUS route context');
assert(index.includes('id="pack-maker-route"'), 'pack maker should show the active KUGNUS route separately from draft status');
assert(packMaker.includes('function updateEngineRouteStatus'), 'pack maker should update the visible KUGNUS route indicator');
assert(packMaker.includes("if (value === 'direct') return 'LOCAL DIRECT';"), 'pack maker should label direct KUGNUS routing as local-only');
assert(packMaker.includes('function isObsoleteKugnusRouteEntry'), 'pack maker should clean stale pre-gateway KUGNUS route chat history');
assert(packMaker.includes('previous.role === \'user\'') && packMaker.includes("cleaned[cleaned.length - 1] = item"), 'pack maker should collapse orphan consecutive user messages after stale route cleanup');
assert(packMaker.includes('/\\bProvider:\\s*OLLAMA\\b/i'), 'pack maker should remove obsolete OLLAMA route chat entries');
assert(packMaker.includes('function isLocalPackGenerationRequest'), 'pack maker should classify obvious non-generation prompts before auth/LLM');
assert(packMaker.includes('pendingSuggestion') && packMaker.includes('confirmSuggestion'), 'pack maker should remember suggested packs and confirm them on short replies');
assert(packMaker.includes('function shouldUseRemotePackMaker'), 'pack maker should route ideation/clarification prompts through the server pipeline');
assert(packMaker.includes('function isDraftRevisionRequest'), 'pack maker should distinguish fresh generation from existing draft revision');
assert(packMaker.includes('stateRef.submitting'), 'pack maker should block duplicate submits before streaming starts');
assert(packMaker.includes('stateRef.saving'), 'pack maker should block duplicate save/public-list requests');
assert(packMaker.includes('function setSaveBusy'), 'pack maker save buttons should show immediate busy feedback');
assert(packMaker.includes("method: 'DELETE'"), 'pack maker should call the custom pack delete endpoint');
assert(packMaker.includes('delete WORD_PACKS[packKey]'), 'deleted custom packs should be removed from runtime WORD_PACKS');
assert(packMaker.includes("mode === 'revision' ? (context.history || []) : []"), 'fresh Pack Maker requests should not send stale chat history');
assert(packMaker.includes("mode === 'revision' ? (context.draft || emptyDraft()) : emptyDraft()"), 'fresh Pack Maker requests should not send stale draft context');
assert(packMaker.includes('requestId !== stateRef.activeRequestId'), 'pack maker should ignore stale stream events from obsolete requests');
assert(packMaker.includes('searchNoticeShown'), 'pack maker should display search status at most once per request');
assert(packMaker.includes('function answerLocalBrief'), 'pack maker should answer brief/how-to prompts before auth or pack generation');
assert(packMaker.includes('function isConnectionProbe'), 'pack maker should classify connection/status prompts separately from pack generation');
assert(packMaker.includes('function freshKugnusStatus'), 'pack maker connection prompts should run a fresh KUGNUS health check');
assert(packMaker.includes('startKugnusHealthCheck(true)'), 'pack maker connection prompts should force-refresh KUGNUS health instead of trusting stale cache');
assert(packMaker.includes('KUGNUS SERVER ${ok ?'), 'pack maker connection prompts should report ONLINE/OFFLINE state in the chat');
assert(packMaker.includes('PACK BRIEF REQUIRED'), 'pack maker local brief path should expose a clear non-generation status');
assert(packMaker.includes("codedrop_pack_maker_draft_v2"), 'pack maker should not restore stale pre-release draft storage');
assert(packMaker.includes("const SCOPED_STORAGE_VERSION = 'v3';"), 'pack maker draft/chat storage should be versioned by auth scope');
assert(packMaker.includes('function storageScope()'), 'pack maker should compute a user-scoped local storage key');
assert(packMaker.includes('return state.userToken ? { Authorization'), 'pack maker should separate logged-in storage/API behavior from guest preview');
assert(packMaker.includes('if (!key) {') && packMaker.includes('stateRef.chat = [];'), 'guest pack maker should not restore previous user chat history');
assert(packMaker.includes('reloadScopedLocalState()'), 'pack maker should reload draft/chat when auth state changes');
assert(packMaker.includes("evt.event === 'status'"), 'pack maker client should render server status events');
assert(packMaker.includes('showRemoteLoginRequired'), 'pack maker should avoid stacking duplicate remote-login warnings');
assert(packMaker.includes('async function ensureRemoteAuth()'), 'pack maker should validate remote auth before LLM or save calls');
assert(packMaker.includes("fetch(apiPath('/api/session')"), 'pack maker should check the current server session before ASK/SAVE');
assert(packMaker.includes("err.code = 'AUTH_REQUIRED'"), 'pack maker should treat expired sessions as auth flow, not LLM failure');
assert(packMaker.includes('discardAssistantMessage(pending);'), 'pack maker should not leave a fake assistant failure bubble on auth expiry');
assert(packMaker.includes('if (!await ensureRemoteAuth())'), 'pack maker ASK/SAVE should stop before remote calls when auth is missing');
assert(packMaker.includes('offerKugnusFallbackIfNeeded()'), 'pack maker should offer KUGNUS-to-GPT fallback');
assert(packMaker.includes('const CHAT_STORAGE_KEY'), 'pack maker chat should persist conversation history');
assert(packMaker.includes('renderMarkdownInto'), 'pack maker chat should render markdown through the safe renderer');
assert(packMaker.includes('learn-chat-copy-code'), 'pack maker markdown code blocks should expose copy controls');
assert(packMaker.includes('createAssistantActions'), 'pack maker assistant messages should expose copy/retry/regenerate actions');
assert(packMaker.includes('new AbortController()'), 'pack maker chat should use AbortController for STOP');
assert(packMaker.includes('stopAssistantMessage'), 'pack maker chat should visibly mark stopped streams');
assert(packMaker.includes('handleChatScroll'), 'pack maker chat should let users scroll during streaming');
assert(packMaker.includes('pack-maker-chat-bottom'), 'pack maker chat should wire the scroll-to-latest button');
assert(packMaker.includes('clearChatHistory'), 'pack maker chat should support CLR history reset');
assert(!packMaker.includes('sessionStorage'), 'pack maker fallback should not persist across page reloads');
assert(packMaker.includes('SAVE MY PACK') || index.includes('SAVE MY PACK'), 'pack maker save action should be visible');
assert(!packMaker.includes('innerHTML'), 'pack maker client should avoid raw innerHTML rendering');
assert(packMaker.includes('function renderDraft(options = {})'), 'pack maker draft renderer should support preserving an existing status');
assert(packMaker.includes('const updateStatus = options.updateStatus !== false;'), 'pack maker renderDraft should be able to skip status updates');
assert(packMaker.includes('renderDraft({ updateStatus: Boolean(state.userToken) });'), 'pack maker open should not let draft count hide the remote-login warning');
assert(packMaker.includes("if (busy) renderStatus('SEARCHING + STREAMING');"), 'pack maker setBusy(false) should not overwrite the final status');
assert(game.includes("els.musicWidget.classList.add('open', 'legacy-open')"), 'music widget SoundCloud icon should open the legacy square player');
assert(game.includes('function toggleMusicDetails'), 'music island should expand/collapse track details from the left toggle');
assert(game.includes('function toggleMusicTrackList'), 'music island should show/hide the playlist popover');
assert(game.includes('function updateSoundCloudMetadata'), 'music island should update current track and queue metadata when possible');
assert(game.includes('function switchMusicWidgetUi'), 'music player should switch between island and SoundCloud views');
assert(!index.includes('id="global-lang-toggle"'), 'global language toggle should not appear on the page ceiling');
assert(game.includes('document.body.dataset.appLang = lang'), 'README language toggle should drive the shared app language state');
assert(index.includes('--font-korean-ui'), 'Korean UI font stack should be explicit instead of falling back to browser defaults');
assert(index.includes('Pretendard'), 'Korean UI should load/use Pretendard for polished Hangul rendering');
assert(index.includes('body[data-app-lang="ko"]'), 'Korean app mode should have dedicated typography tuning');
assert(index.includes('class="readme-lang-toggle"'), 'system manual should include an EN/KR language toggle');
assert(index.includes('data-readme-lang="ko"'), 'system manual Korean toggle is missing');
assert(index.includes('시스템 매뉴얼'), 'system manual should include Korean copy');
assert(index.includes('https://www.kugnus.com'), 'system manual contact should include www.kugnus.com');
assert(index.includes('mailto:kugnus@cywell.co.kr'), 'system manual email should link to kugnus@cywell.co.kr');
assert(index.includes('href="https://github.com/souluk319" target="_blank" rel="noopener noreferrer"'), 'system manual GitHub external link should use noopener noreferrer');
assert(index.includes('href="https://www.kugnus.com" target="_blank" rel="noopener noreferrer"'), 'system manual website external link should use noopener noreferrer');
assert(index.includes('href="https://kugnus.tistory.com" target="_blank" rel="noopener noreferrer"'), 'system manual blog external link should use noopener noreferrer');
const readmeBox = cssBlock('#readme-box', block => block.includes('width: min(640px'));
assert(readmeBox.includes('box-sizing: border-box;'), 'README modal width should include padding to prevent language overflow');
assert(readmeBox.includes('width: min(640px, calc(100vw - 48px)) !important;'), 'README modal should use one stable width for EN/KOR');
assert(readmeBox.includes('max-height: min(92dvh, 860px);'), 'README modal should stay inside the viewport');
const readmeI18nHidden = cssBlock('#readme-box [data-i18n]');
assert(readmeI18nHidden.includes('display: none !important;'), 'README should hide all language spans by default');
const readmeI18nVisible = cssBlock('#readme-box[data-manual-lang="en"] [data-i18n="en"],\n        #readme-box[data-manual-lang="ko"] [data-i18n="ko"]');
assert(readmeI18nVisible.includes('display: inline !important;'), 'README should show only the selected language copy');
const readmeEnHeading = cssBlock('#readme-box[data-manual-lang="en"] h2');
assert(readmeEnHeading.includes('3.05rem'), 'English README title should be capped to avoid horizontal overflow');
const readmeKoParagraph = cssBlock('#readme-box[data-manual-lang="ko"] p');
assert(readmeKoParagraph.includes('word-break: keep-all;'), 'Korean README copy should not break awkwardly by syllable');
const readmeToggle = cssBlock('.readme-lang-toggle');
assert(readmeToggle.includes('grid-template-columns: 1fr 1fr;') && readmeToggle.includes('width: 260px;'), 'README language toggle should keep a stable two-column width');
assert(game.includes("const README_LANGUAGE_STORAGE_KEY = 'codedrop_readme_language'"), 'README language toggle should persist its selection');
assert(game.includes('function setReadmeLanguage'), 'README language setter is missing');
assert(game.includes('function initReadmeLanguage'), 'README language initializer is missing');
assert(game.includes('function handleReadmeLanguageClick'), 'system manual language toggle handler is missing');
assert(game.includes('readmeBox.dataset.manualLang = lang'), 'system manual language toggle should update the manual language');
assert(game.includes("document.querySelectorAll('.readme-lang-toggle [data-readme-lang]')"), 'README language buttons should sync from the same state');

const feedbackBlock = cssBlock('.scenario-feedback');
assert(feedbackBlock.includes('display: grid;'), 'scenario/lab feedback should separate title, command, and explanation blocks');
const feedbackTitle = cssBlock('.scenario-feedback .fb-title');
assert(feedbackTitle.includes('display: block;'), 'feedback title should be a separate block');
const feedbackCanonical = cssBlock('.fb-canonical');
assert(feedbackCanonical.includes('display: block;'), 'feedback canonical command should be a separate block');
const feedbackExplain = cssBlock('.fb-explain');
assert(feedbackExplain.includes('display: block;'), 'feedback explanation should be a separate block');
const renderCommandTargetBody = (learn.match(/function renderCommandTarget[\s\S]*?\/\/ 초과 입력 표시/) || [''])[0];
assert(!renderCommandTargetBody.includes('span.textContent = input[i]'), 'follow-mode target must keep canonical text instead of replacing it with mistyped input');
assert(learn.includes("quizFeedback('wrong-msg'") && learn.includes('if (isFollowMode()) renderQuizTarget();'), 'follow-mode quiz mistakes should keep the canonical command visible and retryable');
assert(learn.includes('function resetQuizAttemptAt(idx)'), 'learn quiz replay should clear the previous answer/outcome before retry');
assert(learn.includes('if (replay && !review) resetQuizAttemptAt(session.quizIdx);'), 'learn quiz replay should reset stale answer state on render');
assert(learn.includes('renderQuiz({ review: Boolean(target.review), replay: Boolean(target.replay) });'), 'returning through previous/next navigation should preserve retry mode instead of restoring the answer sheet');
assert(scenario.includes("showFeedback('wrong-msg'") && scenario.includes('session.guidedWrongAttempts++'), 'scenario follow-mode mistakes should keep guided feedback instead of closing the input');
assert(lab.includes("showFeedback('wrong-msg'") && lab.includes('state.guidedWrongAttempts++'), 'lab follow-mode mistakes should keep guided feedback instead of closing the input');

const labCheckItem = cssBlock('.lab-check-item');
assert(labCheckItem.includes('grid-template-columns: 42px minmax(0, 1fr);'), 'lab checklist needs a stable marker/text grid');
assert(index.includes('.lab-check-text'), 'lab checklist text should have its own wrapping target');

assert(dashboard.includes('resetStudyData()'), 'dashboard reset handler is missing');
assert(stats.includes('function reset()'), 'StudyStats reset API is missing');
assert(learn.includes('resetProgress'), 'LearnMode reset hook is missing');

assert(game.includes("const LOCAL_AUTH_KEY = 'codedrop_local_auth_users';"), 'local dev auth key is missing');
assert(index.includes('<base href="/games/codedrop/">'), 'deployment base href should target /games/codedrop/');
assert(index.includes("window.CODEDROP_API_BASE = '/games/codedrop';"), 'index should expose the base-prefixed API root');
assert(server.includes('const CODEDROP_BASE_PATH = "/games/codedrop";'), 'server should define the /games/codedrop deployment base path');
assert(server.includes('CODEDROP_PREFIXED_API_PATHS'), 'server should alias base-prefixed API/login routes for subpath deployment');
assert(server.includes('app.use(`${CODEDROP_BASE_PATH}/js`'), 'server should serve JS assets under /games/codedrop');
assert(server.includes('/^\\/games\\/codedrop(?:\\/.*)?$/'), 'server should fallback /games/codedrop routes to index.html');
assert(readme.includes('https://codedrop.example.com/games/codedrop/'), 'README should document a generic public CodeDrop subpath');
assert(readme.includes('/games/codedrop/*') && readme.includes('-> CodeDrop backend'), 'README should document the reverse proxy path for CodeDrop');
assert(readme.includes('/games/codedrop/api/*') && readme.includes('/games/codedrop/login'), 'README should document base-prefixed API proxy routing for subpath deploy');
assert(readme.includes('handle /games/codedrop/*'), 'README Caddy example should preserve the /games/codedrop prefix');
assert(!readme.includes('handle_path /games/codedrop/*'), 'README should not suggest stripping /games/codedrop before proxying direct browser routes');
assert(readme.includes('ALLOWED_ORIGINS') && readme.includes('https://codedrop.example.com'), 'README should document the production allowed origin with a generic example domain');
assert(verifyServerSmoke.includes('/games/codedrop/pack-maker'), 'server smoke should verify Pack Maker direct subpath refresh');
assert(verifyServerSmoke.includes('/games/codedrop/ocp/dashboard'), 'server smoke should verify OCP dashboard direct subpath refresh');
assert(verifyServerSmoke.includes('/games/codedrop/js/game.js'), 'server smoke should verify subpath JS asset serving');
assert(verifyServerSmoke.includes('/games/codedrop/assets/red-hat-logo.svg'), 'server smoke should verify subpath asset serving');
assert(verifyServerSmoke.includes('/games/codedrop/api/llm/kugnus/health'), 'server smoke should verify base-prefixed API aliases');
assert(game.includes("window.CODEDROP_BASE_PATH) || '/games/codedrop';"), 'client router should target /games/codedrop');
assert(game.includes('window.CODEDROP_API_BASE) || CODEDROP_BASE_PATH;'), 'client API calls should use the base-prefixed API root');
assert(game.includes('function initAppRouter()'), 'client app router initializer is missing');
assert(game.includes("packMaker: '/pack-maker'"), 'Pack Maker should have a browser route');
assert(game.includes("ocpDashboard: '/ocp/dashboard'"), 'OCP dashboard should have a browser route');
assert(game.includes("window.addEventListener('popstate'"), 'client router should handle browser back/forward');
assert(game.includes("users.test = { id: 'local-test', nickname: 'test', password: 'test' };"), 'local test/test auth seed is missing');
assert(game.includes('tryLocalDevLogin(nickname, password)'), 'login flow does not call local dev fallback');
assert(game.includes('async function provisionLocalDevServerSession'), 'local test/test should try to obtain a real server token for Pack Maker');
assert(game.includes('await provisionLocalDevServerSession(nickname, password)'), 'login flow should use local credentials to provision a server session before falling back');
assert(game.includes('function forceStudyDropPackSync'), 'study edition drop pack sync helper is missing');
assert(game.includes("dropPack: 'OC_CORE'"), 'OCP CLI Drop must define OC_CORE as its forced pack');
assert(game.includes("dropPack: 'GITHUB_CORE'"), 'GitHub Drop must define GITHUB_CORE as its forced pack');
assert(game.includes("currentStudyConfig()?.dropPack || 'OC_CORE'"), 'study edition drop mode must sync from the active edition pack');
assert(game.includes('forceStudyDropPackSync();'), 'study edition entry/drop mode must sync the visible pack selector immediately');
assert(game.includes('forceStudyDropPackSync({ notify: false })'), 'study game start must re-assert the active edition pack before spawning words');
assert(game.includes('ScenarioMode.startExam()'), 'EXAM mode route is missing');
assert(game.includes('LabMode.start(labSelect.value)'), 'LAB mode route is missing');
assert(game.includes('Dashboard.open()'), 'dashboard route is missing');
assert(dashboard.includes("document.getElementById('start-screen')"), 'dashboard should coordinate with the start screen overlay');
assert(dashboard.includes("startScreen?.classList.add('hidden')"), 'dashboard should hide the start screen while open');
assert(dashboard.includes("startScreen.classList.remove('hidden')"), 'dashboard should restore the start screen on close');
assert(dashboard.includes('restoreStart = true'), 'dashboard close should default to restoring the start screen');
assert(dashboard.includes('restoreStart: false'), 'dashboard handoffs should not briefly restore the start screen');
assert(game.includes("document.createElement('table')") || game.includes('document.createElement("table")'), 'leaderboard should be rendered with DOM nodes');
assert(!game.includes('${item.nickname}'), 'leaderboard nickname must not be interpolated into innerHTML');
assert(!game.includes('Session expired'), 'UI should not show raw session-expired copy to users');
assert(!game.includes('user_id: state.userId'), 'score submit should not trust client-side user_id');
assert(game.includes('Authorization'), 'authenticated API calls should send a bearer token');
assert(packMaker.includes("e.key === 'Enter' && !e.shiftKey"), 'pack maker chat textarea should send on Enter and keep Shift+Enter for newlines');
assert(packMaker.includes('ui.form.requestSubmit()'), 'pack maker Enter shortcut should submit through the form handler');
assert(server.includes('route: "not-needed"'), 'pack maker brief/status questions should not require or pretend to use an LLM route');
assert(verifyDb.includes('pack maker brief without LLM target'), 'DB E2E should prove Pack Maker brief questions do not require KUGNUS target config');
assert(server.includes('const MAX_SUBMITTED_SCORE = 25000;'), 'server should reject implausible forged leaderboard scores');
assert(!server.includes('DB 체크 임시 비활성화'), 'server readiness comments should not claim DB checks are disabled');
assert(server.includes('SELECT id, nickname FROM users WHERE id = ? LIMIT 1'), 'auth middleware should verify that bearer-token users still exist');
assert(server.includes('code: "SESSION_REVOKED"'), 'auth middleware should return a stable revoked-session code');
assert(server.includes('DELETE FROM custom_pack_scores'), 'withdraw should clean up custom pack scores explicitly');
assert(server.includes('DELETE FROM custom_pack_items'), 'withdraw should clean up custom pack items explicitly');
assert(server.includes('DELETE FROM custom_packs WHERE owner_id = ?'), 'withdraw should clean up custom packs explicitly');
assert(server.includes('function rateLimit('), 'auth and score endpoints should have basic rate limiting');
assert(server.includes('process.env.REQUEST_LOGS === "1"'), 'request logging should be opt-in for quieter local/dev runs');
assert(server.includes('function validateProductionConfig'), 'server should validate production runtime env before startup');
assert(server.includes('Unsafe production configuration'), 'server should fail fast on unsafe production env');
assert(server.includes('KUGNUS_GATEWAY_BASE_URL must be a public https URL'), 'server should reject private KUGNUS gateway URLs in production');
assert(server.includes('OPENAI_MODEL fallback must stay mini in production'), 'server should reject non-mini GPT fallback in production');
assert(verifyServerSmoke.includes('verifyProductionRuntimeGuard'), 'server smoke should prove production runtime guard behavior');
assert(verifyServerSmoke.includes('productionRuntimeGuard'), 'server smoke output should report production runtime guard status');
assert(!server.includes('Serving index.html from:'), 'root route should not log a debug-only file path on every load');
assert(server.includes('app.set("etag", false);'), 'server should disable ETags for actively changing HTML/UI responses');
assert(server.includes('function preventStaleUiCache'), 'server should define a no-store policy for fast-changing UI files');
assert(server.includes('sendNoStoreFile(res, indexPath'), 'index.html should be served with no-store cache headers');
assert(server.includes('{ cacheControl: false, lastModified: false }'), 'HTML sendFile should not attach stale validators during QA');
assert(server.includes('setHeaders: preventStaleUiCache'), 'JS assets should be served with no-store cache headers to avoid stale Pack Maker logic');
assert(server.includes('etag: false') && server.includes('lastModified: false'), 'JS static assets should not rely on stale validators during active QA');
assert(systemDoctor.includes('acceptedEnv'), 'system doctor should explain the accepted KUGNUS gateway env shape');
assert(systemDoctor.includes('GPT fallback only'), 'system doctor should distinguish GPT fallback env from KUGNUS gateway env');
assert(packageJson.scripts['release:secret'] === 'node scripts/generate_session_secret.mjs', 'package scripts should expose release:secret');
assert(fs.existsSync(path.join(root, 'scripts/generate_session_secret.mjs')), 'release secret generator should exist');
assert(releaseCheck.includes('npm run release:secret'), 'release check should direct operators to the session secret generator');
assert(verifyWorkflow.includes('scripts/ci_fake_kugnus_gateway.mjs'), 'CI should start a fake KUGNUS gateway for strict local doctor');
assert(verifyWorkflow.includes('KUGNUS_GATEWAY_BASE_URL=http://127.0.0.1:18790/v1'), 'CI env should point the app at the fake KUGNUS gateway');
assert(verifyWorkflow.includes('DUCKDUCKGO_API_KEY=ci-fake-duckduckgo-key'), 'CI env should include search grounding credentials so doctor is PASS, not WARN');
assert(verifyWorkflow.includes('npm run doctor:local -- --base-url=http://127.0.0.1:3001 --strict'), 'CI doctor should run local mode with strict BLOCKED/FAIL handling');
assert(fs.existsSync(path.join(root, 'scripts/ci_fake_kugnus_gateway.mjs')), 'CI fake KUGNUS gateway script should exist');
assert(localEnvExample.includes('SESSION_SECRET='), '.env.local.example should document SESSION_SECRET for stable sessions');
assert(localEnvExample.includes('ALLOWED_ORIGINS='), '.env.local.example should document ALLOWED_ORIGINS for release preflight');
assert(localEnvExample.includes('PACK_ADMIN_NICKNAMES='), '.env.local.example should document pack admin configuration');
assert(localEnvExample.includes('REVIEW_NOTIFY_EMAIL='), '.env.local.example should document public review notification recipient without committing a real address');
assert(!/@gmail\.com/i.test(localEnvExample), '.env.local.example should not include a personal review email');
assert(productionEnvExample.includes('RESEND_API_KEY='), '.env.production.example should document review email API key');
assert(productionEnvExample.includes('PUBLIC_APP_URL=https://codedrop.example.com/games/codedrop'), '.env.production.example should document public app URL with a generic example domain');
assert(!/@gmail\.com/i.test(productionEnvExample), '.env.production.example should not include a personal review email');
assert(!/(^|\n)KUGNUS_GATEWAY_BASE_URL=/m.test(localEnvExample), '.env.local.example should not activate KUGNUS gateway env by default');
assert(localEnvExample.includes('# KUGNUS_GATEWAY_API_KEY='), '.env.local.example should document KUGNUS gateway key only as a comment');
assert(productionEnvExample.includes('NODE_ENV=production'), '.env.production.example should be explicitly production-scoped');
assert(productionEnvExample.includes('SESSION_SECRET='), '.env.production.example should require a session secret');
assert(productionEnvExample.includes('npm run release:secret'), '.env.production.example should point to the session secret generator');
assert(productionEnvExample.includes('ALLOWED_ORIGINS=https://'), '.env.production.example should require public allowed origins');
assert(productionEnvExample.includes('https://codedrop.example.com/games/codedrop/'), '.env.production.example should document a generic CodeDrop subpath');
assert(productionEnvExample.includes('ALLOWED_ORIGINS=https://codedrop.example.com'), '.env.production.example should use a generic production origin');
assert(productionEnvExample.includes('DB_SSL=true'), '.env.production.example should default production DB SSL on');
assert(productionEnvExample.includes('DEFAULT_CHAT_ENGINE=gemini'), '.env.production.example should default to Gemini for public clones');
assert(!/(^|\n)KUGNUS_GATEWAY_BASE_URL=/m.test(productionEnvExample), '.env.production.example should not require KUGNUS gateway env by default');
assert(productionEnvExample.includes('DUCKDUCKGO_API_KEY='), '.env.production.example should document search grounding credentials');
assert(productionEnvExample.includes('GEMINI_API_KEY='), '.env.production.example should document the optional Gemini API key');
assert(renderYaml.includes('GEMINI_API_KEY') && renderYaml.includes('GEMINI_MODEL'), 'render.yaml should expose optional Gemini deployment env vars');
assert(kugnusGatewayEnvExample.includes('# KUGNUS_GATEWAY_BASE_URL=https://llm.example.com/v1'), 'KUGNUS gateway reference should comment the owner/private gateway URL');
assert(kugnusGatewayEnvExample.includes('# KUGNUS_GATEWAY_MODEL=gemma4:12b-it-qat'), 'KUGNUS gateway reference should comment the Gemma 4 12B model');
assert(kugnusGatewayEnvExample.includes('# KUGNUS_CHAT_MODEL=gemma4:12b-it-qat'), 'KUGNUS gateway reference should document the chat model alias as a comment');
assert(!/(^|\n)KUGNUS_GATEWAY_BASE_URL=/m.test(kugnusGatewayEnvExample), 'KUGNUS gateway reference should not contain active env assignments');
const firebaseMigration = read('FIREBASE_MIGRATION.md');
assert(firebaseMigration.includes('Firebase Hosting rewrite from `/api/**` to Cloud Run or Functions'), 'Firebase migration doc should require API rewrites');
assert(firebaseMigration.includes('without\n  open development `allow read, write: if true`'), 'Firebase migration doc should reject open Firestore rules');
assert(firebaseMigration.includes('/api/pack-maker/chat/stream'), 'Firebase migration doc should require Pack Maker streaming in the private API layer');

console.log(JSON.stringify({
    ui: 'ok',
    standardCard: { width: 840, height: 760 },
    standardLeaderboard: { width: 440, height: 760 },
    ocpCard: { width: 840, height: 760 },
    ocpLeaderboard: { width: 440, height: 760 },
    scriptCount: expectedOrder.length
}, null, 2));
