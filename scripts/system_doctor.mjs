import { spawnSync } from 'child_process';
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

const envFile = valueArg.get('env-file') || process.env.DOCTOR_ENV_FILE || '.env';
const envPath = path.resolve(root, envFile);
if (fs.existsSync(envPath)) dotenv.config({ path: envPath, override: false, quiet: true });

const baseUrl = (valueArg.get('base-url') || process.env.CODEDROP_DOCTOR_BASE_URL || 'http://localhost:3001').replace(/\/+$/, '');
const deep = args.has('--deep');
const packmaker = args.has('--packmaker');
const strict = args.has('--strict');
const timeoutMs = Math.max(2000, Math.min(Number(valueArg.get('timeout-ms') || process.env.CODEDROP_DOCTOR_TIMEOUT_MS || 10_000), 120_000));

const checks = [];

function envValue(name) {
    return String(process.env[name] || '').trim();
}

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

function parseJson(text) {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
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
    const gatewayReady = Boolean(envValue('KUGNUS_GATEWAY_BASE_URL') && envValue('KUGNUS_GATEWAY_API_KEY') && (envValue('KUGNUS_GATEWAY_MODEL') || envValue('KUGNUS_MODEL')));
    const directReady = Boolean(envValue('LLM_BASE_URL') && envValue('LLM_MODEL'));
    const dbReady = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'].every(envValue);
    return {
        gatewayReady,
        directReady,
        dbReady,
        hasSessionSecret: Boolean(envValue('SESSION_SECRET')),
        hasAllowedOrigins: Boolean(envValue('ALLOWED_ORIGINS')),
        hasDuckDuckGo: Boolean(envValue('DUCKDUCKGO_API_KEY') || envValue('DDG_API_KEY')),
        hasGptFallback: Boolean((envValue('GPT_OPENAI_API_KEY') || envValue('OPENAI_API_KEY')) && (envValue('GPT_OPENAI_MODEL') || envValue('OPENAI_MODEL')))
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

const env = envPresence();
addCheck('env.kugnus-gateway', env.gatewayReady ? 'PASS' : 'BLOCKED', {
    detail: env.gatewayReady ? 'KUGNUS_GATEWAY_* present' : 'KUGNUS_GATEWAY_* missing; deployment must not rely on direct LLM_BASE_URL'
});
addCheck('env.kugnus-direct-dev', env.directReady ? 'WARN' : 'PASS', {
    detail: env.directReady ? 'LLM_BASE_URL direct dev route is active' : 'No direct KUGNUS route configured'
});
addCheck('env.duckduckgo', env.hasDuckDuckGo ? 'PASS' : 'WARN', {
    detail: env.hasDuckDuckGo ? 'Search grounding credential present' : 'Pack Maker search grounding may be limited'
});

try {
    const health = await httpJson('/health');
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
    if (body.ok === true && body.route !== 'gateway') status = 'WARN';
    addCheck('http.kugnus', status, {
        statusCode: kugnus.status,
        ok: body.ok,
        provider: body.provider || '',
        route: body.route || '',
        model: body.model || '',
        reason: body.reason || ''
    });
} catch (err) {
    addCheck('http.kugnus', 'FAIL', { error: err.name === 'AbortError' ? 'timeout' : err.message });
}

const release = command('release.check', process.execPath, ['scripts/check_release_readiness.mjs'], {
    blockedOnFailure: true,
    timeoutMs: 20_000,
    env: { RELEASE_ENV_FILE: envFile }
});
const releaseSummary = summarizeReleaseCheck(release.stdout);
addCheck('release.preflight', releaseSummary.ok ? 'PASS' : 'BLOCKED', {
    target: releaseSummary.target || '',
    errors: releaseSummary.errors,
    warnings: releaseSummary.warnings,
    nextActions: releaseSummary.nextActions,
    elapsedMs: release.elapsedMs
});

if (deep) {
    const verify = command('npm.verify', 'npm', ['run', 'verify'], { timeoutMs: 60_000 });
    addCheck('npm.verify', verify.status, { elapsedMs: verify.elapsedMs });

    const db = command('npm.verify-db', 'npm', ['run', 'verify:db'], { timeoutMs: 60_000 });
    addCheck('npm.verify-db', db.status, { elapsedMs: db.elapsedMs });

    const audit = command('npm.audit-prod', 'npm', ['run', 'audit:prod'], { timeoutMs: 60_000 });
    addCheck('npm.audit-prod', audit.status, { elapsedMs: audit.elapsedMs });
}

if (packmaker) {
    const pm = command('npm.verify-packmaker-kugnus', 'npm', ['run', 'verify:packmaker:kugnus'], { timeoutMs: 420_000 });
    addCheck('npm.verify-packmaker-kugnus', pm.status, { elapsedMs: pm.elapsedMs });
}

const order = ['FAIL', 'BLOCKED', 'WARN', 'PASS'];
const overall = checks.some(check => check.status === 'FAIL')
    ? 'FAIL'
    : checks.some(check => check.status === 'BLOCKED')
        ? 'BLOCKED'
        : checks.some(check => check.status === 'WARN')
            ? 'WARN'
            : 'PASS';

const counts = Object.fromEntries(order.map(status => [status, checks.filter(check => check.status === status).length]));

const result = {
    codedropDoctor: overall,
    envFile: fs.existsSync(envPath) ? path.relative(root, envPath) || envFile : '(process env only)',
    baseUrl,
    deep,
    packmaker,
    counts,
    checks
};

console.log(JSON.stringify(result, null, 2));

if (strict && (overall === 'FAIL' || overall === 'BLOCKED')) {
    process.exit(overall === 'FAIL' ? 1 : 2);
}
