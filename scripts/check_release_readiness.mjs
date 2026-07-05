import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const root = process.cwd();
const args = new Map();

for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith('--')) {
        const [key, value] = arg.slice(2).split('=');
        args.set(key, value ?? process.argv[i + 1] ?? '');
        if (value == null && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) i++;
    }
}

const explicitEnvFile = args.get('env-file') || process.env.RELEASE_ENV_FILE || '';
const envFiles = explicitEnvFile ? [explicitEnvFile] : ['.env.local', '.env'];
const envPaths = envFiles
    .map(file => path.resolve(root, file))
    .filter(file => fs.existsSync(file));
if (envPaths.length) {
    dotenv.config({ path: envPaths, override: Boolean(explicitEnvFile), quiet: true });
}

const target = String(args.get('target') || process.env.DEPLOY_TARGET || 'node').toLowerCase();
const errors = [];
const warnings = [];
const nextActions = [];

function value(name) {
    return String(process.env[name] || '').trim();
}

function has(name) {
    return Boolean(value(name));
}

function hasAny(names) {
    return names.some(has);
}

function firstValue(names) {
    for (const name of names) {
        const current = value(name);
        if (current) return current;
    }
    return '';
}

function publicUrlLike(url) {
    return /^https:\/\//i.test(url)
        && !/\/\/(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.)/i.test(url);
}

function addMissing(names, label = names.join(' or ')) {
    if (!names.some(has)) errors.push(`Missing ${label}`);
}

function requireFile(file, message = `Missing ${file}`) {
    if (!fs.existsSync(path.join(root, file))) errors.push(message);
}

function addAction(message) {
    if (!nextActions.includes(message)) nextActions.push(message);
}

function hasAnyFile(files) {
    return files.some(file => fs.existsSync(path.join(root, file)));
}

function readIfExists(file) {
    const fullPath = path.join(root, file);
    if (!fs.existsSync(fullPath)) return '';
    return fs.readFileSync(fullPath, 'utf8');
}

function parseJsonIfExists(file) {
    const text = readIfExists(file);
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        errors.push(`${file} must be valid JSON`);
        return null;
    }
}

function firebaseHostingEntries(firebaseJson) {
    const hosting = firebaseJson?.hosting;
    if (!hosting) return [];
    return Array.isArray(hosting) ? hosting : [hosting];
}

function firebaseRewriteTargetsApi(rewrite) {
    if (!rewrite || rewrite.source !== '/api/**') return false;
    return Boolean(rewrite.run || rewrite.function || rewrite.destination);
}

function checkFirebaseHostingRewrite() {
    const firebaseJson = parseJsonIfExists('firebase.json');
    if (!firebaseJson) return;

    const hasApiRewrite = firebaseHostingEntries(firebaseJson)
        .some(hosting => Array.isArray(hosting.rewrites) && hosting.rewrites.some(firebaseRewriteTargetsApi));

    if (!hasApiRewrite) {
        errors.push('Firebase Hosting must rewrite /api/** to Cloud Run or Functions');
        addAction('Add a Firebase Hosting rewrite from /api/** to the Cloud Run or Functions API service before Firebase deploy.');
    }
}

function checkFirestoreRules() {
    const rules = readIfExists('firestore.rules');
    if (!rules) return;

    if (/allow\s+read\s*,\s*write\s*:\s*if\s+(true|request\.time\s*<)/i.test(rules)) {
        errors.push('firestore.rules must not use open development allow read/write rules');
        addAction('Replace open Firestore rules with owner/admin/status-scoped rules before deploy.');
    }

    const requiredCollections = ['profiles', 'officialScores', 'customPacks'];
    const missingCollections = requiredCollections.filter(name => !rules.includes(name));
    if (missingCollections.length) {
        errors.push(`firestore.rules must define release rules for ${missingCollections.join(', ')}`);
        addAction('Add Firestore rules for profiles, officialScores, customPacks, custom pack items, and custom score subcollections.');
    }
}

function checkFirebaseApiLayerContract() {
    const apiFiles = [
        'functions/src/index.js',
        'functions/src/index.ts',
        'functions/index.js',
        'cloudrun/server.js',
        'cloudrun/src/server.js',
        'api/server.js',
        'api/index.js',
        'api/src/index.js'
    ].filter(file => fs.existsSync(path.join(root, file)));

    if (!apiFiles.length) return;

    const apiText = apiFiles.map(readIfExists).join('\n');
    const requiredEndpoints = [
        '/api/llm/kugnus/health',
        '/api/learn-chat/stream',
        '/api/pack-maker/chat/stream'
    ];
    const missingEndpoints = requiredEndpoints.filter(endpoint => !apiText.includes(endpoint));
    if (missingEndpoints.length) {
        errors.push(`Firebase API layer must expose required private endpoints: ${missingEndpoints.join(', ')}`);
        addAction('Implement the private API layer endpoints for KUGNUS health, learn chat streaming, and Pack Maker streaming before Firebase deploy.');
    }
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

function allowedMiniModel(model) {
    return /^gpt-?5(\.4)?-mini$/i.test(model);
}

function checkCommon() {
    const defaultEngine = value('DEFAULT_CHAT_ENGINE');
    if (defaultEngine && defaultEngine !== 'kugnus') {
        errors.push(`DEFAULT_CHAT_ENGINE must be kugnus for release, got ${defaultEngine}`);
    }

    const hasExplicitGateway = hasAny(KUGNUS_GATEWAY_BASE_NAMES)
        && hasAny(KUGNUS_GATEWAY_KEY_NAMES)
        && hasAny(KUGNUS_GATEWAY_MODEL_NAMES);
    if (!hasExplicitGateway) {
        errors.push('KUGNUS release requires KUGNUS_GATEWAY_BASE_URL, KUGNUS_GATEWAY_API_KEY, and KUGNUS_GATEWAY_MODEL');
        addAction('Set KUGNUS_GATEWAY_BASE_URL=https://<public-gateway>/v1, KUGNUS_GATEWAY_API_KEY, and KUGNUS_GATEWAY_MODEL=gemma4:12b-it-qat in the deployment environment.');
        addAction('After setting gateway env, run npm run verify:kugnus-live -- --env-file=<release-env-file> and require route=gateway.');
    }

    const gatewayBase = firstValue(KUGNUS_GATEWAY_BASE_NAMES);
    if (gatewayBase && !publicUrlLike(gatewayBase)) {
        errors.push(`KUGNUS release gateway must be public https URL, got ${gatewayBase}`);
        addAction('Use the public KUGNUS gateway URL for release; do not deploy localhost, private IP, Tailscale, or direct Ollama URLs.');
        addAction('After setting gateway env, run npm run verify:kugnus-live -- --env-file=<release-env-file> and require route=gateway.');
    }

    const hasGenericOpenAiFallback = has('OPENAI_API_KEY');
    if (!hasGenericOpenAiFallback) {
        warnings.push('GPT fallback API key is not configured; KUGNUS-only release is possible but fallback UX will not work');
    }

    if (hasGenericOpenAiFallback && has('OPENAI_MODEL') && !allowedMiniModel(value('OPENAI_MODEL'))) {
        errors.push(`Generic OPENAI_MODEL fallback must stay gpt-5.4-mini, got ${value('OPENAI_MODEL')}`);
    }
}

function checkNodeRelease() {
    ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'].forEach(name => addMissing([name], name));
    ['SESSION_SECRET', 'ALLOWED_ORIGINS'].forEach(name => addMissing([name], name));
    if (!has('DB_HOST') || !has('DB_USER') || !has('DB_PASSWORD') || !has('DB_NAME')) {
        addAction('Fill the production MySQL-compatible DB variables, or switch DEPLOY_TARGET=firebase after Firebase migration is implemented.');
    }
    if (!has('SESSION_SECRET')) addAction('Generate a production SESSION_SECRET with npm run release:secret and set it in the deployment environment.');
    if (!has('ALLOWED_ORIGINS')) addAction('Set ALLOWED_ORIGINS to the exact deployed app origin.');

    if (has('SESSION_SECRET')) {
        const secret = value('SESSION_SECRET');
        if (secret.length < 32 || /local|dev|change|codedrop-local/i.test(secret)) {
            errors.push('SESSION_SECRET must be a long random production secret, not a local/dev placeholder');
            addAction('Generate a new production SESSION_SECRET with npm run release:secret and replace the placeholder.');
        }
    }

    if (has('ALLOWED_ORIGINS')) {
        const origins = value('ALLOWED_ORIGINS')
            .split(',')
            .map(origin => origin.trim())
            .filter(Boolean);
        const invalidOrigins = origins.filter(origin => !publicUrlLike(origin));
        if (invalidOrigins.length) {
            errors.push(`ALLOWED_ORIGINS must contain only public https origins for release, got ${invalidOrigins.join(', ')}`);
            addAction('Replace localhost/private ALLOWED_ORIGINS with the exact deployed https origin.');
        }
    }

    if (!has('PACK_ADMIN_NICKNAMES')) {
        warnings.push('PACK_ADMIN_NICKNAMES is empty; public pack review approval will be unavailable');
    }
}

function checkFirebaseRelease() {
    requireFile('firebase.json');
    requireFile('.firebaserc');
    requireFile('firestore.rules');
    checkFirebaseHostingRewrite();
    checkFirestoreRules();
    if (!fs.existsSync(path.join(root, 'firebase.json'))) {
        addAction('Create firebase.json after Firebase project setup; Hosting must rewrite /api/** to Cloud Run or Functions.');
    }
    if (!fs.existsSync(path.join(root, '.firebaserc'))) {
        addAction('Create .firebaserc with the real Firebase project id from Firebase Console.');
    }
    if (!fs.existsSync(path.join(root, 'firestore.rules'))) {
        addAction('Add firestore.rules before Firebase deploy; do not deploy Firestore with open development rules.');
    }

    const hasApiLayer = hasAnyFile([
        'functions/package.json',
        'functions/src/index.js',
        'functions/src/index.ts',
        'functions/index.js',
        'cloudrun/Dockerfile',
        'cloudrun/package.json',
        'api/package.json',
        'api/server.js'
    ]);
    if (!hasApiLayer) {
        errors.push('Firebase release needs Functions/Cloud Run API layer for KUGNUS, DuckDuckGo, Pack Maker, and private keys');
        addAction('Add a real Functions or Cloud Run API layer for /api/learn-chat/stream, /api/pack-maker/chat/stream, KUGNUS, DuckDuckGo, score verification, and public pack review.');
    }
    checkFirebaseApiLayerContract();
}

if (!['node', 'firebase'].includes(target)) {
    errors.push(`Unknown DEPLOY_TARGET "${target}". Use node or firebase.`);
}

checkCommon();
if (target === 'node') checkNodeRelease();
if (target === 'firebase') checkFirebaseRelease();

const result = {
    target,
    envFile: envPaths.length ? envPaths.map(file => path.relative(root, file) || file).join(',') : '(process env only)',
    ok: errors.length === 0,
    errors,
    warnings,
    nextActions
};

console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exit(1);
