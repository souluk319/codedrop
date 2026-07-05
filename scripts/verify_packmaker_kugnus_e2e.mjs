import { spawn } from 'child_process';
import net from 'net';

const BASE_PROMPT = '자동차 정비소에 취직하는데 한글로된 자동차정비에 자주등장하는 자동차부품 단어 50개만 뽑아서 카 파츠 팩 만들어줘';
const BRIEF_PROMPT = '되냐';
const EXPECTED_TITLE = '카 파츠 팩';
const EXPECTED_COUNT = 50;
const MAX_WAIT_MS = Number(process.env.PACKMAKER_KUGNUS_E2E_TIMEOUT_MS || 360_000);

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

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitReady(base) {
    const started = Date.now();
    while (Date.now() - started < 15_000) {
        try {
            const res = await fetch(`${base}/ready`);
            const json = await res.json().catch(() => ({}));
            if (res.ok && json.db === 'ok') return json;
        } catch {
            // Retry until timeout.
        }
        await wait(250);
    }

    throw new Error('server/db did not become ready');
}

async function requestJson(base, path, options = {}) {
    const res = await fetch(`${base}${path}`, options);
    const text = await res.text();
    let body = {};
    try {
        body = text ? JSON.parse(text) : {};
    } catch {
        body = { raw: text };
    }
    return { status: res.status, body, text };
}

function jsonHeaders(token) {
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
}

function koreanRatio(items) {
    if (!items.length) return 0;
    return items.filter(item => /[가-힣]/.test(item.term || '')).length / items.length;
}

async function readNdjsonStream(res, onEvent) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const consume = line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        onEvent(JSON.parse(trimmed));
    };

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let index;
        while ((index = buffer.indexOf('\n')) !== -1) {
            consume(buffer.slice(0, index));
            buffer = buffer.slice(index + 1);
        }
    }

    buffer += decoder.decode();
    if (buffer.trim()) consume(buffer);
}

async function packMakerStream(base, token, message) {
    const started = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MAX_WAIT_MS);
    const events = [];
    let draft = null;
    let done = false;
    let deltaChars = 0;
    let route = '';

    try {
        const res = await fetch(`${base}/api/pack-maker/chat/stream`, {
            method: 'POST',
            headers: jsonHeaders(token),
            signal: controller.signal,
            body: JSON.stringify({
                message,
                engine: 'kugnus',
                history: [],
                draft: { title: '', description: '', items: [] }
            })
        });

        if (res.status !== 200) {
            throw new Error(`pack maker stream failed: ${res.status} ${await res.text()}`);
        }

        await readNdjsonStream(res, evt => {
            events.push(evt);
            if (evt.event === 'meta') {
                assert(evt.engine === 'kugnus', `expected KUGNUS engine, got ${evt.engine}`);
                assert(typeof evt.route === 'string' && evt.route.length > 0, 'KUGNUS stream meta should expose route');
                route = evt.route;
                console.log(`[packmaker] meta provider=${evt.provider || '-'} route=${evt.route || '-'} model=${evt.model || '-'} engine=${evt.engine}`);
            }
            if (evt.event === 'status') {
                console.log(`[packmaker] ${Math.round((Date.now() - started) / 1000)}s status=${evt.text || ''}`);
            }
            if (evt.event === 'search') {
                console.log(`[packmaker] ${Math.round((Date.now() - started) / 1000)}s search=${Array.isArray(evt.results) ? evt.results.length : 0}`);
            }
            if (evt.event === 'delta') deltaChars += String(evt.text || '').length;
            if (evt.event === 'draft') {
                draft = evt.draft;
                console.log(`[packmaker] ${Math.round((Date.now() - started) / 1000)}s draft=${draft?.title || '-'} items=${draft?.items?.length || 0}`);
            }
            if (evt.event === 'error') throw new Error(evt.error || 'Pack Maker stream error');
            if (evt.event === 'done') {
                done = true;
                console.log(`[packmaker] ${Math.round((Date.now() - started) / 1000)}s done deltaChars=${deltaChars}`);
            }
        });

        assert(done, 'pack maker stream ended without done event');
        return {
            seconds: Math.round((Date.now() - started) / 1000),
            events,
            draft,
            route,
            deltaChars
        };
    } finally {
        clearTimeout(timeout);
    }
}

const port = await freePort();
const base = `http://127.0.0.1:${port}`;
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

    const health = await requestJson(base, '/api/llm/kugnus/health');
    assert(health.status === 200 && health.body.ok === true,
        `KUGNUS health failed: ${health.status} ${health.text}`);
    assert(typeof health.body.route === 'string' && health.body.route.length > 0,
        `KUGNUS health did not expose route: ${health.text}`);

    const suffix = Date.now().toString(36).slice(-7);
    const nickname = `qa_pm_${suffix}`.slice(0, 16);
    const password = `Pw${suffix}123!`;

    const register = await requestJson(base, '/register', {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ nickname, password })
    });
    assert(register.status === 200 && register.body.token,
        `register failed: ${register.status} ${register.text}`);

    const token = register.body.token;

    const brief = await packMakerStream(base, token, BRIEF_PROMPT);
    const briefEvents = brief.events.map(evt => evt.event);
    assert(brief.events.some(evt => evt.event === 'status' && evt.text === 'PACK BRIEF REQUIRED'),
        `brief prompt did not return PACK BRIEF REQUIRED: ${JSON.stringify(brief.events)}`);
    assert(!briefEvents.includes('search'), 'brief prompt should not start search');
    assert(!briefEvents.includes('draft'), 'brief prompt should not produce a draft');

    const generated = await packMakerStream(base, token, BASE_PROMPT);
    assert(generated.draft, 'realistic prompt did not produce a draft');
    assert(generated.draft.title === EXPECTED_TITLE,
        `expected title ${EXPECTED_TITLE}, got ${generated.draft.title}`);
    assert(generated.draft.items.length === EXPECTED_COUNT,
        `expected ${EXPECTED_COUNT} items, got ${generated.draft.items.length}`);

    const terms = generated.draft.items.map(item => String(item.term || '').trim().toLowerCase());
    const duplicates = terms.filter((term, index) => term && terms.indexOf(term) !== index);
    assert(duplicates.length === 0, `duplicate terms: ${duplicates.slice(0, 5).join(', ')}`);
    assert(koreanRatio(generated.draft.items) >= 0.9, 'generated terms are not predominantly Korean');

    const save = await requestJson(base, '/api/packs', {
        method: 'POST',
        headers: jsonHeaders(token),
        body: JSON.stringify({
            title: generated.draft.title,
            description: generated.draft.description,
            items: generated.draft.items,
            submitForReview: false
        })
    });
    assert(save.status === 200 && save.body.pack?.id,
        `pack save failed: ${save.status} ${save.text}`);

    const packId = save.body.pack.id;
    const score = await requestJson(base, `/api/packs/${packId}/submit-score`, {
        method: 'POST',
        headers: jsonHeaders(token),
        body: JSON.stringify({ score: 321, wpm: 12, accuracy: 93, difficulty: 'normal' })
    });
    assert(score.status === 200 && score.body.ok === true,
        `custom score failed: ${score.status} ${score.text}`);

    const leaderboard = await requestJson(base, `/api/packs/${packId}/leaderboard?difficulty=normal`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    assert(leaderboard.status === 200 && Array.isArray(leaderboard.body.top10),
        `custom leaderboard failed: ${leaderboard.status} ${leaderboard.text}`);
    assert(leaderboard.body.top10.some(row => row.score === 321),
        'custom leaderboard did not include the KUGNUS-generated pack score');

    console.log(JSON.stringify({
        packMakerKugnusE2e: 'ok',
        nickname,
        packId,
        health: {
            provider: health.body.provider,
            route: health.body.route,
            model: health.body.model
        },
        briefEvents,
        generated: {
            seconds: generated.seconds,
            title: generated.draft.title,
            itemCount: generated.draft.items.length,
            route: generated.route,
            duplicates: duplicates.length,
            koreanRatio: koreanRatio(generated.draft.items),
            deltaChars: generated.deltaChars
        },
        checks: [
            'KUGNUS health',
            'brief prompt gated without search',
            'realistic 50-item prompt generated by KUGNUS',
            'private custom pack save',
            'custom pack score',
            'custom pack leaderboard'
        ]
    }, null, 2));
} catch (err) {
    throw new Error(`${err.message}\nServer output:\n${output}`);
} finally {
    child.kill('SIGTERM');
}
