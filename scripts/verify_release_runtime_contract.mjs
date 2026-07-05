import { spawn } from 'child_process';
import fs from 'fs';
import http from 'http';
import net from 'net';
import os from 'os';
import path from 'path';

const root = process.cwd();
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
        const body = await readJsonBody(req).catch(err => ({ parseError: err.message }));
        requests.push({
            url: req.url,
            method: req.method,
            auth: req.headers.authorization || '',
            model: body.model || '',
            stream: Boolean(body.stream),
            parseError: body.parseError || ''
        });

        if (req.method !== 'POST' || req.url !== '/v1/chat/completions') {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'not found' }));
            return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            choices: [{ message: { content: 'OK' } }]
        }));
    });

    await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
    return {
        baseUrl: `http://127.0.0.1:${port}/v1`,
        requests,
        close: () => new Promise(resolve => server.close(resolve))
    };
}

function writeEnvFile(gateway) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codedrop-release-runtime-'));
    const file = path.join(dir, '.env.release-runtime-test');
    fs.writeFileSync(file, [
        'DEFAULT_CHAT_ENGINE=kugnus',
        `KUGNUS_GATEWAY_BASE_URL=${gateway.baseUrl}`,
        'KUGNUS_GATEWAY_API_KEY=fake-release-runtime-key',
        `KUGNUS_GATEWAY_MODEL=${KUGNUS_MODEL}`,
        'KUGNUS_PROVIDER=openai',
        'KUGNUS_HEALTH_TIMEOUT_MS=5000',
        'DB_HOST=release-runtime-test',
        'DB_USER=release-runtime-test',
        'DB_PASSWORD=release-runtime-test',
        'DB_NAME=release-runtime-test',
        'SESSION_SECRET=1234567890abcdef1234567890abcdef',
        'ALLOWED_ORIGINS=https://codedrop.example.com',
        'PACK_ADMIN_NICKNAMES=admin'
    ].join('\n'));
    return file;
}

async function runVerifier(envFile) {
    const child = spawn(process.execPath, [
        'scripts/verify_release_runtime_route.mjs',
        '--env-file',
        envFile,
        '--expect-route',
        'gateway',
        '--timeout-ms',
        '30000'
    ], {
        cwd: root,
        env: {
            ...process.env,
            RELEASE_RUNTIME_TEST_MODE: '1',
            RELEASE_RUNTIME_SKIP_READY_DB: '1'
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk.toString(); });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });

    const status = await new Promise(resolve => {
        child.once('exit', code => resolve(code));
    });
    return { status, stdout, stderr };
}

const gateway = await startFakeGateway();
const envFile = writeEnvFile(gateway);

try {
    const result = await runVerifier(envFile);
    assert(result.status === 0, `release runtime verifier should pass in contract mode\nrequests:${JSON.stringify(gateway.requests)}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
    const data = JSON.parse(result.stdout);
    assert(data.releaseRuntimeRoute === 'ok', 'release runtime verifier should emit ok JSON');
    assert(data.route === 'gateway', 'release runtime verifier should prove gateway route');
    assert(data.provider === 'openai', 'release runtime verifier should prove OpenAI-compatible provider');
    assert(data.model === KUGNUS_MODEL, 'release runtime verifier should prove KUGNUS model');
    assert(data.testMode === true, 'contract run should be clearly marked as test mode');
    assert(gateway.requests.some(req => req.auth === 'Bearer fake-release-runtime-key'), 'runtime verifier should send the KUGNUS gateway bearer key');
    assert(gateway.requests.every(req => req.model === KUGNUS_MODEL), 'runtime verifier should use the configured KUGNUS model');

    console.log(JSON.stringify({
        releaseRuntimeContract: 'ok',
        route: data.route,
        provider: data.provider,
        model: data.model,
        requests: gateway.requests.length
    }, null, 2));
} finally {
    await gateway.close();
    fs.rmSync(path.dirname(envFile), { recursive: true, force: true });
}
