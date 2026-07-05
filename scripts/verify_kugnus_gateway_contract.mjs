import http from 'http';
import net from 'net';
import { spawn } from 'child_process';

const KUGNUS_MODEL = 'gemma4:12b-it-qat';

function assert(condition, message) {
    if (!condition) throw new Error(message);
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

async function readJsonBody(req) {
    let raw = '';
    for await (const chunk of req) raw += chunk.toString();
    return raw ? JSON.parse(raw) : {};
}

async function startFakeGateway() {
    const port = await freePort();
    const requests = [];

    const server = http.createServer(async (req, res) => {
        if (req.method !== 'POST' || req.url !== '/v1/chat/completions') {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'not found' }));
            return;
        }

        try {
            const body = await readJsonBody(req);
            requests.push({
                url: req.url,
                auth: req.headers.authorization || '',
                model: body.model,
                stream: Boolean(body.stream)
            });

            if (body.stream) {
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream; charset=utf-8',
                    'Cache-Control': 'no-cache'
                });
                res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: 'gateway ' } }] })}\n\n`);
                res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: 'ok' } }] })}\n\n`);
                res.write('data: [DONE]\n\n');
                res.end();
                return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                choices: [{ message: { content: 'OK' } }]
            }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
    });

    await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
    return {
        baseUrl: `http://127.0.0.1:${port}/v1`,
        requests,
        close: () => new Promise(resolve => server.close(resolve))
    };
}

async function waitForServer(base) {
    const started = Date.now();
    while (Date.now() - started < 7000) {
        try {
            const res = await fetch(`${base}/health`);
            if (res.ok) return;
        } catch (err) {
            await new Promise(resolve => setTimeout(resolve, 150));
        }
    }
    throw new Error(`server did not become ready: ${base}`);
}

async function startCodeDrop(env) {
    const port = await freePort();
    const base = `http://127.0.0.1:${port}`;
    const child = spawn(process.execPath, ['server.js'], {
        env: {
            ...process.env,
            PORT: String(port),
            ALLOWED_ORIGINS: `${base},http://localhost:${port}`,
            LLM_TIMEOUT_MS: '3000',
            KUGNUS_HEALTH_TIMEOUT_MS: '3000',
            ...env
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = '';
    child.stdout.on('data', chunk => { output += chunk.toString(); });
    child.stderr.on('data', chunk => { output += chunk.toString(); });

    try {
        await waitForServer(base);
    } catch (err) {
        child.kill('SIGTERM');
        err.message = `${err.message}\nServer output:\n${output}`;
        throw err;
    }

    return {
        base,
        output: () => output,
        close: async () => {
            child.kill('SIGTERM');
            await new Promise(resolve => child.once('exit', resolve));
        }
    };
}

async function requestJson(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text();
    let data = {};
    try {
        data = text ? JSON.parse(text) : {};
    } catch (err) {
        throw new Error(`invalid JSON from ${url}: ${text}`);
    }
    return { res, text, data };
}

async function verifyExplicitKugnusGateway(gateway) {
    const app = await startCodeDrop({
        KUGNUS_GATEWAY_BASE_URL: gateway.baseUrl,
        KUGNUS_GATEWAY_API_KEY: 'fake-kugnus-key',
        KUGNUS_GATEWAY_MODEL: KUGNUS_MODEL,
        KUGNUS_PROVIDER: 'openai',
        OPENAI_API_KEY: 'fake-gpt-fallback-key',
        OPENAI_MODEL: 'gpt-5.4-mini',
        LLM_PROVIDER: ''
    });

    try {
        const health = await requestJson(`${app.base}/api/llm/kugnus/health`);
        assert(health.res.status === 200, 'KUGNUS health should return HTTP 200');
        assert(health.data.ok === true, 'KUGNUS gateway health should be ok:true');
        assert(health.data.provider === 'openai', 'KUGNUS gateway should be treated as OpenAI-compatible');
        assert(health.data.route === 'gateway', 'KUGNUS gateway health should expose gateway routing');
        assert(health.data.model === KUGNUS_MODEL, 'KUGNUS gateway should use the configured model');

        const stream = await fetch(`${app.base}/api/learn-chat/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ engine: 'kugnus', message: 'gateway contract test' })
        });
        const text = await stream.text();
        assert(stream.status === 200, 'learn-chat stream should accept explicit KUGNUS gateway');
        assert(text.includes('"event":"meta"'), 'stream should emit meta');
        assert(text.includes('"provider":"openai"'), 'stream meta should identify OpenAI-compatible gateway');
        assert(text.includes('"event":"delta"'), 'stream should emit deltas from gateway SSE');
        assert(text.includes('gateway ok'), 'stream should surface gateway response text');

        assert(gateway.requests.some(req => req.auth === 'Bearer fake-kugnus-key'), 'gateway calls should include the KUGNUS bearer key');
        assert(gateway.requests.every(req => req.model === KUGNUS_MODEL), 'gateway calls should use the KUGNUS model');
    } catch (err) {
        err.message = `${err.message}\nServer output:\n${app.output()}`;
        throw err;
    } finally {
        await app.close();
    }
}

async function verifyOpenAiEnvDoesNotConfigureKugnus(gateway) {
    const app = await startCodeDrop({
        KUGNUS_GATEWAY_BASE_URL: '',
        KUGNUS_GATEWAY_API_KEY: '',
        KUGNUS_GATEWAY_MODEL: '',
        KUGNUS_PROVIDER: '',
        LLM_API_KEY: 'stale-direct-key-must-not-win',
        LOCAL_LLM_API_KEY: 'stale-local-key-must-not-win',
        LLM_PROVIDER: '',
        OPENAI_API_KEY: 'fake-openai-style-kugnus-key',
        OPENAI_MODEL: KUGNUS_MODEL
    });

    try {
        const requestCountBefore = gateway.requests.length;
        const health = await requestJson(`${app.base}/api/llm/kugnus/health`);
        const newRequests = gateway.requests.slice(requestCountBefore);
        assert(health.res.status === 200, 'OPENAI_* fallback-only env should return stable HTTP 200 JSON');
        assert(health.data.ok === false, 'OPENAI_* fallback-only env must not configure KUGNUS');
        assert(String(health.data.reason || '').includes('KUGNUS AI is not configured'),
            `OPENAI_* fallback-only env should report missing KUGNUS gateway env, got ${health.text}`);
        assert(newRequests.length === 0, 'OPENAI_* fallback-only env must not call the KUGNUS gateway');
        assert(!gateway.requests.some(req => req.auth === 'Bearer stale-direct-key-must-not-win' || req.auth === 'Bearer stale-local-key-must-not-win'),
            'OPENAI_* fallback-only env must not reuse stale direct/local KUGNUS keys');
    } catch (err) {
        err.message = `${err.message}\nServer output:\n${app.output()}`;
        throw err;
    } finally {
        await app.close();
    }
}

async function verifyCanonicalGatewayRequired(gateway) {
    const app = await startCodeDrop({
        KUGNUS_GATEWAY_BASE_URL: '',
        KUGNUS_GATEWAY_API_KEY: '',
        KUGNUS_GATEWAY_MODEL: '',
        KUGNUS_PROVIDER: '',
        LLM_API_KEY: 'stale-direct-key-must-not-win',
        LLM_PROVIDER: 'openai',
        OPENAI_API_KEY: '',
        OPENAI_MODEL: KUGNUS_MODEL
    });

    try {
        const requestCountBefore = gateway.requests.length;
        const health = await requestJson(`${app.base}/api/llm/kugnus/health`);
        const newRequests = gateway.requests.slice(requestCountBefore);
        assert(health.res.status === 200, 'missing canonical gateway env should return stable HTTP 200 JSON');
        assert(health.data.ok === false, 'missing canonical gateway env should not be considered healthy');
        assert(String(health.data.reason || '').includes('KUGNUS AI is not configured'),
            `missing canonical gateway env should report the KUGNUS config problem, got ${health.text}`);
        assert(!newRequests.some(req => req.auth === 'Bearer stale-direct-key-must-not-win'),
            'missing canonical gateway env must not silently fall back to stale direct/local KUGNUS keys');
    } catch (err) {
        err.message = `${err.message}\nServer output:\n${app.output()}`;
        throw err;
    } finally {
        await app.close();
    }
}

const gateway = await startFakeGateway();
try {
    await verifyExplicitKugnusGateway(gateway);
    await verifyOpenAiEnvDoesNotConfigureKugnus(gateway);
    await verifyCanonicalGatewayRequired(gateway);
    console.log(JSON.stringify({
        gateway: 'ok',
        model: KUGNUS_MODEL,
        requests: gateway.requests.length,
        explicitKugnusGateway: 'ok',
        openAiEnvRole: 'GPT fallback only',
        canonicalGatewayRequired: 'ok'
    }, null, 2));
} finally {
    await gateway.close();
}
