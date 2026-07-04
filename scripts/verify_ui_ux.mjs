import fs from 'fs';
import path from 'path';

const root = process.cwd();
const index = read('index.html');
const game = read('js/game.js');
const server = read('server.js');
const dashboard = read('js/dashboard.js');
const stats = read('js/study_stats.js');
const learn = read('js/learn_mode.js');

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
    'pack-maker-btn',
    'pack-maker-screen',
    'pack-maker-close',
    'pack-maker-status',
    'pack-maker-engine',
    'pack-maker-chat-log',
    'pack-maker-chat-form',
    'pack-maker-input',
    'pack-maker-send',
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
assert(index.includes('ASK TO GPT 5.4 MINI'), 'learn chat should default the assistant title to GPT 5.4 MINI during testing');
assert(index.includes('data-engine="kugnus"') && index.includes('KUGNUS SERVER'), 'learn chat should expose KUGNUS SERVER as the local engine choice');
assert(index.includes('data-engine="openai"') && index.includes('GPT 5.4 MINI'), 'learn chat should expose GPT 5.4 MINI as an engine choice');
assert(index.includes('<option value="openai" selected>GPT 5.4 MINI</option>'), 'learn chat hidden select should default to GPT 5.4 MINI');
assert(learn.includes("fetch('/api/learn-chat/stream'"), 'learn chat should call the streaming server-side LLM proxy');
assert(learn.includes("engine: ui.chatEngine.value"), 'learn chat should send the selected LLM engine');
assert(learn.includes("const TEST_CHAT_ENGINE = TEST_ENGINE_LOCK_HOSTS.has(TEST_CHAT_HOSTNAME) ? 'openai' : null;"), 'localhost learn chat testing should be locked to GPT 5.4 MINI');
assert(learn.includes("localStorage.setItem(CHAT_ENGINE_STORAGE_KEY, TEST_CHAT_ENGINE);"), 'localhost engine lock should overwrite stale KUGNUS localStorage');
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
assert(server.includes('process.env.LLM_BASE_URL'), 'learn chat proxy should read LLM_BASE_URL from .env');
assert(server.includes('process.env.LLM_MODEL'), 'learn chat proxy should read LLM_MODEL from .env');
assert(server.includes('OPENAI_API_KEY'), 'learn chat proxy should read OPENAI_API_KEY for GPT 5.4 mini fallback');
assert(server.includes('OPENAI_MODEL'), 'learn chat proxy should allow OPENAI_MODEL override');
assert(server.includes('normalizeOpenAiMiniModel'), 'OpenAI model ids should be normalized before use');
assert(server.includes('value || process.env.DEFAULT_CHAT_ENGINE || "openai"'), 'server chat engine default should prefer GPT 5.4 MINI during testing');
assert(server.includes('Only OpenAI mini models are allowed for learn chat'), 'learn chat must refuse non-mini OpenAI models');
assert(server.includes('DUCKDUCKGO_API_KEY'), 'future web search should support DUCKDUCKGO_API_KEY');
assert(server.includes('DDG_API_KEY'), 'future web search should support DDG_API_KEY');
assert(server.includes('duckDuckGoConfig()'), 'DuckDuckGo config helper is missing');

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
assert(game.includes('showCommandDialog({'), 'themed command dialog route is missing');
assert(game.includes('setGameChrome(true)'), 'game HUD/input should only activate during actual gameplay');
assert(game.includes('MutationObserver(syncOverlayChrome)'), 'overlay chrome observer is missing');
assert(!game.includes("    'start-screen',\n    'result-screen'"), 'start screen should keep the bottom music/readme toggles visible');

const hudHidden = cssBlock('body:not(.game-active) #hud');
assert(hudHidden.includes('pointer-events: none;'), 'inactive HUD should not intercept input');
const inputHidden = cssBlock('body:not(.game-active) #input-area');
assert(inputHidden.includes('pointer-events: none;'), 'inactive command input should not intercept input');
assert(!index.includes('body.overlay-chrome-hidden #music-widget'), 'music widget should stay visible on every app screen');
assert(!index.includes('body.overlay-chrome-hidden #readme-widget'), 'readme widget should stay visible on every app screen');
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
assert(server.includes('app.post("/api/packs", authUser'), 'custom pack save endpoint should require auth');
assert(server.includes('app.get("/api/packs?') === false, 'custom pack list should not be hardcoded as a static route');
assert(server.includes('PACK_ADMIN_NICKNAMES'), 'pack review should be guarded by admin nicknames');
assert(server.includes('custom_pack_scores'), 'custom pack scores should be stored separately from official leaderboard');
assert(server.includes('Only OpenAI mini models are allowed for learn chat'), 'OpenAI mini model guard should remain active');
assert(index.includes('<script src="js/pack_maker.js"></script>'), 'pack maker script tag is missing');
assert(index.includes('<option value="openai" selected>GPT 5.4 MINI</option>'), 'pack maker should default to GPT 5.4 MINI while home server is unavailable');
const packMaker = read('js/pack_maker.js');
assert(packMaker.includes('/api/pack-maker/chat/stream'), 'pack maker client should call the stream endpoint');
assert(packMaker.includes('SAVE MY PACK') || index.includes('SAVE MY PACK'), 'pack maker save action should be visible');
assert(!packMaker.includes('innerHTML'), 'pack maker client should avoid raw innerHTML rendering');
assert(packMaker.includes('function renderDraft(options = {})'), 'pack maker draft renderer should support preserving an existing status');
assert(packMaker.includes('const updateStatus = options.updateStatus !== false;'), 'pack maker renderDraft should be able to skip status updates');
assert(packMaker.includes('renderDraft({ updateStatus: Boolean(state.userToken) });'), 'pack maker open should not let draft count hide the remote-login warning');
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
assert(game.includes('if (isLocalDevAuthEnabled() && tryLocalDevLogin(nickname, password)) return;'), 'local test/test login should work before remote API rejection');
assert(game.includes("els.controls.packSelect.value = 'OC_CORE';"), 'OCP CLI Drop must force the OC_CORE pack');
assert(game.includes('ScenarioMode.startExam()'), 'EXAM mode route is missing');
assert(game.includes('LabMode.start(labSelect.value)'), 'LAB mode route is missing');
assert(game.includes('Dashboard.open()'), 'dashboard route is missing');
assert(game.includes("document.createElement('table')") || game.includes('document.createElement("table")'), 'leaderboard should be rendered with DOM nodes');
assert(!game.includes('${item.nickname}'), 'leaderboard nickname must not be interpolated into innerHTML');
assert(!game.includes('user_id: state.userId'), 'score submit should not trust client-side user_id');
assert(game.includes('Authorization'), 'authenticated API calls should send a bearer token');
assert(server.includes('const MAX_SUBMITTED_SCORE = 25000;'), 'server should reject implausible forged leaderboard scores');
assert(server.includes('function rateLimit('), 'auth and score endpoints should have basic rate limiting');

console.log(JSON.stringify({
    ui: 'ok',
    standardCard: { width: 560, height: 600 },
    standardLeaderboard: { width: 440, height: 600 },
    ocpCard: { width: 840, height: 720 },
    ocpLeaderboard: { width: 340, height: 520 },
    scriptCount: expectedOrder.length
}, null, 2));
