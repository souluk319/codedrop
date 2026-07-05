import { spawn } from 'child_process';
import net from 'net';

const PORT = Number(process.env.VERIFY_SERVER_PORT || await freePort());
const base = `http://127.0.0.1:${PORT}`;

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

async function request(path, options = {}) {
    const res = await fetch(base + path, options);
    const text = await res.text();
    return { status: res.status, text, headers: res.headers };
}

function assertNoStore(headers, label) {
    const cacheControl = headers.get('cache-control') || '';
    assert(cacheControl.includes('no-store'), `${label} should use no-store cache headers`);
    assert((headers.get('pragma') || '').includes('no-cache'), `${label} should use no-cache pragma`);
    assert((headers.get('expires') || '') === '0', `${label} should disable expires caching`);
}

function extractLocalScripts(html) {
    const scripts = [];
    const re = /<script\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
    let match;
    while ((match = re.exec(html)) !== null) {
        const src = match[1];
        if (/^https?:\/\//i.test(src)) continue;
        scripts.push(src.startsWith('/') ? src : `/${src}`);
    }
    return scripts;
}

async function waitForServer() {
    const started = Date.now();
    while (Date.now() - started < 7000) {
        try {
            const res = await fetch(base + '/health');
            if (res.ok) return;
        } catch (e) {
            await new Promise(resolve => setTimeout(resolve, 150));
        }
    }
    throw new Error('server did not become ready');
}

async function freePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.unref();
        server.on('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address();
            server.close(() => resolve(port));
        });
    });
}

async function verifyProductionRuntimeGuard() {
    const guard = spawn(process.execPath, ['server.js'], {
        env: {
            ...process.env,
            NODE_ENV: 'production',
            PORT: String(await freePort()),
            SESSION_SECRET: 'codedrop-local-dev-session-secret-change-for-release',
            ALLOWED_ORIGINS: 'http://localhost:3001',
            DB_HOST: 'db.example.com',
            DB_USER: 'codedrop',
            DB_PASSWORD: 'secret',
            DB_NAME: 'codedrop',
            KUGNUS_GATEWAY_BASE_URL: 'http://127.0.0.1:11434/v1',
            KUGNUS_GATEWAY_API_KEY: 'kugnus-key',
            KUGNUS_GATEWAY_MODEL: 'gemma4:12b-it-qat',
            OPENAI_API_KEY: 'fallback-key',
            OPENAI_MODEL: 'gpt-4o'
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    let guardOutput = '';
    guard.stdout.on('data', chunk => { guardOutput += chunk.toString(); });
    guard.stderr.on('data', chunk => { guardOutput += chunk.toString(); });

    const code = await new Promise(resolve => {
        const timer = setTimeout(() => {
            guard.kill('SIGKILL');
            resolve(null);
        }, 5000);
        guard.on('close', exitCode => {
            clearTimeout(timer);
            resolve(exitCode);
        });
    });

    assert(code !== 0, 'production server should refuse unsafe runtime env');
    assert(guardOutput.includes('Unsafe production configuration'), 'production guard should explain unsafe config');
    assert(guardOutput.includes('SESSION_SECRET'), 'production guard should reject local session secret');
    assert(guardOutput.includes('ALLOWED_ORIGINS'), 'production guard should reject non-public origins');
    assert(guardOutput.includes('KUGNUS_GATEWAY_BASE_URL'), 'production guard should reject private KUGNUS gateway URLs');
    assert(guardOutput.includes('OPENAI_MODEL'), 'production guard should reject non-mini GPT fallback models');
}

const child = spawn(process.execPath, ['server.js'], {
    env: {
        ...process.env,
        PORT: String(PORT),
        ALLOWED_ORIGINS: `${base},http://localhost:${PORT}`,
        KUGNUS_GATEWAY_BASE_URL: 'http://127.0.0.1:9/v1',
        KUGNUS_GATEWAY_API_KEY: 'smoke-test-key',
        KUGNUS_GATEWAY_MODEL: 'smoke-test-model',
        LLM_TIMEOUT_MS: '1000'
    },
    stdio: ['ignore', 'pipe', 'pipe']
});

let output = '';
child.stdout.on('data', chunk => { output += chunk.toString(); });
child.stderr.on('data', chunk => { output += chunk.toString(); });

try {
    await waitForServer();

    const health = await request('/health');
    assert(health.status === 200 && health.text.includes('"server":"ok"'), '/health should be live');

    const kugnusHealth = await request('/api/llm/kugnus/health');
    assert(kugnusHealth.status === 200, '/api/llm/kugnus/health should return stable JSON even when KUGNUS is offline');
    assert(kugnusHealth.text.includes('"engine":"kugnus"'), '/api/llm/kugnus/health should identify the KUGNUS engine');
    assert(kugnusHealth.text.includes('"ok":false'), '/api/llm/kugnus/health should report offline KUGNUS as ok:false in smoke');

    const root = await request('/');
    assert(root.status === 200 && root.text.includes('CodeDrop: Neon Cyberpunk'), '/ should serve the app shell');
    assertNoStore(root.headers, '/');
    assert(root.text.includes('id="pack-maker-screen"'), '/ should include the Pack Maker screen');
    assert(root.text.includes('id="keyboard-test-screen"'), '/ should include the Keyboard Test screen');

    const localScripts = extractLocalScripts(root.text);
    const requiredScripts = [
        '/js/word_packs.js',
        '/js/scenario_packs.js',
        '/js/lab_packs.js',
        '/js/lesson_packs.js',
        '/js/study_stats.js',
        '/js/game.js',
        '/js/scenario_mode.js',
        '/js/lab_mode.js',
        '/js/learn_mode.js',
        '/js/dashboard.js',
        '/js/pack_maker.js',
        '/js/keyboard_test.js'
    ];
    for (const script of requiredScripts) {
        assert(localScripts.includes(script), `${script} should be referenced by index.html`);
    }
    for (const script of localScripts) {
        const res = await request(script);
        assert(res.status === 200, `${script} should be publicly served`);
        assertNoStore(res.headers, script);
        assert(res.text.trim().length > 0, `${script} should not be empty`);
    }

    const gameJs = await request('/js/game.js');
    assert(gameJs.status === 200 && gameJs.text.includes('CodeDrop - Cyberpunk Edition'), '/js/game.js should be public');

    const asset = await request('/assets/red-hat-logo.svg');
    assert(asset.status === 200 && asset.text.includes('<svg'), 'red hat SVG should be public');

    const denied = ['/server.js', '/package.json', '/scripts/verify_db.js', '/.env'];
    for (const path of denied) {
        const res = await request(path);
        assert(res.status === 404, `${path} should not be publicly served`);
    }

    const invalidLeaderboard = await request('/leaderboard?difficulty=bogus&pack=python');
    assert(invalidLeaderboard.status === 400, 'invalid leaderboard filters should be rejected before DB access');

    const unauthSubmit = await request('/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 1, score: 999, difficulty: 'normal', pack: 'python' })
    });
    assert(unauthSubmit.status === 401, '/submit should require a bearer token');

    const unauthPackChat = await request('/api/pack-maker/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'linux network terms', engine: 'kugnus' })
    });
    assert(unauthPackChat.status === 401, '/api/pack-maker/chat/stream should require a bearer token');

    const unauthPackSave = await request('/api/packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Linux Net', items: [] })
    });
    assert(unauthPackSave.status === 401, '/api/packs should require a bearer token');

    const unauthPackList = await request('/api/packs?scope=mine');
    assert(unauthPackList.status === 401, '/api/packs list should require a bearer token');

    const unauthPackScore = await request('/api/packs/1/submit-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: 100, difficulty: 'normal' })
    });
    assert(unauthPackScore.status === 401, '/api/packs/:id/submit-score should require a bearer token');

    const emptyLearnChat = await request('/api/learn-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '' })
    });
    assert(emptyLearnChat.status === 400, '/api/learn-chat should reject empty messages before LLM access');

    const emptyLearnChatStream = await request('/api/learn-chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '' })
    });
    assert(emptyLearnChatStream.status === 400, '/api/learn-chat/stream should reject empty messages before LLM access');

    const invalidLearnChatStream = await request('/api/learn-chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '테스트', engine: 'gpt-4o' })
    });
    assert(invalidLearnChatStream.status === 400, '/api/learn-chat/stream should reject invalid engines');

    const streamError = await request('/api/learn-chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '스트림 스모크 테스트', engine: 'kugnus' })
    });
    assert(streamError.status === 200, '/api/learn-chat/stream should keep stream responses HTTP 200 after validation');
    assert(streamError.headers.get('content-type').includes('application/x-ndjson'), '/api/learn-chat/stream should use NDJSON');
    assert(streamError.text.includes('"event":"meta"'), '/api/learn-chat/stream should emit a meta event');
    assert(streamError.text.includes('"event":"error"') || streamError.text.includes('"event":"delta"') || streamError.text.includes('"event":"done"'),
        '/api/learn-chat/stream should emit at least error/delta/done after meta');

    await verifyProductionRuntimeGuard();

    console.log(JSON.stringify({
        port: PORT,
        server: 'ok',
        publicAssets: ['/', ...localScripts, '/assets/red-hat-logo.svg'],
        protectedPaths: denied.length,
        authSmoke: 'ok',
        learnChatSmoke: 'ok',
        learnChatStreamSmoke: 'ok',
        packMakerSmoke: 'ok',
        productionRuntimeGuard: 'ok'
    }, null, 2));
} catch (err) {
    err.message = `${err.message}\nServer output:\n${output}`;
    throw err;
} finally {
    child.kill('SIGTERM');
}

child.on('exit', () => {});
setTimeout(() => {
    if (!child.killed) child.kill('SIGKILL');
}, 1000).unref();
