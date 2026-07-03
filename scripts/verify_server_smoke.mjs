import { spawn } from 'child_process';

const PORT = 3999;
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

const child = spawn(process.execPath, ['server.js'], {
    env: { ...process.env, PORT: String(PORT), ALLOWED_ORIGINS: `${base},http://localhost:${PORT}` },
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

    console.log(JSON.stringify({
        server: 'ok',
        publicAssets: ['/', '/js/game.js', '/assets/red-hat-logo.svg'],
        protectedPaths: denied.length,
        authSmoke: 'ok'
    }, null, 2));
} finally {
    child.kill('SIGTERM');
}

child.on('exit', () => {});
setTimeout(() => {
    if (!child.killed) child.kill('SIGKILL');
}, 1000).unref();
