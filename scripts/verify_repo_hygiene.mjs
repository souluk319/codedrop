import fs from 'fs';
import { spawnSync } from 'child_process';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function gitFiles() {
    const result = spawnSync('git', ['ls-files'], { encoding: 'utf8' });
    assert(result.status === 0, result.stderr || 'git ls-files failed');
    return result.stdout.split('\n').filter(Boolean);
}

function read(file) {
    return fs.readFileSync(file, 'utf8');
}

function isRuntimeFile(file) {
    return file === 'index.html' || file === 'server.js' || file.startsWith('js/');
}

function isTextFile(file) {
    return /\.(css|html|js|json|md|mjs|txt|yml|yaml)$/.test(file) || file.startsWith('.env');
}

function formatHits(hits) {
    return hits.map(hit => `${hit.file}:${hit.line}: ${hit.label}`).join('\n');
}

function scan(files, checks) {
    const hits = [];
    for (const file of files) {
        if (!isTextFile(file)) continue;
        const text = read(file);
        const lines = text.split('\n');
        for (const check of checks) {
            if (check.allowFile?.(file)) continue;
            for (let index = 0; index < lines.length; index += 1) {
                const line = lines[index];
                if (check.pattern.test(line)) {
                    hits.push({
                        file,
                        line: index + 1,
                        label: check.label
                    });
                }
            }
        }
    }
    return hits;
}

const files = gitFiles();

const staleScratchScripts = files.filter(file => (
    file.startsWith('scripts/') &&
    (
        file.endsWith('.py') ||
        /(^|\/)(fix|restore|cleanup|clean|move|extract|update|remove|polish|nuclear|revert|add|bold|find)_/i.test(file) ||
        /\/(?:db_add_password|verify_db)\.js$/i.test(file)
    )
));
assert(
    staleScratchScripts.length === 0,
    `one-off repair scripts must live under legacy/scripts, not production scripts:\n${staleScratchScripts.join('\n')}`
);

const trackedEnvFiles = files.filter(file => file === '.env' || /^\.env\.(?!.*\.example$)/.test(file));
assert(
    trackedEnvFiles.length === 0,
    `real env files must not be committed:\n${trackedEnvFiles.join('\n')}`
);

const trackedSecretFiles = files.filter(file => (
    /\.(pem|p12|pfx|key|sqlite|db)$/i.test(file) ||
    /(^|\/)(id_rsa|id_ed25519|secret|secrets)\b/i.test(file)
));
assert(
    trackedSecretFiles.length === 0,
    `secret/database artifacts must not be committed:\n${trackedSecretFiles.join('\n')}`
);

const staleEnvHits = scan(files, [
    {
        label: 'stale KUGNUS_PROVIDER env name',
        pattern: /\bKUGNUS_PROVIDER\b/,
        allowFile: file => file === 'scripts/verify_repo_hygiene.mjs'
    },
    {
        label: 'stale OPENAI_BASE_URL KUGNUS wiring',
        pattern: /\bOPENAI_BASE_URL\b/,
        allowFile: file => file === 'scripts/verify_repo_hygiene.mjs'
    },
    {
        label: 'stale local LLM env name',
        pattern: /\b(?:LLM_API_KEY|LOCAL_LLM_API_KEY|LOCAL_LLM)\b/,
        allowFile: file => (
            file === 'scripts/verify_repo_hygiene.mjs' ||
            file === 'scripts/verify_kugnus_gateway_contract.mjs'
        )
    }
]);
assert(staleEnvHits.length === 0, `stale env references found:\n${formatHits(staleEnvHits)}`);

const leakHits = scan(files, [
    {
        label: 'private Tailscale/runtime gateway address in tracked files',
        pattern: /\b100\.99\./,
        allowFile: file => file === 'scripts/verify_repo_hygiene.mjs'
    },
    {
        label: 'OpenAI-style secret key in tracked files',
        pattern: /\bsk-[A-Za-z0-9_-]{16,}/
    }
]);
assert(leakHits.length === 0, `potential secret/runtime leak found:\n${formatHits(leakHits)}`);

const runtimeFiles = files.filter(isRuntimeFile);
const domHits = scan(runtimeFiles, [
    { label: 'raw insertAdjacentHTML usage', pattern: /\binsertAdjacentHTML\s*\(/ },
    { label: 'eval usage', pattern: /\beval\s*\(/ },
    { label: 'dynamic Function constructor', pattern: /\bnew\s+Function\s*\(/ }
]);
assert(domHits.length === 0, `unsafe runtime DOM/code sinks found:\n${formatHits(domHits)}`);

const dialogHits = scan(runtimeFiles, [
    { label: 'native alert usage', pattern: /(^|[^\w-])(?:window\.)?alert\s*\(/ },
    { label: 'native confirm usage', pattern: /(^|[^\w-])(?:window\.)?confirm\s*\(/ },
    { label: 'native prompt usage', pattern: /(^|[^\w-])(?:window\.)?prompt\s*\(/ },
    { label: 'debugger statement', pattern: /\bdebugger\s*;/ }
]);
assert(dialogHits.length === 0, `native dialog/debug statements found:\n${formatHits(dialogHits)}`);

console.log('repoHygiene: PASS');
