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
const suffix = Date.now().toString(36).slice(-6);
const nickname = `qa${suffix}`.slice(0, 16);
const otherNickname = `qaoth${suffix}`.slice(0, 16);
const adminNickname = `qaadm${suffix}`.slice(0, 16);
const password = `Pw${suffix}123!`;
let issuedToken = '';
const cleanupUsers = new Map();
const child = spawn(process.execPath, ['server.js'], {
    env: {
        ...process.env,
        PORT: String(port),
        REQUEST_LOGS: '0',
        PACK_ADMIN_NICKNAMES: adminNickname,
        KUGNUS_GATEWAY_BASE_URL: '',
        KUGNUS_GATEWAY_API_KEY: '',
        KUGNUS_GATEWAY_MODEL: '',
        OPENAI_API_KEY: '',
        OPENAI_MODEL: ''
    },
    stdio: ['ignore', 'pipe', 'pipe']
});

let output = '';
child.stdout.on('data', chunk => { output += chunk.toString(); });
child.stderr.on('data', chunk => { output += chunk.toString(); });

async function registerAccount(baseUrl, accountNickname, accountPassword) {
    const res = await request(baseUrl, '/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: accountNickname, password: accountPassword })
    });
    assert(res.status === 200 && res.body.token, `register failed for ${accountNickname}: ${res.status} ${res.text}`);
    cleanupUsers.set(res.body.token, { password: accountPassword, withdrawn: false, nickname: accountNickname });
    return {
        id: res.body.user_id,
        nickname: res.body.nickname,
        token: res.body.token,
        headers: {
            Authorization: `Bearer ${res.body.token}`,
            'Content-Type': 'application/json'
        }
    };
}

async function withdrawAccount(baseUrl, user) {
    if (!user?.token) return;
    const cleanup = cleanupUsers.get(user.token);
    if (cleanup?.withdrawn) return;
    const res = await request(baseUrl, '/withdraw', {
        method: 'POST',
        headers: user.headers,
        body: JSON.stringify({ password: cleanup?.password || password })
    });
    assert(res.status === 200 && res.body.ok === true, `withdraw failed for ${user.nickname}: ${res.status} ${res.text}`);
    if (cleanup) cleanup.withdrawn = true;
}

try {
    await waitReady(base);

    const owner = await registerAccount(base, nickname, password);
    const other = await registerAccount(base, otherNickname, password);
    const admin = await registerAccount(base, adminNickname, password);
    issuedToken = owner.token;
    const authHeaders = owner.headers;

    const packMakerBrief = await request(base, '/api/pack-maker/chat/stream', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ message: '되냐', engine: 'kugnus' })
    });
    assert(packMakerBrief.status === 200, `pack maker brief should not require LLM target config: ${packMakerBrief.status} ${packMakerBrief.text}`);
    assert(packMakerBrief.text.includes('"event":"meta"') && packMakerBrief.text.includes('"route":"not-needed"'),
        `pack maker brief should explain that no LLM route was needed: ${packMakerBrief.text}`);
    assert(packMakerBrief.text.includes('PACK BRIEF REQUIRED'), `pack maker brief should return the brief status: ${packMakerBrief.text}`);
    assert(!packMakerBrief.text.includes('"event":"search"'), `pack maker brief should not run search: ${packMakerBrief.text}`);
    assert(!packMakerBrief.text.includes('"event":"error"'), `pack maker brief should not fail as generation: ${packMakerBrief.text}`);

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

    const mineList = await request(base, '/api/packs?scope=mine', {
        headers: { Authorization: owner.token ? `Bearer ${owner.token}` : '' }
    });
    assert(mineList.status === 200 && Array.isArray(mineList.body.packs), `mine pack list failed: ${mineList.status} ${mineList.text}`);
    const minePack = mineList.body.packs.find(pack => pack.id === packId);
    assert(minePack && minePack.status === 'draft' && minePack.itemCount === 10,
        `mine pack list should include draft pack with item count 10: ${mineList.text}`);

    const ownerDetail = await request(base, `/api/packs/${packId}`, {
        headers: { Authorization: `Bearer ${owner.token}` }
    });
    assert(ownerDetail.status === 200 && ownerDetail.body.pack?.items?.length === 10,
        `owner pack detail should include 10 editable items: ${ownerDetail.status} ${ownerDetail.text}`);
    assert(ownerDetail.body.pack.items.every(item => Array.isArray(item.sources)),
        'owner pack detail should normalize item sources to arrays');

    const otherPrivateDetail = await request(base, `/api/packs/${packId}`, {
        headers: { Authorization: `Bearer ${other.token}` }
    });
    assert(otherPrivateDetail.status === 404, `other users should not read draft packs: ${otherPrivateDetail.status} ${otherPrivateDetail.text}`);

    const otherPrivateScore = await request(base, `/api/packs/${packId}/submit-score`, {
        method: 'POST',
        headers: other.headers,
        body: JSON.stringify({ score: 321, wpm: 12, accuracy: 93, difficulty: 'normal' })
    });
    assert(otherPrivateScore.status === 404, `other users should not score private draft packs: ${otherPrivateScore.status} ${otherPrivateScore.text}`);

    const publicBefore = await request(base, '/api/packs?scope=public', {
        headers: { Authorization: `Bearer ${other.token}` }
    });
    assert(publicBefore.status === 200 && Array.isArray(publicBefore.body.packs), `public pack list failed: ${publicBefore.status} ${publicBefore.text}`);
    assert(!publicBefore.body.packs.some(pack => pack.id === packId), 'draft pack should not appear in public pack list');

    const nonAdminReview = await request(base, `/api/packs/${packId}/review`, {
        method: 'POST',
        headers: other.headers,
        body: JSON.stringify({ action: 'approve' })
    });
    assert(nonAdminReview.status === 403, `non-admin review should be forbidden: ${nonAdminReview.status} ${nonAdminReview.text}`);

    const sourcelessPublicSubmit = await request(base, '/api/packs', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
            id: packId,
            title: `QA Withdraw ${suffix}`,
            description: 'withdraw cascade smoke',
            submitForReview: true,
            items: ownerDetail.body.pack.items
        })
    });
    assert(sourcelessPublicSubmit.status === 400,
        `public review should require item sources: ${sourcelessPublicSubmit.status} ${sourcelessPublicSubmit.text}`);

    const sourcedItems = ownerDetail.body.pack.items.map((item, index) => ({
        term: item.term,
        desc: item.desc,
        sources: [{
            title: `QA Source ${index + 1}`,
            url: `https://example.com/codedrop-pack-source-${index + 1}`,
            snippet: `Source evidence for ${item.term}`
        }]
    }));

    const pendingPack = await request(base, '/api/packs', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
            id: packId,
            title: `QA Withdraw ${suffix}`,
            description: 'withdraw cascade smoke',
            submitForReview: true,
            items: sourcedItems
        })
    });
    assert(pendingPack.status === 200 && pendingPack.body.pack?.status === 'pending',
        `pack submit for review should set pending: ${pendingPack.status} ${pendingPack.text}`);

    const otherPendingDetail = await request(base, `/api/packs/${packId}`, {
        headers: { Authorization: `Bearer ${other.token}` }
    });
    assert(otherPendingDetail.status === 404, `pending packs should stay private until approval: ${otherPendingDetail.status} ${otherPendingDetail.text}`);

    const adminApprove = await request(base, `/api/packs/${packId}/review`, {
        method: 'POST',
        headers: admin.headers,
        body: JSON.stringify({ action: 'approve' })
    });
    assert(adminApprove.status === 200 && adminApprove.body.pack?.status === 'approved',
        `admin approval failed: ${adminApprove.status} ${adminApprove.text}`);

    const publicAfter = await request(base, '/api/packs?scope=public', {
        headers: { Authorization: `Bearer ${other.token}` }
    });
    const publicPack = Array.isArray(publicAfter.body.packs)
        ? publicAfter.body.packs.find(pack => pack.id === packId)
        : null;
    assert(publicAfter.status === 200 && publicPack && publicPack.status === 'approved' && publicPack.itemCount === 10,
        `approved pack should appear in public pack list: ${publicAfter.status} ${publicAfter.text}`);

    const otherPublicDetail = await request(base, `/api/packs/${packId}`, {
        headers: { Authorization: `Bearer ${other.token}` }
    });
    assert(otherPublicDetail.status === 200 && otherPublicDetail.body.pack?.items?.length === 10,
        `approved public pack detail should be visible to other users: ${otherPublicDetail.status} ${otherPublicDetail.text}`);

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

    const otherPublicScore = await request(base, `/api/packs/${packId}/submit-score`, {
        method: 'POST',
        headers: other.headers,
        body: JSON.stringify({ score: 321, wpm: 12, accuracy: 93, difficulty: 'normal' })
    });
    assert(otherPublicScore.status === 200, `other user should score approved public pack: ${otherPublicScore.status} ${otherPublicScore.text}`);

    const officialBefore = await request(base, '/leaderboard?difficulty=normal&pack=python');
    assert(officialBefore.status === 200 && Array.isArray(officialBefore.body.top10),
        `official leaderboard failed after custom score: ${officialBefore.status} ${officialBefore.text}`);
    assert(!officialBefore.body.top10.some(row => row.nickname === nickname && row.score === 123),
        'custom pack score leaked into the official Python leaderboard');

    const officialScore = await request(base, '/submit', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ score: 222, wpm: 11, accuracy: 91, difficulty: 'normal', pack: 'python' })
    });
    assert(officialScore.status === 200, `official score submit failed: ${officialScore.status} ${officialScore.text}`);

    const officialAfter = await request(base, '/leaderboard?difficulty=normal&pack=python');
    assert(officialAfter.status === 200 && Array.isArray(officialAfter.body.top10),
        `official leaderboard failed after official score: ${officialAfter.status} ${officialAfter.text}`);
    assert(officialAfter.body.top10.some(row => row.nickname === nickname && row.score === 222 && row.pack === 'python'),
        'official leaderboard did not include the official Python score');

    const customAfterOfficial = await request(base, `/api/packs/${packId}/leaderboard?difficulty=normal`, {
        headers: { Authorization: `Bearer ${issuedToken}` }
    });
    const customAfterRows = Array.isArray(customAfterOfficial.body) ? customAfterOfficial.body : customAfterOfficial.body.top10;
    assert(customAfterOfficial.status === 200 && Array.isArray(customAfterRows),
        `custom leaderboard failed after official score: ${customAfterOfficial.status} ${customAfterOfficial.text}`);
    assert(!customAfterRows.some(row => row.score === 222),
        'official score leaked into the custom pack leaderboard');

    await withdrawAccount(base, owner);

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
            'pack maker brief without LLM target',
            'custom pack save',
            'mine list shape',
            'private draft owner-only detail',
            'private draft hidden from other users',
            'non-admin review rejected',
            'source required for public review',
            'pending pack hidden from public',
            'admin approval',
            'approved pack visible in public list/detail',
            'custom score',
            'custom leaderboard',
            'approved public pack score by another user',
            'custom score excluded from official leaderboard',
            'official score excluded from custom leaderboard',
            'withdraw custom cleanup',
            'old token revoked'
        ]
    }, null, 2));
} catch (err) {
    err.message = `${err.message}\nServer output:\n${output}`;
    throw err;
} finally {
    for (const [token, cleanup] of cleanupUsers.entries()) {
        if (cleanup.withdrawn) continue;
        await request(base, '/withdraw', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: cleanup.password })
        }).catch(() => {});
    }
    child.kill('SIGTERM');
}
