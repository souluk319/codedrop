import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import https from 'node:https';
import { Resolver, resolve4 } from 'node:dns/promises';

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
const allowPrivate = args.get('allow-private') === '1' || process.env.KUGNUS_GATEWAY_ALLOW_PRIVATE === '1';

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

function extractAnswer(data) {
    const choice = Array.isArray(data?.choices) ? data.choices[0] : null;
    return String(choice?.message?.content || choice?.text || '').trim();
}

async function resolveGatewayAddresses(hostname) {
    const attempts = [
        { label: 'system', run: () => resolve4(hostname) },
        {
            label: 'cloudflare',
            run: () => {
                const resolver = new Resolver();
                resolver.setServers(['1.1.1.1', '1.0.0.1']);
                return resolver.resolve4(hostname);
            }
        },
        {
            label: 'google',
            run: () => {
                const resolver = new Resolver();
                resolver.setServers(['8.8.8.8', '8.8.4.4']);
                return resolver.resolve4(hostname);
            }
        }
    ];

    const errors = [];
    for (const attempt of attempts) {
        try {
            const addresses = await attempt.run();
            if (Array.isArray(addresses) && addresses.length) return addresses;
        } catch (err) {
            errors.push(`${attempt.label}:${err.code || err.message}`);
        }
    }

    const err = new Error(`KUGNUS gateway DNS fallback failed for ${hostname} (${errors.join(', ')})`);
    err.code = 'KUGNUS_DNS_FALLBACK_FAILED';
    throw err;
}

function httpsTextRequestWithLookup(urlString, options, address) {
    const url = new URL(urlString);
    const body = options.body || '';
    return new Promise((resolve, reject) => {
        const request = https.request({
            method: options.method || 'GET',
            hostname: url.hostname,
            port: url.port || 443,
            path: `${url.pathname}${url.search}`,
            headers: options.headers || {},
            lookup: (hostname, lookupOptions, callback) => {
                if (typeof lookupOptions === 'function') {
                    callback = lookupOptions;
                    lookupOptions = {};
                }
                if (lookupOptions?.all) {
                    callback(null, [{ address, family: 4 }]);
                    return;
                }
                callback(null, address, 4);
            }
        }, response => {
            let text = '';
            response.setEncoding('utf8');
            response.on('data', chunk => { text += chunk; });
            response.on('end', () => {
                resolve({
                    ok: response.statusCode >= 200 && response.statusCode < 300,
                    status: response.statusCode || 0,
                    text
                });
            });
        });

        request.on('error', reject);

        const abort = () => request.destroy(new Error('Request aborted'));
        if (options.signal) {
            if (options.signal.aborted) return abort();
            options.signal.addEventListener('abort', abort, { once: true });
        }

        if (body) request.write(body);
        request.end();
    });
}

async function fetchGatewayText(url, options) {
    try {
        const res = await fetch(url, options);
        return {
            ok: res.ok,
            status: res.status,
            text: await res.text()
        };
    } catch (err) {
        const code = err?.cause?.code || err?.code || '';
        if (code !== 'ENOTFOUND' && code !== 'EAI_AGAIN') throw err;

        const parsed = new URL(url);
        const addresses = await resolveGatewayAddresses(parsed.hostname);
        let lastError = err;
        for (const address of addresses) {
            try {
                return await httpsTextRequestWithLookup(url, options, address);
            } catch (fallbackErr) {
                lastError = fallbackErr;
            }
        }
        throw lastError;
    }
}

function fetchErrorDetail(err) {
    const cause = err?.cause || {};
    const code = cause.code || err?.code || '';
    return {
        errorName: err?.name || 'Error',
        errorCode: code || undefined,
        errorMessage: err?.message || String(err),
        errorCause: cause.message || undefined,
        dnsHint: code === 'ENOTFOUND'
            ? 'DNS lookup failed. Create the server.kugnus.com DNS/custom-domain record or use the live platform URL.'
            : undefined
    };
}

const baseUrl = value('KUGNUS_GATEWAY_BASE_URL');
const apiKey = value('KUGNUS_GATEWAY_API_KEY');
const model = value('KUGNUS_GATEWAY_MODEL') || value('KUGNUS_CHAT_MODEL');
const timeoutMs = Math.max(3000, Math.min(Number(args.get('timeout-ms') || process.env.KUGNUS_GATEWAY_LIVE_TIMEOUT_MS || 20_000), 60_000));
const envStyle = 'kugnus-gateway';
const expectedRuntimeRoute = 'gateway';

function observedOpenAiEnv() {
    const openAiModel = value('OPENAI_MODEL');
    return {
        apiKey: value('OPENAI_API_KEY') ? 'present' : 'missing',
        model: openAiModel || 'missing',
        role: 'GPT fallback only'
    };
}

if (!baseUrl || !apiKey || !model) {
    fail('Missing KUGNUS gateway env. Set KUGNUS_GATEWAY_BASE_URL, KUGNUS_GATEWAY_API_KEY, and KUGNUS_GATEWAY_MODEL or KUGNUS_CHAT_MODEL.', {
        envFile: fs.existsSync(envPath) ? path.relative(root, envPath) || envFile : '(process env only)',
        hasBaseUrl: Boolean(baseUrl),
        hasApiKey: Boolean(apiKey),
        hasModel: Boolean(model),
        acceptedEnv: [
            'KUGNUS_GATEWAY_BASE_URL + KUGNUS_GATEWAY_API_KEY + KUGNUS_GATEWAY_MODEL',
            'KUGNUS_GATEWAY_BASE_URL + KUGNUS_GATEWAY_API_KEY + KUGNUS_CHAT_MODEL'
        ],
        currentOpenAiEnv: observedOpenAiEnv()
    });
}

if (!allowPrivate && !publicHttpsUrl(baseUrl)) {
    fail('KUGNUS gateway live check requires a public https gateway URL, not localhost/private/direct Ollama', {
        envFile: fs.existsSync(envPath) ? path.relative(root, envPath) || envFile : '(process env only)',
        gatewayHost: gatewayHost(baseUrl),
        localTestHint: 'For local/Tailscale validation run with --allow-private.'
    });
}

const controller = new AbortController();
const started = Date.now();
const timeout = setTimeout(() => controller.abort(), timeoutMs);

try {
    const res = await fetchGatewayText(chatCompletionsUrl(baseUrl), {
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
    const text = res.text;
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
        route: expectedRuntimeRoute,
        envStyle,
        allowPrivate,
        gatewayHost: gatewayHost(baseUrl),
        model,
        elapsedMs: Date.now() - started,
        answerChars: answer.length
    }, null, 2));
} catch (err) {
    fail(err.name === 'AbortError' ? 'KUGNUS gateway live check timed out' : err.message, {
        gatewayHost: gatewayHost(baseUrl),
        model,
        timeoutMs,
        ...fetchErrorDetail(err)
    });
} finally {
    clearTimeout(timeout);
}
