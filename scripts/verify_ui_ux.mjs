import fs from 'fs';
import path from 'path';

const root = process.cwd();
const index = read('index.html');
const game = read('js/game.js');
const server = read('server.js');
const dashboard = read('js/dashboard.js');
const stats = read('js/study_stats.js');
const learn = read('js/learn_mode.js');
const dockerCompose = read('docker-compose.local.yml');
const localSchema = read('db/init/001_schema.sql');
const localEnvExample = read('.env.local.example');
const productionEnvExample = read('.env.production.example');
const verifyWorkflow = read('.github/workflows/verify.yml');
const releaseCheck = read('scripts/check_release_readiness.mjs');
const systemDoctor = read('scripts/system_doctor.mjs');
const packageJson = JSON.parse(read('package.json'));

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
    'js/lesson_packs.js',
    'js/study_stats.js',
    'js/game.js',
    'js/scenario_mode.js',
    'js/lab_mode.js',
    'js/learn_mode.js',
    'js/dashboard.js',
    'js/pack_maker.js'
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
    'pack-maker-btn',
    'pack-maker-screen',
    'pack-maker-close',
    'pack-maker-status',
    'pack-maker-engine',
    'pack-maker-chat-log',
    'pack-maker-chat-bottom',
    'pack-maker-chat-form',
    'pack-maker-input',
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

assert(game.includes('LearnMode.openPicker()'), 'LEARN mode route is missing');
assert(index.includes('mode-choice-wide'), 'learn tile should span the mode grid');

assert(index.includes('assets/red-hat-logo.svg'), 'OCP hat asset is not referenced');
assert(fs.existsSync(path.join(root, 'assets/red-hat-logo.svg')), 'OCP hat asset file is missing');
assert(index.includes('scaleX(-1) rotate(-12deg)'), 'OCP hat should be mirrored and lightly tilted');

const startScreen = cssBlock('#start-screen');
assert(startScreen.includes('justify-content: center;'), 'start screen should center the title and menu group by default');

const baseCard = cssBlock('#start-screen .card', block => block.includes('width: 560px'));
assert(pxValue(baseCard, 'width') === 560, 'standard card should be large enough for balanced controls');
assert(pxValue(baseCard, 'height') === 600, 'standard card should give the menu and footer enough vertical room');

const ocpCard = cssBlock('body.ocp-edition #start-screen .card');
assert(pxValue(ocpCard, 'width') === 840, 'OCP card must widen to fit the larger mode menu');
assert(pxValue(ocpCard, 'height') === 720, 'OCP card must grow into a balanced larger frame');
assert(pxValue(ocpCard, 'min-height') === 720, 'OCP card min-height must protect against clipping');
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
assert(pxValue(standardLeaderboard, 'height') === 600, 'standard leaderboard should align with the larger menu card height');

const modeGrid = cssBlock('body.ocp-edition .mode-grid');
assert(modeGrid.includes('repeat(2, minmax(0, 1fr))'), 'OCP mode grid should remain a balanced 2x2 grid');
assert(index.includes('grid-auto-rows: minmax(68px, auto);'), 'compact OCP mode grid must keep tile height instead of collapsing');
assert(index.includes('body.ocp-edition #learn-info-group,'), 'learn mode controls must use the same right column as other OCP controls');

const modeChoice = cssBlock('body.ocp-edition .mode-choice');
assert(pxValue(modeChoice, 'min-height') >= 80, 'OCP mode tiles should be large enough to read comfortably');

const ocpLeaderboard = cssBlock('body.ocp-edition #leaderboard-preview');
assert(pxValue(ocpLeaderboard, 'width') === 340, 'OCP leaderboard should stay smaller than the expanded main card');
assert(pxValue(ocpLeaderboard, 'height') === 520, 'OCP leaderboard should read as a secondary panel');
assert(ocpLeaderboard.includes('max-height: calc(100dvh - 120px);'), 'OCP leaderboard should not overflow short desktop viewports');

const learnRow = cssBlock('.learn-lesson-row');
assert(learnRow.includes('grid-template-columns: 22px minmax(0, 1fr) auto;'), 'learn lesson rows should keep long titles and quiz meta aligned');
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
assert(index.includes('ASK TO KUGNUS SERVER'), 'learn chat should default the assistant title to KUGNUS SERVER');
assert(index.includes('data-engine="kugnus"') && index.includes('KUGNUS SERVER'), 'learn chat should expose KUGNUS SERVER as the local engine choice');
assert(index.includes('data-engine="openai"') && index.includes('GPT 5.4 MINI'), 'learn chat should expose GPT 5.4 MINI as an engine choice');
assert(index.includes('<option value="kugnus" selected>KUGNUS SERVER</option>'), 'learn chat hidden select should default to KUGNUS SERVER');
assert(learn.includes("fetch('/api/learn-chat/stream'"), 'learn chat should call the streaming server-side LLM proxy');
assert(learn.includes("engine: ui.chatEngine.value"), 'learn chat should send the selected LLM engine');
assert(!learn.includes('TEST_CHAT_ENGINE'), 'localhost GPT test lock should be removed');
assert(learn.includes('offerKugnusFallbackIfNeeded()'), 'learn chat should offer KUGNUS-to-GPT fallback');
assert(!learn.includes('sessionStorage'), 'learn chat fallback should not persist across page reloads');
assert(learn.includes('function syncChatEngineUi()'), 'custom learn chat engine picker should sync with the hidden select value');
assert(learn.includes('function toggleChatEngineMenu()'), 'custom learn chat engine picker should use a themed popover');
assert(index.includes('.learn-engine-menu'), 'learn chat engine popover should be themeable instead of native browser blue');
assert(server.includes('app.post("/api/learn-chat"'), 'learn chat proxy route is missing');
assert(server.includes('app.post("/api/learn-chat/stream"'), 'streaming learn chat proxy route is missing');
assert(server.includes('application/x-ndjson'), 'streaming learn chat should emit NDJSON');
assert(server.includes('writeNdjson(res, "meta"'), 'streaming learn chat should emit meta events');
assert(server.includes('writeNdjson(res, "delta"'), 'streaming learn chat should emit delta events');
assert(server.includes('writeNdjson(res, "done"'), 'streaming learn chat should emit done events');
assert(server.includes('writeNdjson(res, "error"'), 'streaming learn chat should emit error events');
assert(server.includes('llmPayload(target, messages, true'), 'LLM stream requests must set stream:true');
assert(learn.includes('new AbortController()'), 'learn chat should use AbortController for STOP');
assert(learn.includes("ui.chatSend.textContent = busy ? 'STOP' : 'ASK'"), 'ASK button should turn into STOP while streaming');
assert(index.includes('learn-chat-bottom'), 'learn chat should include a scroll-to-latest button');
assert(learn.includes('renderMarkdownInto'), 'learn chat should render markdown through a safe DOM renderer');
assert(learn.includes('appendInline'), 'learn chat markdown renderer should build inline nodes safely');
assert(learn.includes('createAssistantActions'), 'assistant answers should expose copy/retry/regenerate actions');
assert(learn.includes('persistChatHistory()'), 'learn chat should persist lesson history');
assert(!/innerHTML\s*=\s*(markdown|answer|text|data\.answer)/.test(learn), 'markdown/chat answers must not be assigned through raw innerHTML');
assert(server.includes('KUGNUS_GATEWAY_BASE_URL'), 'KUGNUS SERVER should prefer the public gateway base URL');
assert(server.includes('KUGNUS_GATEWAY_API_KEY'), 'KUGNUS SERVER should read the public gateway API key');
assert(server.includes('KUGNUS_GATEWAY_MODEL'), 'KUGNUS SERVER should read the gateway model id');
assert(server.includes('"LLM_BASE_URL"'), 'learn chat proxy should keep legacy LLM_BASE_URL compatibility');
assert(server.includes('"LLM_MODEL"'), 'learn chat proxy should keep legacy LLM_MODEL compatibility');
assert(server.includes('GPT_OPENAI_API_KEY'), 'learn chat proxy should support a GPT-specific mini fallback API key');
assert(server.includes('GPT_OPENAI_MODEL'), 'learn chat proxy should support a GPT-specific mini fallback model override');
assert(server.includes('shouldUseOpenAiEnvForKugnus'), 'KUGNUS gateway should support OpenAI-compatible env aliases safely');
assert(server.includes('function kugnusRouteFromEnvName'), 'KUGNUS health should identify whether it uses gateway, direct, or OpenAI env alias routing');
assert(server.includes('route: target.route'), 'KUGNUS health and stream meta should expose sanitized routing type');
assert(game.includes('route: llmStatus.route'), 'front-end KUGNUS status snapshot should preserve the current route');
assert(learn.includes('function chatEngineStatus'), 'learn chat status should include KUGNUS route context');
assert(index.includes('id="learn-chat-route"'), 'learn chat should show the active KUGNUS route separately from task status');
assert(learn.includes('function updateChatRouteStatus'), 'learn chat should update the visible KUGNUS route indicator');
assert(server.includes('normalizeOpenAiMiniModel'), 'OpenAI model ids should be normalized before use');
assert(server.includes('value || process.env.DEFAULT_CHAT_ENGINE || "kugnus"'), 'server chat engine default should prefer KUGNUS SERVER');
assert(server.includes('app.get("/api/llm/kugnus/health"'), 'KUGNUS health endpoint is missing');
assert(game.includes('startKugnusHealthCheck()'), 'app should start a background KUGNUS health check');
assert(game.includes('maybeSwitchFromOfflineKugnus'), 'app should expose KUGNUS fallback confirmation helper');
assert(server.includes('Only OpenAI mini models are allowed for learn chat'), 'learn chat must refuse non-mini OpenAI models');
assert(server.includes('DUCKDUCKGO_API_KEY'), 'future web search should support DUCKDUCKGO_API_KEY');
assert(server.includes('DDG_API_KEY'), 'future web search should support DDG_API_KEY');
assert(server.includes('duckDuckGoConfig()'), 'DuckDuckGo config helper is missing');
assert(server.includes('duckDuckGoHtmlSearch'), 'Pack Maker search should fall back to DuckDuckGo HTML results when Instant Answer is empty');
assert(server.includes('normalizeDuckDuckGoHref'), 'DuckDuckGo HTML result redirect URLs should be normalized before becoming sources');

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
assert(game.includes('async function ensureSelectedPackReady(pack)'), 'DROP start should guard custom packs before game launch');
assert(game.includes('if (!await ensureSelectedPackReady(pack)) return;'), 'DROP start should not launch with an unloaded custom pack');
assert(game.includes('event.dataTransfer.setData'), 'pack selector should support drag-to-console');
assert(game.includes('window.CodeDropPackSelector'), 'custom packs should be able to refresh the visual pack selector');
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
assert(server.includes('function isPackGenerationRequest'), 'pack maker should gate vague chat before starting search/generation');
assert(server.includes('PACK BRIEF REQUIRED'), 'pack maker should answer vague prompts with a brief request instead of generating');
assert(server.includes('requestedCount'), 'pack maker should track the requested item count');
assert(server.includes('packMakerTokenBudget'), 'pack maker should scale LLM token budget from target item count');
assert(server.includes('PACK_MAKER_BATCH_TIMEOUT_MS'), 'pack maker should bound each LLM batch so requests do not hang indefinitely');
assert(server.includes('300_000'), 'pack maker should allow realistic KUGNUS 50-item drafts to run long enough');
assert(server.includes('90_000'), 'pack maker batch timeout should allow Gemma-class batches enough time');
assert(server.includes('linkedTimeoutSignal'), 'pack maker should link per-batch timeout to client aborts');
assert(server.includes('readLearnLlmStream('), 'pack maker batch generation should stream LLM deltas instead of hiding work until the end');
assert(server.includes('function buildPackMakerFillMessages'), 'pack maker should have a dedicated missing-item repair prompt');
assert(server.includes('generatePackMakerFillDraft'), 'pack maker should repair low-yield batches instead of blindly continuing');
assert(server.includes('PACK_REPAIR_ATTEMPTS'), 'pack maker should retry/repair drafts that are short');
assert(server.includes('draftMeetsPackIntent'), 'pack maker should verify draft count/language before success');
assert(server.includes('DRAFT SHORT'), 'pack maker should fail visibly when the target draft is still short');
assert(server.includes('writeNdjson(res, "status"'), 'pack maker stream should send generation status events');
assert(!server.includes('{ maxTokens: 2200 }'), 'pack maker should not use a fixed 2200-token budget for every pack');
assert(server.includes('app.post("/api/packs", authUser'), 'custom pack save endpoint should require auth');
assert(server.includes('app.get("/api/packs?') === false, 'custom pack list should not be hardcoded as a static route');
assert(server.includes('PACK_ADMIN_NICKNAMES'), 'pack review should be guarded by admin nicknames');
assert(server.includes('custom_pack_scores'), 'custom pack scores should be stored separately from official leaderboard');
assert(server.includes('function dbSslConfig()'), 'server should allow local Docker DB SSL configuration');
assert(server.includes('process.env.DB_SSL'), 'server DB SSL should be configurable for local Docker MySQL');
assert(dockerCompose.includes('image: mysql:8.4'), 'local Docker DB should use a pinned MySQL image');
assert(dockerCompose.includes('3307:3306'), 'local Docker DB should expose MySQL on host port 3307');
assert(dockerCompose.includes('./db/init:/docker-entrypoint-initdb.d:ro'), 'local Docker DB should mount schema init scripts');
assert(localSchema.includes('CREATE TABLE IF NOT EXISTS users'), 'local Docker schema should initialize users table');
assert(localSchema.includes('CREATE TABLE IF NOT EXISTS custom_packs'), 'local Docker schema should initialize custom pack tables');
assert(localSchema.includes('CREATE TABLE IF NOT EXISTS custom_pack_scores'), 'local Docker schema should initialize custom pack score tables');
assert(localEnvExample.includes('DB_SSL=false'), 'local env example should disable TLS for local Docker MySQL');
assert(localEnvExample.includes('DEFAULT_CHAT_ENGINE=kugnus'), 'local env example should default chat to KUGNUS SERVER');
assert(localEnvExample.includes('KUGNUS_GATEWAY_BASE_URL='), 'local env example should document the KUGNUS gateway base URL');
assert(localEnvExample.includes('KUGNUS_GATEWAY_API_KEY='), 'local env example should document the KUGNUS gateway API key');
assert(localEnvExample.includes('KUGNUS_GATEWAY_MODEL=gemma4:12b-it-qat'), 'local env example should document the KUGNUS gateway chat model');
assert(localEnvExample.includes('KUGNUS_EMBEDDING_MODEL=embeddinggemma:latest'), 'local env example should document the KUGNUS embedding model');
assert(fs.existsSync(path.join(root, 'scripts/verify_kugnus_gateway_live.mjs')), 'live KUGNUS gateway verifier script is missing');
assert(packageJson.scripts?.['verify:kugnus-live'] === 'node scripts/verify_kugnus_gateway_live.mjs', 'package should expose the live KUGNUS gateway verifier command');
assert(fs.existsSync(path.join(root, 'scripts/system_doctor.mjs')), 'system doctor script is missing');
assert(packageJson.scripts?.doctor === 'node scripts/system_doctor.mjs', 'package should expose the system doctor command');
assert(packageJson.scripts?.['doctor:deep'] === 'node scripts/system_doctor.mjs --deep', 'package should expose the deep system doctor command');
assert(releaseCheck.includes("['.env.local', '.env']"), 'release check should load the same default env stack as the server');
assert(systemDoctor.includes("['.env.local', '.env']"), 'system doctor should load the same default env stack as the server');
assert(verifyWorkflow.includes('npm run verify'), 'CI workflow should run the main verification suite');
assert(verifyWorkflow.includes('npm run verify:db'), 'CI workflow should run database E2E against local MySQL');
assert(verifyWorkflow.includes('npm run doctor'), 'CI workflow should publish the system doctor report');
assert(localEnvExample.includes('PACK_MAKER_TIMEOUT_MS=300000'), 'local env example should document realistic Pack Maker timeout');
assert(localEnvExample.includes('PACK_MAKER_BATCH_TIMEOUT_MS=90000'), 'local env example should document realistic Pack Maker batch timeout');
assert(productionEnvExample.includes('PACK_MAKER_TIMEOUT_MS=300000'), 'production env example should document realistic Pack Maker timeout');
assert(productionEnvExample.includes('PACK_MAKER_BATCH_TIMEOUT_MS=90000'), 'production env example should document realistic Pack Maker batch timeout');
assert(packageJson.scripts?.['verify:packmaker:kugnus'] === 'node scripts/verify_packmaker_kugnus_e2e.mjs', 'package should expose the real KUGNUS Pack Maker E2E command');
assert(localEnvExample.includes('GPT_OPENAI_MODEL=gpt-5.4-mini'), 'local env example should document the GPT mini fallback model');
assert(server.includes('Only OpenAI mini models are allowed for learn chat'), 'OpenAI mini model guard should remain active');
assert(index.includes('<script src="js/pack_maker.js"></script>'), 'pack maker script tag is missing');
assert(index.includes('<option value="kugnus" selected>KUGNUS SERVER</option>'), 'pack maker should default to KUGNUS SERVER');
const packMaker = read('js/pack_maker.js');
assert(packMaker.includes('/api/pack-maker/chat/stream'), 'pack maker client should call the stream endpoint');
assert(packMaker.includes('function engineStatus'), 'pack maker status should include KUGNUS route context');
assert(index.includes('id="pack-maker-route"'), 'pack maker should show the active KUGNUS route separately from draft status');
assert(packMaker.includes('function updateEngineRouteStatus'), 'pack maker should update the visible KUGNUS route indicator');
assert(packMaker.includes("codedrop_pack_maker_draft_v2"), 'pack maker should not restore stale pre-release draft storage');
assert(packMaker.includes("const SCOPED_STORAGE_VERSION = 'v3';"), 'pack maker draft/chat storage should be versioned by auth scope');
assert(packMaker.includes('function storageScope()'), 'pack maker should compute a user-scoped local storage key');
assert(packMaker.includes('return state.userToken ? { Authorization'), 'pack maker should separate logged-in storage/API behavior from guest preview');
assert(packMaker.includes('if (!key) {') && packMaker.includes('stateRef.chat = [];'), 'guest pack maker should not restore previous user chat history');
assert(packMaker.includes('reloadScopedLocalState()'), 'pack maker should reload draft/chat when auth state changes');
assert(packMaker.includes("evt.event === 'status'"), 'pack maker client should render server status events');
assert(packMaker.includes('showRemoteLoginRequired'), 'pack maker should avoid stacking duplicate remote-login warnings');
assert(packMaker.includes('async function ensureRemoteAuth()'), 'pack maker should validate remote auth before LLM or save calls');
assert(packMaker.includes("fetch('/api/session'"), 'pack maker should check the current server session before ASK/SAVE');
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
assert(!index.includes('body[data-app-lang='), 'language state should stay inside the README manual');
assert(index.includes('class="readme-lang-toggle"'), 'system manual should include an EN/KR language toggle');
assert(index.includes('data-readme-lang="ko"'), 'system manual Korean toggle is missing');
assert(index.includes('시스템 매뉴얼'), 'system manual should include Korean copy');
assert(index.includes('https://www.kugnus.com'), 'system manual contact should include www.kugnus.com');
assert(index.includes('mailto:kugnus@cywell.co.kr'), 'system manual email should link to kugnus@cywell.co.kr');
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

const labCheckItem = cssBlock('.lab-check-item');
assert(labCheckItem.includes('grid-template-columns: 42px minmax(0, 1fr);'), 'lab checklist needs a stable marker/text grid');
assert(index.includes('.lab-check-text'), 'lab checklist text should have its own wrapping target');

assert(dashboard.includes('resetStudyData()'), 'dashboard reset handler is missing');
assert(stats.includes('function reset()'), 'StudyStats reset API is missing');
assert(learn.includes('resetProgress'), 'LearnMode reset hook is missing');

assert(game.includes("const LOCAL_AUTH_KEY = 'codedrop_local_auth_users';"), 'local dev auth key is missing');
assert(game.includes("users.test = { id: 'local-test', nickname: 'test', password: 'test' };"), 'local test/test auth seed is missing');
assert(game.includes('tryLocalDevLogin(nickname, password)'), 'login flow does not call local dev fallback');
assert(game.includes('async function provisionLocalDevServerSession'), 'local test/test should try to obtain a real server token for Pack Maker');
assert(game.includes('await provisionLocalDevServerSession(nickname, password)'), 'login flow should use local credentials to provision a server session before falling back');
assert(game.includes("els.controls.packSelect.value = 'OC_CORE';"), 'OCP CLI Drop must force the OC_CORE pack');
assert(game.includes('ScenarioMode.startExam()'), 'EXAM mode route is missing');
assert(game.includes('LabMode.start(labSelect.value)'), 'LAB mode route is missing');
assert(game.includes('Dashboard.open()'), 'dashboard route is missing');
assert(game.includes("document.createElement('table')") || game.includes('document.createElement("table")'), 'leaderboard should be rendered with DOM nodes');
assert(!game.includes('${item.nickname}'), 'leaderboard nickname must not be interpolated into innerHTML');
assert(!game.includes('Session expired'), 'UI should not show raw session-expired copy to users');
assert(!game.includes('user_id: state.userId'), 'score submit should not trust client-side user_id');
assert(game.includes('Authorization'), 'authenticated API calls should send a bearer token');
assert(packMaker.includes("e.key === 'Enter' && !e.shiftKey"), 'pack maker chat textarea should send on Enter and keep Shift+Enter for newlines');
assert(packMaker.includes('ui.form.requestSubmit()'), 'pack maker Enter shortcut should submit through the form handler');
assert(server.includes('const MAX_SUBMITTED_SCORE = 25000;'), 'server should reject implausible forged leaderboard scores');
assert(!server.includes('DB 체크 임시 비활성화'), 'server readiness comments should not claim DB checks are disabled');
assert(server.includes('SELECT id, nickname FROM users WHERE id = ? LIMIT 1'), 'auth middleware should verify that bearer-token users still exist');
assert(server.includes('code: "SESSION_REVOKED"'), 'auth middleware should return a stable revoked-session code');
assert(server.includes('DELETE FROM custom_pack_scores'), 'withdraw should clean up custom pack scores explicitly');
assert(server.includes('DELETE FROM custom_pack_items'), 'withdraw should clean up custom pack items explicitly');
assert(server.includes('DELETE FROM custom_packs WHERE owner_id = ?'), 'withdraw should clean up custom packs explicitly');
assert(server.includes('function rateLimit('), 'auth and score endpoints should have basic rate limiting');
assert(server.includes('process.env.REQUEST_LOGS === "1"'), 'request logging should be opt-in for quieter local/dev runs');
assert(!server.includes('Serving index.html from:'), 'root route should not log a debug-only file path on every load');
assert(localEnvExample.includes('SESSION_SECRET='), '.env.local.example should document SESSION_SECRET for stable sessions');
assert(localEnvExample.includes('ALLOWED_ORIGINS='), '.env.local.example should document ALLOWED_ORIGINS for release preflight');
assert(localEnvExample.includes('PACK_ADMIN_NICKNAMES='), '.env.local.example should document pack admin configuration');
assert(localEnvExample.includes('LLM_BASE_URL='), '.env.local.example should expose dev-only direct KUGNUS routing');
assert(/(^|\n)KUGNUS_GATEWAY_BASE_URL=\s*(\n|$)/.test(localEnvExample), '.env.local.example should not activate a fake KUGNUS gateway URL by default');
assert(localEnvExample.includes('KUGNUS_GATEWAY_API_KEY='), '.env.local.example should document the public KUGNUS gateway key');
assert(productionEnvExample.includes('NODE_ENV=production'), '.env.production.example should be explicitly production-scoped');
assert(productionEnvExample.includes('SESSION_SECRET='), '.env.production.example should require a session secret');
assert(productionEnvExample.includes('ALLOWED_ORIGINS=https://'), '.env.production.example should require public allowed origins');
assert(productionEnvExample.includes('DB_SSL=true'), '.env.production.example should default production DB SSL on');
assert(productionEnvExample.includes('KUGNUS_GATEWAY_BASE_URL='), '.env.production.example should require the public KUGNUS gateway URL');
assert(productionEnvExample.includes('DUCKDUCKGO_API_KEY='), '.env.production.example should document search grounding credentials');
assert(!/(^|\n)LLM_BASE_URL=\\S/.test(productionEnvExample), '.env.production.example must not enable direct KUGNUS routing');
assert(productionEnvExample.includes('ALLOW_DIRECT_KUGNUS=0'), '.env.production.example should explicitly reject direct KUGNUS by default');

console.log(JSON.stringify({
    ui: 'ok',
    standardCard: { width: 560, height: 600 },
    standardLeaderboard: { width: 440, height: 600 },
    ocpCard: { width: 840, height: 720 },
    ocpLeaderboard: { width: 340, height: 520 },
    scriptCount: expectedOrder.length
}, null, 2));
