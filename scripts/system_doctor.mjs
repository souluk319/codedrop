import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const valueArg = new Map();

for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (!arg.startsWith('--')) continue;
    const [key, inlineValue] = arg.slice(2).split('=');
    if (inlineValue !== undefined) valueArg.set(key, inlineValue);
    else if (process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) {
        valueArg.set(key, process.argv[i + 1]);
        i++;
    }
}

const explicitEnvFile = valueArg.get('env-file') || process.env.DOCTOR_ENV_FILE || '';
const envFiles = explicitEnvFile ? [explicitEnvFile] : ['.env.local', '.env'];
const envPaths = envFiles
    .map(file => path.resolve(root, file))
    .filter(file => fs.existsSync(file));
if (envPaths.length) dotenv.config({ path: envPaths, override: Boolean(explicitEnvFile), quiet: true });

const baseUrl = (valueArg.get('base-url') || process.env.CODEDROP_DOCTOR_BASE_URL || 'http://localhost:3001').replace(/\/+$/, '');
const deep = args.has('--deep');
const packmaker = args.has('--packmaker');
const strict = args.has('--strict');
const skipRelease = args.has('--skip-release');
const timeoutMs = Math.max(2000, Math.min(Number(valueArg.get('timeout-ms') || process.env.CODEDROP_DOCTOR_TIMEOUT_MS || 10_000), 120_000));

const checks = [];

function envValue(name) {
    return String(process.env[name] || '').trim();
}

function hasEnv(name) {
    return Boolean(envValue(name));
}

function firstEnv(names) {
    for (const name of names) {
        const current = envValue(name);
        if (current) return current;
    }
    return '';
}

const KUGNUS_GATEWAY_BASE_NAMES = [
    'KUGNUS_GATEWAY_BASE_URL'
];

const KUGNUS_GATEWAY_KEY_NAMES = [
    'KUGNUS_GATEWAY_API_KEY'
];

const KUGNUS_GATEWAY_MODEL_NAMES = [
    'KUGNUS_GATEWAY_MODEL'
];

function addCheck(name, status, detail = {}) {
    checks.push({ name, status, ...detail });
}

function command(name, cmd, cmdArgs, options = {}) {
    const started = Date.now();
    const result = spawnSync(cmd, cmdArgs, {
        cwd: root,
        encoding: 'utf8',
        timeout: options.timeoutMs || timeoutMs,
        env: { ...process.env, FORCE_COLOR: '0', ...(options.env || {}) }
    });
    return {
        name,
        status: result.status === 0 ? 'PASS' : (options.blockedOnFailure ? 'BLOCKED' : 'FAIL'),
        exitCode: result.status,
        elapsedMs: Date.now() - started,
        stdout: (result.stdout || '').trim(),
        stderr: (result.stderr || '').trim()
    };
}

function commandStreaming(name, cmd, cmdArgs, options = {}) {
    const started = Date.now();
    const timeoutLimit = options.timeoutMs || timeoutMs;
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let stdoutLineBuffer = '';
    let stderrLineBuffer = '';

    function mirrorProgress(chunk, source) {
        const text = String(chunk || '');
        const prefix = source === 'stderr' ? '[doctor stderr]' : '[doctor]';
        const bufferName = source === 'stderr' ? 'stderrLineBuffer' : 'stdoutLineBuffer';
        let buffer = (source === 'stderr' ? stderrLineBuffer : stdoutLineBuffer) + text;
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';

        for (const line of lines) {
            if (line.startsWith('[packmaker]')) {
                process.stderr.write(`${prefix} ${line}\n`);
            }
        }

        if (bufferName === 'stderrLineBuffer') stderrLineBuffer = buffer;
        else stdoutLineBuffer = buffer;
    }

    return new Promise(resolve => {
        const child = spawn(cmd, cmdArgs, {
            cwd: root,
            env: { ...process.env, FORCE_COLOR: '0', ...(options.env || {}) },
            stdio: ['ignore', 'pipe', 'pipe']
        });

        const timer = setTimeout(() => {
            timedOut = true;
            child.kill('SIGTERM');
        }, timeoutLimit);

        child.stdout.on('data', chunk => {
            const text = chunk.toString();
            stdout += text;
            if (options.mirrorPackMakerProgress) mirrorProgress(text, 'stdout');
        });

        child.stderr.on('data', chunk => {
            const text = chunk.toString();
            stderr += text;
            if (options.mirrorPackMakerProgress) mirrorProgress(text, 'stderr');
        });

        child.on('close', code => {
            clearTimeout(timer);
            if (timedOut) stderr += `\n${name} timed out after ${timeoutLimit}ms`;
            resolve({
                name,
                status: code === 0 && !timedOut ? 'PASS' : (options.blockedOnFailure ? 'BLOCKED' : 'FAIL'),
                exitCode: timedOut ? null : code,
                elapsedMs: Date.now() - started,
                stdout: stdout.trim(),
                stderr: stderr.trim()
            });
        });
    });
}

function parseJson(text) {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function tailText(text, max = 5000) {
    const value = String(text || '').trim();
    return value.length > max ? value.slice(-max) : value;
}

function commandCheckDetail(result) {
    const detail = { elapsedMs: result.elapsedMs };
    if (result.status !== 'PASS') {
        detail.exitCode = result.exitCode;
        detail.stdout = tailText(result.stdout);
        detail.stderr = tailText(result.stderr);
    }
    return detail;
}

function parseLastJsonObject(text) {
    const value = String(text || '').trim();
    const end = value.lastIndexOf('}');
    if (end < 0) return null;

    for (let start = value.lastIndexOf('{', end); start >= 0; start = value.lastIndexOf('{', start - 1)) {
        const parsed = parseJson(value.slice(start, end + 1));
        if (parsed) return parsed;
    }

    return null;
}

function packMakerCheckDetail(result) {
    const detail = commandCheckDetail(result);
    const summary = parseLastJsonObject(result.stdout);
    if (summary?.packMakerKugnusE2e === 'ok') {
        detail.summary = {
            packId: summary.packId,
            route: summary.health?.route || summary.generated?.route || '',
            model: summary.health?.model || '',
            title: summary.generated?.title || '',
            itemCount: summary.generated?.itemCount,
            duplicates: summary.generated?.duplicates,
            koreanRatio: summary.generated?.koreanRatio,
            seconds: summary.generated?.seconds,
            checks: Array.isArray(summary.checks) ? summary.checks : []
        };
    }
    return detail;
}

async function httpJson(pathname) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(`${baseUrl}${pathname}`, { signal: controller.signal, cache: 'no-store' });
        const text = await res.text();
        return { ok: res.ok, status: res.status, body: parseJson(text), text };
    } finally {
        clearTimeout(timeout);
    }
}

function envPresence() {
    const explicitGatewayReady = Boolean(firstEnv(KUGNUS_GATEWAY_BASE_NAMES) && firstEnv(KUGNUS_GATEWAY_KEY_NAMES) && firstEnv(KUGNUS_GATEWAY_MODEL_NAMES));
    const gatewayReady = explicitGatewayReady;
    const dbReady = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'].every(envValue);
    const genericOpenAiFallback = Boolean(envValue('OPENAI_API_KEY'));
    return {
        gatewayReady,
        dbReady,
        gatewayMode: explicitGatewayReady ? 'KUGNUS gateway env' : '',
        gatewayIssue: '',
        openAiKeyConfigured: Boolean(envValue('OPENAI_API_KEY')),
        openAiModel: envValue('OPENAI_MODEL'),
        expectedKugnusRoutes: explicitGatewayReady ? ['gateway'] : [],
        hasSessionSecret: Boolean(envValue('SESSION_SECRET')),
        hasAllowedOrigins: Boolean(envValue('ALLOWED_ORIGINS')),
        hasDuckDuckGo: Boolean(envValue('DUCKDUCKGO_API_KEY')),
        hasGptFallback: genericOpenAiFallback
    };
}

function summarizeReleaseCheck(stdout) {
    const jsonStart = stdout.indexOf('{');
    const data = jsonStart >= 0 ? parseJson(stdout.slice(jsonStart)) : null;
    if (!data) return { ok: false, errors: ['Unable to parse release check output'], warnings: [], nextActions: [] };
    return {
        ok: data.ok === true,
        target: data.target,
        errors: Array.isArray(data.errors) ? data.errors : [],
        warnings: Array.isArray(data.warnings) ? data.warnings : [],
        nextActions: Array.isArray(data.nextActions) ? data.nextActions : []
    };
}

const order = ['FAIL', 'BLOCKED', 'WARN', 'PASS', 'SKIPPED'];

function currentOverall() {
    return checks.some(check => check.status === 'FAIL')
        ? 'FAIL'
        : checks.some(check => check.status === 'BLOCKED')
            ? 'BLOCKED'
            : checks.some(check => check.status === 'WARN')
                ? 'WARN'
                : 'PASS';
}

function currentResult() {
    const overall = currentOverall();
    return {
        codedropDoctor: overall,
        envFile: envPaths.length ? envPaths.map(file => path.relative(root, file) || file).join(',') : '(process env only)',
        baseUrl,
        deep,
        packmaker,
        releasePreflight: skipRelease ? 'skipped' : 'checked',
        counts: Object.fromEntries(order.map(status => [status, checks.filter(check => check.status === status).length])),
        checks
    };
}

function emitAndExitIfStrict() {
    const result = currentResult();
    console.log(JSON.stringify(result, null, 2));
    if (strict && (result.codedropDoctor === 'FAIL' || result.codedropDoctor === 'BLOCKED')) {
        process.exit(result.codedropDoctor === 'FAIL' ? 1 : 2);
    }
}

const env = envPresence();
let runtimeHealthOk = false;
addCheck('env.kugnus-gateway', env.gatewayReady ? 'PASS' : 'BLOCKED', {
    detail: env.gatewayReady ? `${env.gatewayMode} present` : (env.gatewayIssue || 'KUGNUS gateway env missing'),
    acceptedEnv: [
        'KUGNUS_GATEWAY_BASE_URL + KUGNUS_GATEWAY_API_KEY + KUGNUS_GATEWAY_MODEL'
    ],
    currentOpenAiEnv: {
        apiKey: env.openAiKeyConfigured ? 'present' : 'missing',
        model: env.openAiModel || 'missing',
        role: 'GPT fallback only'
    }
});
addCheck('env.duckduckgo', env.hasDuckDuckGo ? 'PASS' : 'WARN', {
    detail: env.hasDuckDuckGo ? 'Search grounding credential present' : 'Pack Maker search grounding may be limited'
});

try {
    const health = await httpJson('/health');
    runtimeHealthOk = health.ok;
    addCheck('http.health', health.ok ? 'PASS' : 'FAIL', { statusCode: health.status, body: health.body || health.text });
} catch (err) {
    addCheck('http.health', 'FAIL', { error: err.name === 'AbortError' ? 'timeout' : err.message });
}

try {
    const ready = await httpJson('/ready');
    const dbOk = ready.ok && ready.body?.db === 'ok';
    addCheck('http.ready-db', dbOk ? 'PASS' : 'FAIL', { statusCode: ready.status, body: ready.body || ready.text });
} catch (err) {
    addCheck('http.ready-db', 'FAIL', { error: err.name === 'AbortError' ? 'timeout' : err.message });
}

try {
    const kugnus = await httpJson('/api/llm/kugnus/health');
    const body = kugnus.body || {};
    let status = body.ok === true ? 'PASS' : 'FAIL';
    const expectedRoutes = env.expectedKugnusRoutes || [];
    if (body.ok === true && expectedRoutes.length && !expectedRoutes.includes(body.route)) status = 'BLOCKED';
    else if (body.ok === true && body.route !== 'gateway') status = 'WARN';
    addCheck('http.kugnus', status, {
        statusCode: kugnus.status,
        ok: body.ok,
        provider: body.provider || '',
        route: body.route || '',
        model: body.model || '',
        expectedRoutes,
        reason: body.reason || ''
    });
} catch (err) {
    addCheck('http.kugnus', 'FAIL', { error: err.name === 'AbortError' ? 'timeout' : err.message });
}

if (!skipRelease) {
    const release = command('release.check', process.execPath, ['scripts/check_release_readiness.mjs'], {
        blockedOnFailure: true,
        timeoutMs: 20_000,
        env: explicitEnvFile ? { RELEASE_ENV_FILE: explicitEnvFile } : {}
    });
    const releaseSummary = summarizeReleaseCheck(release.stdout);
    addCheck('release.preflight', releaseSummary.ok ? 'PASS' : 'BLOCKED', {
        target: releaseSummary.target || '',
        errors: releaseSummary.errors,
        warnings: releaseSummary.warnings,
        nextActions: releaseSummary.nextActions,
        elapsedMs: release.elapsedMs
    });

    if (strict && !releaseSummary.ok) {
        emitAndExitIfStrict();
    }
} else {
    addCheck('release.preflight', 'SKIPPED', {
        detail: 'Skipped by --skip-release; run npm run doctor:release:full or npm run release:check before deployment.'
    });
}

if (deep) {
    const verify = command('npm.verify', 'npm', ['run', 'verify'], { timeoutMs: 60_000 });
    addCheck('npm.verify', verify.status, commandCheckDetail(verify));

    const db = command('npm.verify-db', 'npm', ['run', 'verify:db'], { timeoutMs: 60_000 });
    addCheck('npm.verify-db', db.status, commandCheckDetail(db));

    const audit = command('npm.audit-prod', 'npm', ['run', 'audit:prod'], { timeoutMs: 60_000 });
    addCheck('npm.audit-prod', audit.status, commandCheckDetail(audit));
}

if (packmaker && !runtimeHealthOk) {
    addCheck('npm.verify-packmaker-kugnus', 'BLOCKED', {
        detail: 'Skipped because the configured app base URL is not reachable',
        baseUrl,
        nextAction: 'Start the app server, confirm /health is reachable, then rerun doctor:full.'
    });
} else if (packmaker) {
    const pm = await commandStreaming('npm.verify-packmaker-kugnus', 'npm', ['run', 'verify:packmaker:kugnus'], {
        timeoutMs: 720_000,
        mirrorPackMakerProgress: true,
        env: {
            PACK_MAKER_TIMEOUT_MS: '600000',
            PACK_MAKER_BATCH_TIMEOUT_MS: '180000',
            PACKMAKER_KUGNUS_E2E_TIMEOUT_MS: '600000'
        }
    });
    addCheck('npm.verify-packmaker-kugnus', pm.status, packMakerCheckDetail(pm));
}

emitAndExitIfStrict();
