import { spawn } from 'child_process';
import net from 'net';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function freePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address();
            server.close(() => resolve(port));
        });
        server.on('error', reject);
    });
}

async function waitReady(base) {
    const started = Date.now();
    while (Date.now() - started < 10_000) {
        try {
            const res = await fetch(`${base}/ready`);
            const json = await res.json().catch(() => ({}));
            if (res.ok && json.db === 'ok') return json;
        } catch (err) {
            await new Promise(resolve => setTimeout(resolve, 250));
        }
        await new Promise(resolve => setTimeout(resolve, 250));
    }

    throw new Error('server/db did not become ready');
}

async function request(base, path, options = {}) {
    const res = await fetch(`${base}${path}`, options);
    const text = await res.text();
    let body = {};
    try {
        body = text ? JSON.parse(text) : {};
    } catch (err) {
        body = { raw: text };
    }
    return { status: res.status, body, text };
}

const port = await freePort();
const base = `http://127.0.0.1:${port}`;
let issuedToken = '';
let issuedPassword = '';
let issuedPackId = 0;
let withdrew = false;
const child = spawn(process.execPath, ['server.js'], {
    env: {
        ...process.env,
        PORT: String(port),
        REQUEST_LOGS: '0'
    },
    stdio: ['ignore', 'pipe', 'pipe']
});

let output = '';
child.stdout.on('data', chunk => { output += chunk.toString(); });
child.stderr.on('data', chunk => { output += chunk.toString(); });

try {
    await waitReady(base);

    const suffix = Date.now().toString(36).slice(-6);
    const nickname = `qa${suffix}`.slice(0, 16);
    const password = `Pw${suffix}123!`;
    issuedPassword = password;

    const register = await request(base, '/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, password })
    });
    assert(register.status === 200 && register.body.token, `register failed: ${register.status} ${register.text}`);
    issuedToken = register.body.token;

    const authHeaders = {
        Authorization: `Bearer ${issuedToken}`,
        'Content-Type': 'application/json'
    };

    const savePack = await request(base, '/api/packs', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
            title: `QA Withdraw ${suffix}`,
            description: 'withdraw cascade smoke',
            submitForReview: false,
            items: Array.from({ length: 10 }, (_, index) => ({
                term: `부품${index + 1}`,
                desc: `설명 ${index + 1}`,
                sources: []
            }))
        })
    });
    assert(savePack.status === 200 && savePack.body.pack?.id, `custom pack save failed: ${savePack.status} ${savePack.text}`);

    const packId = savePack.body.pack.id;
    issuedPackId = packId;
    const score = await request(base, `/api/packs/${packId}/submit-score`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ score: 123, wpm: 10, accuracy: 90, difficulty: 'normal' })
    });
    assert(score.status === 200, `custom score submit failed: ${score.status} ${score.text}`);

    const leaderboard = await request(base, `/api/packs/${packId}/leaderboard?difficulty=normal`, {
        headers: { Authorization: `Bearer ${issuedToken}` }
    });
    const leaderboardRows = Array.isArray(leaderboard.body) ? leaderboard.body : leaderboard.body.top10;
    assert(leaderboard.status === 200 && Array.isArray(leaderboardRows), `custom leaderboard failed: ${leaderboard.status} ${leaderboard.text}`);
    assert(leaderboardRows.some(row => row.score === 123), 'custom leaderboard did not include submitted score');

    const withdraw = await request(base, '/withdraw', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ password })
    });
    assert(withdraw.status === 200 && withdraw.body.ok === true, `withdraw failed: ${withdraw.status} ${withdraw.text}`);
    withdrew = true;

    const oldSession = await request(base, '/api/session', {
        headers: { Authorization: `Bearer ${issuedToken}` }
    });
    assert(oldSession.status === 401 && oldSession.body.code === 'SESSION_REVOKED',
        `old token should be revoked after withdraw: ${oldSession.status} ${oldSession.text}`);

    const oldPack = await request(base, `/api/packs/${packId}`, {
        headers: { Authorization: `Bearer ${issuedToken}` }
    });
    assert(oldPack.status === 401, `deleted user's pack should not be accessible: ${oldPack.status} ${oldPack.text}`);

    console.log(JSON.stringify({
        dbE2e: 'ok',
        nickname,
        packId,
        checks: [
            'register',
            'custom pack save',
            'custom score',
            'custom leaderboard',
            'withdraw custom cleanup',
            'old token revoked'
        ]
    }, null, 2));
} catch (err) {
    err.message = `${err.message}\nServer output:\n${output}`;
    throw err;
} finally {
    if (!withdrew && issuedToken && issuedPassword) {
        await request(base, '/withdraw', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${issuedToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: issuedPassword })
        }).catch(() => {});
    }
    child.kill('SIGTERM');
}
