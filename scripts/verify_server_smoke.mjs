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

const child = spawn(process.execPath, ['server.js'], {
    env: {
        ...process.env,
        PORT: String(PORT),
        ALLOWED_ORIGINS: `${base},http://localhost:${PORT}`,
        KUGNUS_GATEWAY_BASE_URL: 'http://127.0.0.1:9/v1',
        KUGNUS_GATEWAY_API_KEY: 'smoke-test-key',
        KUGNUS_MODEL: 'smoke-test-model',
        LLM_ENDPOINT: '',
        LLM_BASE_URL: '',
        LLM_PROVIDER: 'openai',
        LLM_MODEL: '',
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

    console.log(JSON.stringify({
        port: PORT,
        server: 'ok',
        publicAssets: ['/', '/js/game.js', '/assets/red-hat-logo.svg'],
        protectedPaths: denied.length,
        authSmoke: 'ok',
        learnChatSmoke: 'ok',
        learnChatStreamSmoke: 'ok',
        packMakerSmoke: 'ok'
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
