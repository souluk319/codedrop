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

function writeEnvFile(gateway, mode = 'gateway') {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codedrop-release-runtime-'));
    const file = path.join(dir, '.env.release-runtime-test');
    const kugnusEnv = mode === 'openai-alias'
        ? [
            `OPENAI_BASE_URL=${gateway.baseUrl}`,
            'OPENAI_API_KEY=fake-release-runtime-key',
            `OPENAI_MODEL=${KUGNUS_MODEL}`,
            'LLM_BASE_URL=http://100.99.152.52:11434',
            `LLM_MODEL=${KUGNUS_MODEL}`
        ]
        : [
            `KUGNUS_GATEWAY_BASE_URL=${gateway.baseUrl}`,
            'KUGNUS_GATEWAY_API_KEY=fake-release-runtime-key',
            `KUGNUS_GATEWAY_MODEL=${KUGNUS_MODEL}`
        ];

    fs.writeFileSync(file, [
        'DEFAULT_CHAT_ENGINE=kugnus',
        ...kugnusEnv,
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

async function runVerifier(envFile, expectedRoute) {
    const child = spawn(process.execPath, [
        'scripts/verify_release_runtime_route.mjs',
        '--env-file',
        envFile,
        '--expect-route',
        expectedRoute,
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
const envFiles = [
    { mode: 'gateway', expectedRoute: 'gateway', file: writeEnvFile(gateway, 'gateway') },
    { mode: 'openai-alias', expectedRoute: 'openai-env-alias', file: writeEnvFile(gateway, 'openai-alias') }
];

try {
    const results = [];
    for (const envFile of envFiles) {
        const requestCountBefore = gateway.requests.length;
        const result = await runVerifier(envFile.file, envFile.expectedRoute);
        assert(result.status === 0, `release runtime verifier should pass for ${envFile.mode}\nrequests:${JSON.stringify(gateway.requests)}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
        const data = JSON.parse(result.stdout);
        const newRequests = gateway.requests.slice(requestCountBefore);
        assert(data.releaseRuntimeRoute === 'ok', `${envFile.mode}: release runtime verifier should emit ok JSON`);
        assert(data.route === envFile.expectedRoute, `${envFile.mode}: expected route ${envFile.expectedRoute}, got ${data.route}`);
        assert(data.provider === 'openai', `${envFile.mode}: release runtime verifier should prove OpenAI-compatible provider`);
        assert(data.model === KUGNUS_MODEL, `${envFile.mode}: release runtime verifier should prove KUGNUS model`);
        assert(data.testMode === true, `${envFile.mode}: contract run should be clearly marked as test mode`);
        assert(newRequests.some(req => req.auth === 'Bearer fake-release-runtime-key'), `${envFile.mode}: runtime verifier should send the KUGNUS gateway bearer key`);
        assert(newRequests.every(req => req.model === KUGNUS_MODEL), `${envFile.mode}: runtime verifier should use the configured KUGNUS model`);
        results.push({ mode: envFile.mode, route: data.route, requests: newRequests.length });
    }

    console.log(JSON.stringify({
        releaseRuntimeContract: 'ok',
        model: KUGNUS_MODEL,
        results,
        requests: gateway.requests.length
    }, null, 2));
} finally {
    await gateway.close();
    envFiles.forEach(envFile => fs.rmSync(path.dirname(envFile.file), { recursive: true, force: true }));
}
