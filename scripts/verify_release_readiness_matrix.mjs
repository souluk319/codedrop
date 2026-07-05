import { spawnSync } from 'child_process';

const BASE_RELEASE_ENV = {
    DEFAULT_CHAT_ENGINE: 'kugnus',
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
    'KUGNUS_MODEL',
    'KUGNUS_BASE_URL',
    'KUGNUS_API_KEY',
    'KUGNUS_OPENAI_BASE_URL',
    'KUGNUS_OPENAI_API_KEY',
    'KUGNUS_OPENAI_MODEL',
    'KUGNUS_LLM_BASE_URL',
    'KUGNUS_LLM_API_KEY',
    'KUGNUS_LLM_MODEL',
    'OPENAI_BASE_URL',
    'OPENAI_API_KEY',
    'OPENAI_MODEL',
    'GPT_OPENAI_API_KEY',
    'GPT_OPENAI_MODEL',
    'GPT54_MINI_API_KEY',
    'GPT54_MINI_MODEL',
    'GPT5_4_MINI_API_KEY',
    'GPT5_4_MINI_MODEL',
    'LLM_OPENAI_API_KEY',
    'LLM_BASE_URL',
    'LLM_MODEL',
    'ALLOW_DIRECT_KUGNUS',
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

function runReleaseCheck(overrides = {}) {
    const env = { ...process.env };
    for (const name of CLEAN_ENV_NAMES) delete env[name];
    Object.assign(env, BASE_RELEASE_ENV, overrides);

    const result = spawnSync(process.execPath, ['scripts/check_release_readiness.mjs', '--env-file', '/dev/null'], {
        encoding: 'utf8',
        env
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
        name: 'explicit KUGNUS gateway passes',
        env: {
            KUGNUS_GATEWAY_BASE_URL: 'https://llm.example.com/v1',
            KUGNUS_GATEWAY_API_KEY: 'kugnus-key',
            KUGNUS_GATEWAY_MODEL: 'gemma4:12b-it-qat'
        },
        expectOk: true
    },
    {
        name: 'KUGNUS_BASE_URL alias passes',
        env: {
            KUGNUS_BASE_URL: 'https://llm.example.com/v1',
            KUGNUS_API_KEY: 'kugnus-key',
            KUGNUS_MODEL: 'gemma4:12b-it-qat'
        },
        expectOk: true
    },
    {
        name: 'OPENAI_* KUGNUS alias passes when complete',
        env: {
            OPENAI_BASE_URL: 'https://llm.example.com/v1',
            OPENAI_API_KEY: 'kugnus-key',
            OPENAI_MODEL: 'gemma4:12b-it-qat'
        },
        expectOk: true,
        expectWarning: 'GPT fallback API key is not configured'
    },
    {
        name: 'incomplete OPENAI_* KUGNUS alias is blocked with exact missing key',
        env: {
            OPENAI_API_KEY: 'kugnus-key',
            OPENAI_MODEL: 'gemma4:12b-it-qat'
        },
        expectOk: false,
        expectError: 'OPENAI_* KUGNUS alias is incomplete; missing OPENAI_BASE_URL'
    },
    {
        name: 'direct KUGNUS route is blocked for release',
        env: {
            KUGNUS_GATEWAY_BASE_URL: 'https://llm.example.com/v1',
            KUGNUS_GATEWAY_API_KEY: 'kugnus-key',
            KUGNUS_GATEWAY_MODEL: 'gemma4:12b-it-qat',
            LLM_BASE_URL: 'http://100.99.152.52:11434',
            LLM_MODEL: 'gemma4:12b-it-qat'
        },
        expectOk: false,
        expectError: 'LLM_BASE_URL direct KUGNUS endpoint is local/dev only'
    },
    {
        name: 'private gateway URL is blocked',
        env: {
            KUGNUS_GATEWAY_BASE_URL: 'http://127.0.0.1:11434/v1',
            KUGNUS_GATEWAY_API_KEY: 'kugnus-key',
            KUGNUS_GATEWAY_MODEL: 'gemma4:12b-it-qat'
        },
        expectOk: false,
        expectError: 'KUGNUS release gateway must be public https URL'
    },
    {
        name: 'dedicated GPT fallback must remain mini',
        env: {
            KUGNUS_GATEWAY_BASE_URL: 'https://llm.example.com/v1',
            KUGNUS_GATEWAY_API_KEY: 'kugnus-key',
            KUGNUS_GATEWAY_MODEL: 'gemma4:12b-it-qat',
            GPT_OPENAI_API_KEY: 'openai-key',
            GPT_OPENAI_MODEL: 'gpt-4o'
        },
        expectOk: false,
        expectError: 'GPT fallback model must stay gpt-5.4-mini'
    },
    {
        name: 'generic OpenAI fallback must remain mini',
        env: {
            KUGNUS_GATEWAY_BASE_URL: 'https://llm.example.com/v1',
            KUGNUS_GATEWAY_API_KEY: 'kugnus-key',
            KUGNUS_GATEWAY_MODEL: 'gemma4:12b-it-qat',
            OPENAI_API_KEY: 'openai-key',
            OPENAI_MODEL: 'gpt-4o'
        },
        expectOk: false,
        expectError: 'Generic OPENAI_MODEL fallback must stay gpt-5.4-mini'
    },
    {
        name: 'generic OpenAI fallback mini passes with explicit KUGNUS gateway',
        env: {
            KUGNUS_GATEWAY_BASE_URL: 'https://llm.example.com/v1',
            KUGNUS_GATEWAY_API_KEY: 'kugnus-key',
            KUGNUS_GATEWAY_MODEL: 'gemma4:12b-it-qat',
            OPENAI_API_KEY: 'openai-key',
            OPENAI_MODEL: 'gpt-5.4-mini'
        },
        expectOk: true
    },
    {
        name: 'local session secret is blocked',
        env: {
            KUGNUS_GATEWAY_BASE_URL: 'https://llm.example.com/v1',
            KUGNUS_GATEWAY_API_KEY: 'kugnus-key',
            KUGNUS_GATEWAY_MODEL: 'gemma4:12b-it-qat',
            SESSION_SECRET: 'codedrop-local-dev-session-secret-change-for-release'
        },
        expectOk: false,
        expectError: 'SESSION_SECRET must be a long random production secret'
    },
    {
        name: 'localhost allowed origin is blocked',
        env: {
            KUGNUS_GATEWAY_BASE_URL: 'https://llm.example.com/v1',
            KUGNUS_GATEWAY_API_KEY: 'kugnus-key',
            KUGNUS_GATEWAY_MODEL: 'gemma4:12b-it-qat',
            ALLOWED_ORIGINS: 'http://localhost:3001'
        },
        expectOk: false,
        expectError: 'ALLOWED_ORIGINS must contain only public https origins'
    }
];

const results = cases.map(testCase => {
    const result = runReleaseCheck(testCase.env);
    assert(result.data.ok === testCase.expectOk, `${testCase.name}: expected ok=${testCase.expectOk}, got ${result.data.ok}\n${JSON.stringify(result.data, null, 2)}`);
    assert((result.status === 0) === testCase.expectOk, `${testCase.name}: exit status mismatch ${result.status}`);
    if (testCase.expectError) {
        assert(includes(result.data.errors, testCase.expectError), `${testCase.name}: missing expected error "${testCase.expectError}"\n${JSON.stringify(result.data, null, 2)}`);
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
