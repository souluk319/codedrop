import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const root = process.cwd();
const tempDirs = [];

function writeFixture(files) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codedrop-release-matrix-'));
    tempDirs.push(dir);
    for (const [file, content] of Object.entries(files)) {
        const fullPath = path.join(dir, file);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content);
    }
    return dir;
}

process.on('exit', () => {
    for (const dir of tempDirs) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

const BASE_RELEASE_ENV = {
    DEFAULT_CHAT_ENGINE: 'gemini',
    GEMINI_API_KEY: 'gemini-key',
    GEMINI_MODEL: 'gemini-2.5-flash',
    DB_HOST: 'db.example.com',
    DB_USER: 'codedrop',
    DB_PASSWORD: 'secret',
    DB_NAME: 'codedrop',
    SESSION_SECRET: '1234567890abcdef1234567890abcdef',
    ALLOWED_ORIGINS: 'https://codedrop.example.com',
    PACK_ADMIN_NICKNAMES: 'admin'
};

const CLEAN_ENV_NAMES = [
    'DEFAULT_CHAT_ENGINE',
    'DEPLOY_TARGET',
    'KUGNUS_GATEWAY_BASE_URL',
    'KUGNUS_GATEWAY_API_KEY',
    'KUGNUS_GATEWAY_MODEL',
    'KUGNUS_CHAT_MODEL',
    'OPENAI_API_KEY',
    'OPENAI_MODEL',
    'GEMINI_API_KEY',
    'GEMINI_MODEL',
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'SESSION_SECRET',
    'ALLOWED_ORIGINS',
    'PACK_ADMIN_NICKNAMES'
];

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function runReleaseCheck(overrides = {}, options = {}) {
    const env = { ...process.env };
    for (const name of CLEAN_ENV_NAMES) delete env[name];
    Object.assign(env, BASE_RELEASE_ENV, overrides);

    const result = spawnSync(process.execPath, [path.join(root, 'scripts/check_release_readiness.mjs'), '--env-file', '/dev/null'], {
        encoding: 'utf8',
        env,
        cwd: options.cwd || root
    });

    const raw = result.stdout || result.stderr;
    let data = {};
    try {
        data = JSON.parse(raw);
    } catch {
        throw new Error(`release check did not emit JSON\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
    }
    return { status: result.status, data };
}

function includes(list, text) {
    return Array.isArray(list) && list.some(item => String(item).includes(text));
}

const cases = [
    {
        name: 'Gemini default release passes',
        expectOk: true
    },
    {
        name: 'optional KUGNUS gateway passes',
        env: {
            DEFAULT_CHAT_ENGINE: 'kugnus',
            KUGNUS_GATEWAY_BASE_URL: 'https://llm.example.com/v1',
            KUGNUS_GATEWAY_API_KEY: 'kugnus-key',
            KUGNUS_GATEWAY_MODEL: 'gemma4:12b-it-qat'
        },
        expectOk: true
    },
    {
        name: 'KUGNUS chat model alias passes',
        env: {
            DEFAULT_CHAT_ENGINE: 'kugnus',
            KUGNUS_GATEWAY_BASE_URL: 'https://llm.example.com/v1',
            KUGNUS_GATEWAY_API_KEY: 'kugnus-key',
            KUGNUS_CHAT_MODEL: 'gemma4:12b-it-qat'
        },
        expectOk: true
    },
    {
        name: 'private gateway URL is blocked',
        env: {
            DEFAULT_CHAT_ENGINE: 'kugnus',
            KUGNUS_GATEWAY_BASE_URL: 'http://127.0.0.1:11434/v1',
            KUGNUS_GATEWAY_API_KEY: 'kugnus-key',
            KUGNUS_GATEWAY_MODEL: 'gemma4:12b-it-qat'
        },
        expectOk: false,
        expectError: 'KUGNUS release gateway must be public https URL'
    },
    {
        name: 'generic OpenAI fallback must remain mini',
        env: {
            OPENAI_API_KEY: 'openai-key',
            OPENAI_MODEL: 'gpt-4o'
        },
        expectOk: false,
        expectError: 'Generic OPENAI_MODEL fallback must stay gpt-5.4-mini'
    },
    {
        name: 'OpenAI engine mini passes',
        env: {
            DEFAULT_CHAT_ENGINE: 'openai',
            OPENAI_API_KEY: 'openai-key',
            OPENAI_MODEL: 'gpt-5.4-mini'
        },
        expectOk: true
    },
    {
        name: 'local session secret is blocked',
        env: {
            SESSION_SECRET: 'codedrop-local-dev-session-secret-change-for-release'
        },
        expectOk: false,
        expectError: 'SESSION_SECRET must be a long random production secret'
    },
    {
        name: 'localhost allowed origin is blocked',
        env: {
            ALLOWED_ORIGINS: 'http://localhost:3001'
        },
        expectOk: false,
        expectError: 'ALLOWED_ORIGINS must contain only public https origins'
    },
    {
        name: 'render blueprint secrets must be prompted',
        cwd: writeFixture({
            'render.yaml': [
                'services:',
                '  - type: web',
                '    name: codedrop',
                '    runtime: node',
                '    dockerfilePath: ./Dockerfile',
                '    envVars:',
                '      - key: NODE_ENV',
                '        value: production',
                '      - key: DEFAULT_CHAT_ENGINE',
                '        value: kugnus',
                '      - key: DB_HOST',
                '        value: db.example.com',
                '      - key: DB_USER',
                '        sync: false',
                '      - key: DB_PASSWORD',
                '        value: committed-password',
                '      - key: DB_NAME',
                '        sync: false',
                '      - key: SESSION_SECRET',
                '        value: committed-secret',
                '      - key: ALLOWED_ORIGINS',
                '        sync: false',
                '      - key: KUGNUS_GATEWAY_BASE_URL',
                `        value: http://${['100', '99', '152', '52'].join('.')}:8790/v1`,
                '      - key: KUGNUS_GATEWAY_API_KEY',
                '        sync: false',
                '      - key: KUGNUS_GATEWAY_MODEL',
                '        value: gemma4:12b-it-qat',
                '      - key: OPENAI_API_KEY',
                '        sync: false',
                '      - key: OPENAI_MODEL',
                '        value: gpt-5.4-mini',
                '      - key: DUCKDUCKGO_API_KEY',
                '        sync: false'
            ].join('\n')
        }),
        env: {
            KUGNUS_GATEWAY_BASE_URL: 'https://llm.example.com/v1',
            KUGNUS_GATEWAY_API_KEY: 'kugnus-key',
            KUGNUS_GATEWAY_MODEL: 'gemma4:12b-it-qat'
        },
        expectOk: false,
        expectErrors: [
            'render.yaml must use runtime: docker',
            'render.yaml must probe /health',
            'render.yaml should deploy only after CI checks pass',
            'render.yaml must mark deployment-specific env keys sync:false',
            'render.yaml must not contain private gateway addresses or secret-like keys'
        ]
    },
    {
        name: 'firebase placeholder files are blocked by contract',
        cwd: writeFixture({
            'firebase.json': JSON.stringify({ hosting: { public: '.', rewrites: [{ source: '**', destination: '/index.html' }] } }, null, 2),
            '.firebaserc': JSON.stringify({ projects: { default: 'codedrop-test' } }, null, 2),
            'firestore.rules': [
                "rules_version = '2';",
                'service cloud.firestore {',
                '  match /databases/{database}/documents {',
                '    match /{document=**} { allow read, write: if true; }',
                '  }',
                '}'
            ].join('\n'),
            'functions/src/index.js': "export const api = () => 'placeholder';\n"
        }),
        env: {
            DEPLOY_TARGET: 'firebase',
            KUGNUS_GATEWAY_BASE_URL: 'https://llm.example.com/v1',
            KUGNUS_GATEWAY_API_KEY: 'kugnus-key',
            KUGNUS_GATEWAY_MODEL: 'gemma4:12b-it-qat'
        },
        expectOk: false,
        expectErrors: [
            'Firebase Hosting must rewrite /api/** to Cloud Run or Functions',
            '.firebaserc projects.default must be the real Firebase project id',
            'firestore.rules must not use open development allow read/write rules',
            'Firebase API layer must expose required private endpoints'
        ]
    },
    {
        name: 'firebase release skeleton passes contract checks',
        cwd: writeFixture({
            'firebase.json': JSON.stringify({
                hosting: {
                    public: '.',
                    rewrites: [
                        { source: '/api/**', run: { serviceId: 'codedrop-api', region: 'asia-northeast3' } },
                        { source: '**', destination: '/index.html' }
                    ]
                }
            }, null, 2),
            '.firebaserc': JSON.stringify({ projects: { default: 'codedrop-prod-123' } }, null, 2),
            'firestore.rules': [
                "rules_version = '2';",
                'service cloud.firestore {',
                '  match /databases/{database}/documents {',
                '    match /profiles/{uid} { allow read, write: if request.auth != null && request.auth.uid == uid; }',
                '    match /officialScores/{scoreId} { allow read: if true; allow write: if request.auth != null; }',
                '    match /customPacks/{packId} { allow read: if resource.data.status == "approved" || request.auth.uid == resource.data.ownerUid; allow write: if request.auth != null; }',
                '  }',
                '}'
            ].join('\n'),
            'functions/src/index.js': [
                "app.get('/api/llm/kugnus/health', handler);",
                "app.post('/api/learn-chat/stream', handler);",
                "app.post('/api/pack-maker/chat/stream', handler);"
            ].join('\n')
        }),
        env: {
            DEPLOY_TARGET: 'firebase',
            KUGNUS_GATEWAY_BASE_URL: 'https://llm.example.com/v1',
            KUGNUS_GATEWAY_API_KEY: 'kugnus-key',
            KUGNUS_GATEWAY_MODEL: 'gemma4:12b-it-qat'
        },
        expectOk: true
    }
];

const results = cases.map(testCase => {
    const result = runReleaseCheck(testCase.env, { cwd: testCase.cwd });
    assert(result.data.ok === testCase.expectOk, `${testCase.name}: expected ok=${testCase.expectOk}, got ${result.data.ok}\n${JSON.stringify(result.data, null, 2)}`);
    assert((result.status === 0) === testCase.expectOk, `${testCase.name}: exit status mismatch ${result.status}`);
    if (testCase.expectError) {
        assert(includes(result.data.errors, testCase.expectError), `${testCase.name}: missing expected error "${testCase.expectError}"\n${JSON.stringify(result.data, null, 2)}`);
    }
    if (testCase.expectErrors) {
        for (const expected of testCase.expectErrors) {
            assert(includes(result.data.errors, expected), `${testCase.name}: missing expected error "${expected}"\n${JSON.stringify(result.data, null, 2)}`);
        }
    }
    if (testCase.expectWarning) {
        assert(includes(result.data.warnings, testCase.expectWarning), `${testCase.name}: missing expected warning "${testCase.expectWarning}"\n${JSON.stringify(result.data, null, 2)}`);
    }
    return {
        name: testCase.name,
        ok: result.data.ok,
        errors: result.data.errors.length,
        warnings: result.data.warnings.length
    };
});

console.log(JSON.stringify({
    releaseReadinessMatrix: 'ok',
    cases: results.length,
    results
}, null, 2));
