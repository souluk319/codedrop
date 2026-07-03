import fs from 'fs';
import path from 'path';

const root = process.cwd();
const index = read('index.html');
const game = read('js/game.js');

function read(file) {
    return fs.readFileSync(path.join(root, file), 'utf8');
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

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

function hasId(id) {
    return index.includes(`id="${id}"`);
}

const scripts = [...index.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1]);
const expectedOrder = [
    'js/word_packs.js',
    'js/scenario_packs.js',
    'js/lab_packs.js',
    'js/study_stats.js',
    'js/game.js',
    'js/scenario_mode.js',
    'js/lab_mode.js',
    'js/dashboard.js'
];

let lastIndex = -1;
expectedOrder.forEach(src => {
    const current = scripts.indexOf(src);
    assert(current !== -1, `missing script tag for ${src}`);
    assert(current > lastIndex, `script order is wrong around ${src}`);
    lastIndex = current;
    assert(fs.existsSync(path.join(root, src)), `script file does not exist: ${src}`);
});

[
    'edition-switch',
    'edition-code-btn',
    'edition-ocp-btn',
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
    'dashboard-screen'
].forEach(id => assert(hasId(id), `missing DOM id: ${id}`));

assert(index.includes('assets/red-hat-logo.svg'), 'OCP hat asset is not referenced');
assert(fs.existsSync(path.join(root, 'assets/red-hat-logo.svg')), 'OCP hat asset file is missing');
assert(index.includes('scaleX(-1) rotate(-12deg)'), 'OCP hat should be mirrored and lightly tilted');

const baseCard = cssBlock('#start-screen .card', block => block.includes('width: 520px'));
assert(pxValue(baseCard, 'width') === 520, 'standard card width should stay compact');
assert(pxValue(baseCard, 'height') === 540, 'standard card height should stay compact');

const ocpCard = cssBlock('body.ocp-edition #start-screen .card');
assert(pxValue(ocpCard, 'width') === 780, 'OCP card must widen to fit the larger mode menu');
assert(pxValue(ocpCard, 'height') === 680, 'OCP card must grow into a balanced larger frame');
assert(pxValue(ocpCard, 'min-height') === 680, 'OCP card min-height must protect against clipping');
assert(ocpCard.includes('overflow: hidden;'), 'OCP desktop card should grow instead of relying on inner scroll');

const ocpLoggedIn = cssBlock('body.ocp-edition #logged-in-view');
assert(ocpLoggedIn.includes('height: 100%;'), 'OCP logged-in view should fill the enlarged card without squeezing controls');
assert(ocpLoggedIn.includes('min-height: 0;'), 'OCP logged-in view should allow balanced inner grid sizing');
assert(ocpLoggedIn.includes('justify-content: flex-start;'), 'OCP controls should not be vertically squeezed');

const ocpMenu = cssBlock('body.ocp-edition .ocp-menu');
assert(ocpMenu.includes('display: grid;'), 'OCP menu should use the expanded frame instead of stacking every control');
assert(ocpMenu.includes('grid-template-columns: minmax(0, 1.24fr) minmax(250px, 0.9fr);'), 'OCP menu should balance mode tiles and controls side-by-side');
assert(ocpMenu.includes('border: 0;'), 'OCP menu should not look like a nested card frame');
assert(ocpMenu.includes('background: transparent;'), 'OCP menu should rely on the outer card frame');

const editionSwitch = cssBlock('.edition-switch');
assert(editionSwitch.includes('min-height: 42px;'), 'edition switch needs a stable tap height');
assert(!index.includes('font-size: 5rem; text-shadow: 0 0 20px var(--primary-neon);'), 'brand title should not use fixed inline mobile-hostile sizing');

const modeGrid = cssBlock('body.ocp-edition .mode-grid');
assert(modeGrid.includes('repeat(2, minmax(0, 1fr))'), 'OCP mode grid should remain a balanced 2x2 grid');
assert(index.includes('grid-auto-rows: minmax(70px, auto);'), 'compact OCP mode grid must keep tile height instead of collapsing');
assert(index.includes('min-height: 152px;'), 'short viewport OCP grid needs a stable two-row height');

const modeChoice = cssBlock('body.ocp-edition .mode-choice');
assert(pxValue(modeChoice, 'min-height') >= 80, 'OCP mode tiles should be large enough to read comfortably');

const ocpLeaderboard = cssBlock('body.ocp-edition #leaderboard-preview');
assert(pxValue(ocpLeaderboard, 'width') === 360, 'OCP leaderboard should stay smaller than the expanded main card');
assert(pxValue(ocpLeaderboard, 'height') === 560, 'OCP leaderboard should read as a secondary panel');
assert(ocpLeaderboard.includes('max-height: calc(100dvh - 120px);'), 'OCP leaderboard should not overflow short desktop viewports');

const dashboardCard = cssBlock('.dashboard-card');
assert(dashboardCard.includes('max-height: calc(100dvh - 80px);'), 'dashboard card should be scrollable inside the viewport');
assert(dashboardCard.includes('overflow-y: auto;'), 'dashboard card should not clip its content');

const surgeAfter = cssBlock('.edition-surge::after');
assert(!surgeAfter.includes('linear-gradient(112deg'), 'old X transition gradient should not return');
assert(!surgeAfter.includes('linear-gradient(68deg'), 'old X transition gradient should not return');
assert(index.includes('body.edition-burst .edition-surge'), 'edition switch burst animation is missing');

assert(game.includes("const LOCAL_AUTH_KEY = 'codedrop_local_auth_users';"), 'local dev auth key is missing');
assert(game.includes("users.test = { id: 'local-test', nickname: 'test', password: 'test' };"), 'local test/test auth seed is missing');
assert(game.includes('tryLocalDevLogin(nickname, password)'), 'login flow does not call local dev fallback');
assert(game.includes('if (isLocalDevAuthEnabled() && tryLocalDevLogin(nickname, password)) return;'), 'local test/test login should work before remote API rejection');
assert(game.includes("els.controls.packSelect.value = 'OC_CORE';"), 'OCP CLI Drop must force the OC_CORE pack');
assert(game.includes('ScenarioMode.startExam()'), 'EXAM mode route is missing');
assert(game.includes('LabMode.start(labSelect.value)'), 'LAB mode route is missing');
assert(game.includes('Dashboard.open()'), 'dashboard route is missing');
assert(game.includes("document.createElement('table')") || game.includes('document.createElement("table")'), 'leaderboard should be rendered with DOM nodes');
assert(!game.includes('${item.nickname}'), 'leaderboard nickname must not be interpolated into innerHTML');
assert(!game.includes('user_id: state.userId'), 'score submit should not trust client-side user_id');
assert(game.includes('Authorization'), 'authenticated API calls should send a bearer token');

console.log(JSON.stringify({
    ui: 'ok',
    standardCard: { width: 520, height: 540 },
    ocpCard: { width: 780, height: 680 },
    ocpLeaderboard: { width: 360, height: 560 },
    scriptCount: expectedOrder.length
}, null, 2));
