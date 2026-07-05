import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import net from 'net';
import path from 'path';
import dotenv from 'dotenv';

const root = process.cwd();
const args = new Map();

for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (!arg.startsWith('--')) continue;
    const [key, inlineValue] = arg.slice(2).split('=');
    if (inlineValue !== undefined) {
        args.set(key, inlineValue);
    } else {
        const next = process.argv[i + 1];
        if (next && !next.startsWith('--')) {
            args.set(key, next);
            i++;
        } else {
            args.set(key, '1');
        }
    }
}

const envFile = args.get('env-file') || process.env.RELEASE_ENV_FILE || '.env.production';
const envPath = path.resolve(root, envFile);
const timeoutMs = Math.max(3000, Math.min(Number(args.get('timeout-ms') || process.env.RELEASE_RUNTIME_TIMEOUT_MS || 30_000), 120_000));
const expectedRoutes = String(args.get('expect-route') || process.env.RELEASE_KUGNUS_EXPECT_ROUTE || 'gateway,openai-env-alias')
    .split(',')
    .map(route => route.trim())
    .filter(Boolean);

function emit(status, message, extra = {}) {
    const payload = {
        releaseRuntimeRoute: status,
        message,
        envFile: fs.existsSync(envPath) ? path.relative(root, envPath) || envFile : envFile,
        ...extra
    };
    const output = JSON.stringify(payload, null, 2);
    if (status === 'ok') console.log(output);
    else console.error(output);
}

function fail(message, extra = {}) {
    emit('fail', message, extra);
    process.exit(1);
}

function checkFail(message, extra = {}) {
    const err = new Error(message);
    err.extra = extra;
    throw err;
}

function loadEnvFile() {
    if (!fs.existsSync(envPath)) fail('Release env file does not exist');
    return dotenv.parse(fs.readFileSync(envPath));
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

async function waitForServer(baseUrl, output) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        try {
            const res = await fetch(`${baseUrl}/health`);
            if (res.ok) return;
        } catch {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
    checkFail('Server did not become healthy with the release env', { serverOutput: output().slice(-5000) });
}

async function json(pathname, baseUrl) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(`${baseUrl}${pathname}`, { signal: controller.signal, cache: 'no-store' });
        const text = await res.text();
        let body = {};
        try {
            body = text ? JSON.parse(text) : {};
        } catch {
            body = { raw: text.slice(0, 500) };
        }
        return { status: res.status, ok: res.ok, body };
    } finally {
        clearTimeout(timeout);
    }
}

const fileEnv = loadEnvFile();
const runtimeEnv = {
    ...process.env,
    ...fileEnv,
    REQUEST_LOGS: '0',
    RELEASE_ENV_FILE: envFile
};

const releaseCheck = spawnSync(process.execPath, ['scripts/check_release_readiness.mjs', '--env-file', envFile], {
    cwd: root,
    encoding: 'utf8',
    env: runtimeEnv
});

if (releaseCheck.status !== 0) {
    fail('Release preflight failed before runtime route verification', {
        stdout: (releaseCheck.stdout || '').trim().slice(-5000),
        stderr: (releaseCheck.stderr || '').trim().slice(-5000)
    });
}

const port = await freePort();
const baseUrl = `http://127.0.0.1:${port}`;
runtimeEnv.PORT = String(port);
runtimeEnv.ALLOWED_ORIGINS = `${runtimeEnv.ALLOWED_ORIGINS || ''},${baseUrl},http://localhost:${port}`
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
    .join(',');

const child = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: runtimeEnv,
    stdio: ['ignore', 'pipe', 'pipe']
});

let output = '';
child.stdout.on('data', chunk => { output += chunk.toString(); });
child.stderr.on('data', chunk => { output += chunk.toString(); });

let runtimeError = null;
try {
    await waitForServer(baseUrl, () => output);

    const ready = await json('/ready', baseUrl);
    if (!ready.ok || ready.body?.db !== 'ok') {
        checkFail('Release runtime DB readiness failed', {
            statusCode: ready.status,
            body: ready.body,
            serverOutput: output.slice(-5000)
        });
    }

    const health = await json('/api/llm/kugnus/health', baseUrl);
    const body = health.body || {};
    if (!health.ok || body.ok !== true) {
        checkFail('Release runtime KUGNUS health failed', {
            statusCode: health.status,
            body,
            serverOutput: output.slice(-5000)
        });
    }

    if (!expectedRoutes.includes(body.route)) {
        checkFail('Release runtime is using the wrong KUGNUS route', {
            expectedRoutes,
            route: body.route || '',
            provider: body.provider || '',
            model: body.model || ''
        });
    }

    emit('ok', 'Release runtime is using the configured KUGNUS gateway route', {
        route: body.route,
        provider: body.provider,
        model: body.model,
        ready: ready.body,
        baseUrl
    });
} catch (err) {
    runtimeError = err;
} finally {
    if (child.exitCode === null && !child.killed) child.kill('SIGTERM');
    await new Promise(resolve => {
        if (child.exitCode !== null) {
            resolve();
            return;
        }
        const done = setTimeout(resolve, 1500);
        child.once('exit', () => {
            clearTimeout(done);
            resolve();
        });
    });
}

if (runtimeError) {
    fail(runtimeError.message, runtimeError.extra || { serverOutput: output.slice(-5000) });
}
