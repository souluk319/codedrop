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
        LLM_ENDPOINT: '',
        LLM_BASE_URL: 'http://127.0.0.1:9',
        LLM_PROVIDER: 'openai',
        LLM_MODEL: 'smoke-test-model',
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
        learnChatStreamSmoke: 'ok'
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
