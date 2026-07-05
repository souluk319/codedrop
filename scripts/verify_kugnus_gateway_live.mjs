import fs from 'fs';
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

const envFile = args.get('env-file') || process.env.KUGNUS_GATEWAY_ENV_FILE || '.env';
const envPath = path.resolve(root, envFile);
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false, quiet: true });
}

function fail(message, extra = {}) {
    console.error(JSON.stringify({
        kugnusGatewayLive: 'fail',
        message,
        ...extra
    }, null, 2));
    process.exit(1);
}

function value(name) {
    return String(process.env[name] || '').trim();
}

function publicHttpsUrl(url) {
    return /^https:\/\//i.test(url)
        && !/\/\/(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.)/i.test(url);
}

function chatCompletionsUrl(baseUrl) {
    const base = baseUrl.replace(/\/+$/, '');
    if (/\/chat\/completions$/i.test(base)) return base;
    if (/\/v1$/i.test(base)) return `${base}/chat/completions`;
    return `${base}/v1/chat/completions`;
}

function gatewayHost(baseUrl) {
    try {
        const parsed = new URL(baseUrl);
        return parsed.host;
    } catch {
        return '(invalid)';
    }
}

function openAiAliasLooksLikeKugnus() {
    const base = value('OPENAI_BASE_URL');
    const model = value('OPENAI_MODEL');
    if (!base || !value('OPENAI_API_KEY') || !model) return false;
    if (/api\.openai\.com/i.test(base)) return false;
    return process.env.KUGNUS_USE_OPENAI_ENV === '1'
        || /gemma|kugnus|ollama|llama|qwen|mistral|local/i.test(model);
}

function extractAnswer(data) {
    const choice = Array.isArray(data?.choices) ? data.choices[0] : null;
    return String(choice?.message?.content || choice?.text || '').trim();
}

const useOpenAiAlias = !value('KUGNUS_GATEWAY_BASE_URL') && openAiAliasLooksLikeKugnus();
const baseUrl = value('KUGNUS_GATEWAY_BASE_URL') || value('KUGNUS_OPENAI_BASE_URL') || (useOpenAiAlias ? value('OPENAI_BASE_URL') : '');
const apiKey = value('KUGNUS_GATEWAY_API_KEY') || value('KUGNUS_OPENAI_API_KEY') || (useOpenAiAlias ? value('OPENAI_API_KEY') : '');
const model = value('KUGNUS_GATEWAY_MODEL') || value('KUGNUS_MODEL') || value('KUGNUS_OPENAI_MODEL') || (useOpenAiAlias ? value('OPENAI_MODEL') : '');
const timeoutMs = Math.max(3000, Math.min(Number(args.get('timeout-ms') || process.env.KUGNUS_GATEWAY_LIVE_TIMEOUT_MS || 20_000), 60_000));

if (!baseUrl || !apiKey || !model) {
    fail('Missing KUGNUS gateway env. Set KUGNUS_GATEWAY_* or a safe OPENAI_* alias with a local KUGNUS model.', {
        envFile: fs.existsSync(envPath) ? path.relative(root, envPath) || envFile : '(process env only)',
        hasBaseUrl: Boolean(baseUrl),
        hasApiKey: Boolean(apiKey),
        hasModel: Boolean(model)
    });
}

if (!publicHttpsUrl(baseUrl)) {
    fail('KUGNUS gateway live check requires a public https gateway URL, not localhost/private/direct Ollama', {
        envFile: fs.existsSync(envPath) ? path.relative(root, envPath) || envFile : '(process env only)',
        gatewayHost: gatewayHost(baseUrl)
    });
}

const controller = new AbortController();
const started = Date.now();
const timeout = setTimeout(() => controller.abort(), timeoutMs);

try {
    const res = await fetch(chatCompletionsUrl(baseUrl), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        signal: controller.signal,
        body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: 'Reply only OK.' }],
            temperature: 0,
            max_completion_tokens: 16,
            stream: false
        })
    });
    const text = await res.text();
    let data = {};
    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        data = { raw: text.slice(0, 240) };
    }

    if (!res.ok) {
        fail(`KUGNUS gateway returned HTTP ${res.status}`, {
            gatewayHost: gatewayHost(baseUrl),
            model,
            responsePreview: typeof data.raw === 'string'
                ? data.raw
                : JSON.stringify(data).slice(0, 240)
        });
    }

    const answer = extractAnswer(data);
    if (!answer) {
        fail('KUGNUS gateway returned an empty chat completion', {
            gatewayHost: gatewayHost(baseUrl),
            model
        });
    }

    console.log(JSON.stringify({
        kugnusGatewayLive: 'ok',
        route: 'gateway',
        envStyle: useOpenAiAlias ? 'openai-env-alias' : 'kugnus-gateway',
        gatewayHost: gatewayHost(baseUrl),
        model,
        elapsedMs: Date.now() - started,
        answerChars: answer.length
    }, null, 2));
} catch (err) {
    fail(err.name === 'AbortError' ? 'KUGNUS gateway live check timed out' : err.message, {
        gatewayHost: gatewayHost(baseUrl),
        model,
        timeoutMs
    });
} finally {
    clearTimeout(timeout);
}
