import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import crypto from "crypto";
dotenv.config({ path: [".env.local", ".env"], quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IS_PRODUCTION = process.env.NODE_ENV === "production";

function csvValues(value) {
    return String(value || "")
        .split(",")
        .map(item => item.trim())
        .filter(Boolean);
}

function privateHostname(hostname) {
    const host = String(hostname || "").toLowerCase();
    return host === "localhost"
        || host.endsWith(".local")
        || /^127\./.test(host)
        || /^0\./.test(host)
        || /^10\./.test(host)
        || /^192\.168\./.test(host)
        || /^172\.(1[6-9]|2\d|3[01])\./.test(host)
        || /^100\./.test(host);
}

function publicHttpsUrlLike(value) {
    try {
        const parsed = new URL(String(value || "").trim());
        return parsed.protocol === "https:" && !privateHostname(parsed.hostname);
    } catch {
        return false;
    }
}

function validateProductionConfig() {
    if (!IS_PRODUCTION) return [];

    const errors = [];
    const sessionSecret = String(process.env.SESSION_SECRET || "").trim();
    if (!sessionSecret) {
        errors.push("SESSION_SECRET is required in production");
    } else if (sessionSecret.length < 32 || /local|dev|change|codedrop-local/i.test(sessionSecret)) {
        errors.push("SESSION_SECRET must be a long random production secret");
    }

    const origins = csvValues(process.env.ALLOWED_ORIGINS);
    if (!origins.length) {
        errors.push("ALLOWED_ORIGINS is required in production");
    } else {
        const invalidOrigins = origins.filter(origin => !publicHttpsUrlLike(origin));
        if (invalidOrigins.length) {
            errors.push(`ALLOWED_ORIGINS must contain only public https origins: ${invalidOrigins.join(", ")}`);
        }
    }

    for (const name of ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"]) {
        if (!String(process.env[name] || "").trim()) errors.push(`${name} is required in production`);
    }

    for (const name of ["KUGNUS_GATEWAY_BASE_URL", "KUGNUS_GATEWAY_API_KEY", "KUGNUS_GATEWAY_MODEL"]) {
        if (!String(process.env[name] || "").trim()) errors.push(`${name} is required in production`);
    }

    const gatewayBase = String(process.env.KUGNUS_GATEWAY_BASE_URL || "").trim();
    if (gatewayBase && !publicHttpsUrlLike(gatewayBase)) {
        errors.push(`KUGNUS_GATEWAY_BASE_URL must be a public https URL: ${gatewayBase}`);
    }

    const openAiModel = String(process.env.OPENAI_MODEL || "").trim();
    if (process.env.OPENAI_API_KEY && openAiModel && !/(^|[-.])mini($|[-.])/i.test(openAiModel)) {
        errors.push(`OPENAI_MODEL fallback must stay mini in production: ${openAiModel}`);
    }

    return errors;
}

const productionConfigErrors = validateProductionConfig();
if (productionConfigErrors.length) {
    throw new Error(`Unsafe production configuration:\n- ${productionConfigErrors.join("\n- ")}`);
}

const app = express();
app.set("etag", false);
const CODEDROP_BASE_PATH = "/games/codedrop";
const allowedOrigins = csvValues(process.env.ALLOWED_ORIGINS ||
    "http://localhost:3001,http://127.0.0.1:3001,https://codedrop-se9n.onrender.com");

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
});

function preventStaleUiCache(res) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
}

function sendNoStoreFile(res, filePath, onError) {
    preventStaleUiCache(res);
    res.sendFile(filePath, { cacheControl: false, lastModified: false }, onError);
}

function sendIndexHtml(res) {
    const indexPath = path.join(__dirname, "index.html");
    sendNoStoreFile(res, indexPath, (err) => {
        if (err) {
            console.error("Error serving index.html:", err);
            res.status(500).send("Error loading game: " + err.message);
        }
    });
}

if (process.env.REQUEST_LOGS === "1") {
    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
        next();
    });
}

const CODEDROP_PREFIXED_API_PATHS = new Set([
    "/health",
    "/ready",
    "/login",
    "/register",
    "/withdraw",
    "/submit",
    "/leaderboard"
]);

app.use((req, res, next) => {
    if (!req.url.startsWith(`${CODEDROP_BASE_PATH}/`)) return next();
    const unprefixedUrl = req.url.slice(CODEDROP_BASE_PATH.length) || "/";
    const pathname = unprefixedUrl.split("?")[0];
    if (pathname.startsWith("/api/") || CODEDROP_PREFIXED_API_PATHS.has(pathname)) {
        req.url = unprefixedUrl;
    }
    next();
});

// Serve index.html at root (Explicitly before static)
app.get('/', (req, res) => {
    sendIndexHtml(res);
});

["privacy.html", "terms.html", "data-deletion.html", "meta-review.html"].forEach(file => {
    app.get(`/${file}`, (req, res) => {
        sendNoStoreFile(res, path.join(__dirname, file));
    });
});

app.use("/js", express.static(path.join(__dirname, "js"), {
    etag: false,
    lastModified: false,
    setHeaders: preventStaleUiCache
}));
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use("/sound", express.static(path.join(__dirname, "sound")));
app.use(`${CODEDROP_BASE_PATH}/js`, express.static(path.join(__dirname, "js"), {
    etag: false,
    lastModified: false,
    setHeaders: preventStaleUiCache
}));
app.use(`${CODEDROP_BASE_PATH}/assets`, express.static(path.join(__dirname, "assets")));
app.use(`${CODEDROP_BASE_PATH}/sound`, express.static(path.join(__dirname, "sound")));

function dbSslConfig() {
    const value = String(process.env.DB_SSL || "").trim().toLowerCase();
    if (["0", "false", "off", "no"].includes(value)) return undefined;
    return {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    };
}

// 🔹 MySQL 연결 설정
const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 4000,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "codedrop_db",
    ssl: dbSslConfig(),
    waitForConnections: true,
    connectionLimit: 10,
});

const sessions = new Map();
const rateBuckets = new Map();
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const SESSION_SECRET = (process.env.SESSION_SECRET || "codedrop-local-dev-session-secret").trim();
const DIFFICULTIES = new Set(["easy", "normal", "developer"]);
const PACKS = new Set(["python", "js", "http", "cli", "linux", "oc_core", "vocab", "mix"]);
const NICKNAME_RE = /^[A-Za-z0-9_-]{3,16}$/;
const MAX_SUBMITTED_SCORE = 25000;
const MAX_CHAT_MESSAGE_LEN = 1200;
const MAX_CHAT_HISTORY = 8;
const LLM_TIMEOUT_MS = Math.max(1000, Math.min(Number(process.env.LLM_TIMEOUT_MS) || 30_000, 120_000));
const PACK_MAKER_TIMEOUT_MS = Math.max(LLM_TIMEOUT_MS, Math.min(Number(process.env.PACK_MAKER_TIMEOUT_MS) || 600_000, 600_000));
const KUGNUS_HEALTH_TIMEOUT_MS = Math.max(1000, Math.min(Number(process.env.KUGNUS_HEALTH_TIMEOUT_MS) || 12_000, 30_000));
const CHAT_ENGINES = new Set(["kugnus", "openai"]);
const PACK_STATUSES = new Set(["draft", "pending", "approved", "rejected"]);
const MAX_PACK_TITLE_LEN = 60;
const MAX_PACK_DESC_LEN = 240;
const MIN_PACK_ITEMS = 10;
const MAX_PACK_ITEMS = 120;
const MAX_PACK_TERM_LEN = 80;
const MAX_PACK_ITEM_DESC_LEN = 180;
const MAX_PACK_SOURCES = 3;
const DEFAULT_PACK_TARGET_COUNT = 30;
const PACK_REPAIR_ATTEMPTS = 2;
const PACK_FINAL_FILL_ATTEMPTS = 2;
const PACK_WIDE_FILL_ATTEMPTS = 2;
const PACK_MICRO_SWEEP_ATTEMPTS = 4;
const PACK_MAKER_BATCH_SIZE = 25;
const PACK_MAKER_BATCH_TIMEOUT_MS = Math.max(10_000, Math.min(Number(process.env.PACK_MAKER_BATCH_TIMEOUT_MS) || 180_000, 180_000));
const PACK_MAKER_TEMPERATURE = Math.max(0.1, Math.min(Number(process.env.PACK_MAKER_TEMPERATURE) || 0.65, 1.2));
const PACK_MAKER_SWEEP_TEMPERATURE = Math.max(PACK_MAKER_TEMPERATURE, Math.min(Number(process.env.PACK_MAKER_SWEEP_TEMPERATURE) || 0.85, 1.3));
const PACK_ADMIN_NICKNAMES = new Set(
    (process.env.PACK_ADMIN_NICKNAMES || "")
        .split(",")
        .map(name => name.trim().toLowerCase())
        .filter(Boolean)
);
let customPackTablesReady = null;

function envFirst(names) {
    for (const name of names) {
        const value = process.env[name];
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
}

function envFirstEntry(names) {
    for (const name of names) {
        const value = process.env[name];
        if (typeof value === "string" && value.trim()) return { name, value: value.trim() };
    }
    return { name: "", value: "" };
}

const DUCKDUCKGO_ENV_NAMES = [
    "DUCKDUCKGO_API_KEY"
];

const GENERIC_OPENAI_KEY_ENV_NAMES = [
    "OPENAI_API_KEY"
];

const KUGNUS_BASE_ENV_NAMES = [
    "KUGNUS_GATEWAY_BASE_URL"
];

const KUGNUS_KEY_ENV_NAMES = [
    "KUGNUS_GATEWAY_API_KEY"
];

const KUGNUS_MODEL_ENV_NAMES = [
    "KUGNUS_GATEWAY_MODEL"
];

function normalizeOpenAiMiniModel(value) {
    return String(value || "gpt-5.4-mini")
        .trim()
        .toLowerCase()
        .replace(/[\s_]+/g, "-");
}

function isAllowedOpenAiMiniModel(model) {
    return /(^|[-.])mini($|[-.])/.test(model);
}

function envFlag(value) {
    return /^(1|true|yes|on)$/i.test(String(value || "").trim());
}

const LEARN_CHAT_SYSTEM_PROMPT = [
    "너는 CodeDrop OCP Edition의 EX280 학습 조교다.",
    "사용자는 OpenShift/리눅스 명령을 손에 익히는 중이다.",
    "항상 한국어로 답하고, 시험장에서 바로 쓸 수 있는 명령 중심으로 짧고 정확하게 설명한다.",
    "정답만 던지기보다 왜 이 명령을 쓰는지, 자주 틀리는 플래그, 검증 명령을 함께 알려준다.",
    "사용자가 현재 퀴즈를 풀고 있으면 먼저 힌트와 사고 방향을 주고, 사용자가 명시적으로 정답을 원할 때만 완성 명령을 제시한다.",
    "확실하지 않은 시험 정책이나 버전 의존 내용은 단정하지 말고 확인 필요성을 말한다."
].join(" ");

const PACK_MAKER_SYSTEM_PROMPT = [
    "너는 CodeDrop의 PACK MAKER다.",
    "사용자가 특정 도메인을 익히기 위해 단문 낙하 타자게임용 데이터팩을 만들고 있다.",
    "검색 결과를 근거로 고유명사, 명령어, 약어, 제품명, 핵심 용어를 골라라.",
    "너무 긴 문장보다 손에 익힐 수 있는 짧은 term을 우선한다.",
    "응답은 불필요한 장문 설명 없이 JSON draft 중심으로 작성한다.",
    "마지막에는 반드시 JSON draft 객체를 포함한다.",
    "JSON 형식은 {\"title\":\"...\",\"description\":\"...\",\"items\":[{\"term\":\"...\",\"desc\":\"...\",\"sources\":[{\"title\":\"...\",\"url\":\"https://...\",\"snippet\":\"...\"}]}]} 이다.",
    "별도 목표 개수가 주어지면 items 배열은 반드시 그 개수와 정확히 일치해야 한다.",
    "term 언어 지시가 있으면 모든 term은 그 언어를 따른다. desc는 한국어 한 줄 설명으로 쓴다.",
    "중복 term은 절대 넣지 않는다.",
    "raw HTML은 절대 쓰지 않는다."
].join(" ");

function createSession(user) {
    const payload = {
        userId: user.id,
        nickname: user.nickname,
        expiresAt: Date.now() + SESSION_TTL_MS,
        nonce: crypto.randomBytes(8).toString("hex")
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = crypto.createHmac("sha256", SESSION_SECRET).update(encoded).digest("base64url");
    const token = `v1.${encoded}.${signature}`;
    sessions.set(token, {
        userId: user.id,
        nickname: user.nickname,
        expiresAt: payload.expiresAt
    });
    return token;
}

function readSignedSession(token) {
    const parts = String(token || "").split(".");
    if (parts.length !== 3 || parts[0] !== "v1") return null;
    const [, encoded, signature] = parts;
    const expected = crypto.createHmac("sha256", SESSION_SECRET).update(encoded).digest("base64url");
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(signature);
    if (expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) return null;

    try {
        const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
        if (!payload || payload.expiresAt < Date.now()) return null;
        return {
            userId: payload.userId,
            nickname: payload.nickname,
            expiresAt: payload.expiresAt
        };
    } catch (err) {
        return null;
    }
}

async function authUser(req, res, next) {
    const header = req.get("authorization") || "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) return res.status(401).json({ error: "Authentication required" });

    const token = match[1].trim();
    const session = sessions.get(token) || readSignedSession(token);
    if (!session || session.expiresAt < Date.now()) {
        if (session) sessions.delete(token);
        return res.status(401).json({ error: "Authentication required", code: "SESSION_EXPIRED" });
    }

    try {
        const [rows] = await db.query("SELECT id, nickname FROM users WHERE id = ? LIMIT 1", [session.userId]);
        if (rows.length === 0) {
            sessions.delete(token);
            return res.status(401).json({ error: "Authentication required", code: "SESSION_REVOKED" });
        }

        req.sessionToken = token;
        req.user = { id: rows[0].id, nickname: rows[0].nickname };
        next();
    } catch (err) {
        console.error("Auth validation failed:", err.message);
        res.status(503).json({ error: "Authentication service unavailable" });
    }
}

app.get("/api/session", authUser, rateLimit("session", 120, 60_000, req => req.user.id), (req, res) => {
    res.json({ user_id: req.user.id, nickname: req.user.nickname });
});

function validNickname(nickname) {
    return typeof nickname === "string" && NICKNAME_RE.test(nickname);
}

function boundedNumber(value, min, max) {
    const num = Number(value);
    if (!Number.isFinite(num)) return null;
    const rounded = Math.round(num);
    if (rounded < min || rounded > max) return null;
    return rounded;
}

function normalizeCategory(value, allowed) {
    if (value === undefined || value === null || value === "") return null;
    const normalized = String(value).toLowerCase();
    return allowed.has(normalized) ? normalized : false;
}

function rateLimit(name, maxRequests, windowMs = 60_000, keyFn = req => req.ip) {
    return (req, res, next) => {
        const now = Date.now();
        const key = `${name}:${keyFn(req) || "unknown"}`;
        let bucket = rateBuckets.get(key);

        if (!bucket || bucket.resetAt <= now) {
            bucket = { count: 0, resetAt: now + windowMs };
        }

        bucket.count += 1;
        rateBuckets.set(key, bucket);

        if (bucket.count > maxRequests) {
            res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
            return res.status(429).json({ error: "Too many requests" });
        }

        next();
    };
}

function sanitizeChatText(value, limit = MAX_CHAT_MESSAGE_LEN) {
    if (typeof value !== "string") return "";
    return value.replace(/\s+/g, " ").trim().slice(0, limit);
}

function sanitizeChatContext(context) {
    if (!context || typeof context !== "object") return {};
    return {
        lessonTitle: sanitizeChatText(context.lessonTitle, 120),
        trackTitle: sanitizeChatText(context.trackTitle, 120),
        phase: sanitizeChatText(context.phase, 40),
        progress: sanitizeChatText(context.progress, 80),
        prompt: sanitizeChatText(context.prompt, 600),
        command: sanitizeChatText(context.command, 400),
        output: sanitizeChatText(context.output, 800),
        explanation: sanitizeChatText(context.explanation, 800),
        hint: sanitizeChatText(context.hint, 400)
    };
}

function sanitizeChatHistory(history) {
    if (!Array.isArray(history)) return [];

    return history
        .slice(-MAX_CHAT_HISTORY)
        .map(item => ({
            role: item && item.role === "assistant" ? "assistant" : "user",
            content: sanitizeChatText(item && item.content, 900)
        }))
        .filter(item => item.content);
}

function normalizeChatEngine(value) {
    const engine = String(value || process.env.DEFAULT_CHAT_ENGINE || "kugnus").toLowerCase().replace(/[\s_]+/g, "-");
    if (engine === "openai" || engine === "gpt-5-4-mini" || engine === "gpt54-mini") return "openai";
    if (engine === "kugnus" || engine === "kugnus-ai" || engine === "local") return "kugnus";
    return CHAT_ENGINES.has(engine) ? engine : null;
}

function learnContextMessage(context) {
    const lines = [
        `레슨: ${context.lessonTitle || "-"}`,
        `트랙: ${context.trackTitle || "-"}`,
        `현재 단계: ${context.phase || "-"} ${context.progress || ""}`.trim(),
        `화면 지문: ${context.prompt || "-"}`,
        `현재 명령/모범답안: ${context.command || "-"}`,
        `터미널 출력: ${context.output || "-"}`,
        `해설: ${context.explanation || "-"}`,
        `힌트: ${context.hint || "-"}`
    ];
    return `현재 학습 화면 컨텍스트:\n${lines.join("\n")}`;
}

function inferLlmProvider(baseUrl) {
    if (/ollama|:11434|\/api\/chat|\/api\/generate/i.test(baseUrl)) return "ollama";
    return "openai";
}

function chatCompletionsUrl(baseUrl, provider) {
    if (/\/(chat\/completions|api\/chat|api\/generate)$/i.test(baseUrl)) return baseUrl;
    if (provider === "ollama") return `${baseUrl}/api/chat`;

    const openAiBase = /\/v1$/i.test(baseUrl) ? baseUrl : `${baseUrl}/v1`;
    return `${openAiBase}/chat/completions`;
}

function safeLlmTargetUrlParts(url) {
    if (process.env.NODE_ENV === "production" && !envFlag(process.env.LLM_TARGET_DIAGNOSTICS)) return undefined;
    try {
        const parsed = new URL(url);
        return { host: parsed.host, path: parsed.pathname };
    } catch {
        return { host: "", path: "" };
    }
}

function kugnusRouteFromEnvName(envName) {
    return envName === "KUGNUS_GATEWAY_BASE_URL" ? "gateway" : "unknown";
}

function buildLlmTarget(engine = "kugnus") {
    if (engine === "openai") {
        const baseUrl = "https://api.openai.com/v1";
        const model = normalizeOpenAiMiniModel(process.env.OPENAI_MODEL || "gpt-5.4-mini");
        const apiKey = envFirst(GENERIC_OPENAI_KEY_ENV_NAMES);

        if (!apiKey) {
            const err = new Error("OpenAI API key is not configured");
            err.status = 503;
            throw err;
        }

        if (!isAllowedOpenAiMiniModel(model)) {
            const err = new Error("Only OpenAI mini models are allowed for learn chat");
            err.status = 400;
            throw err;
        }

        const openAiBase = /\/v1$/i.test(baseUrl) ? baseUrl : `${baseUrl}/v1`;
        return {
            engine: "openai",
            label: "GPT 5.4 mini",
            provider: "openai",
            url: /\/chat\/completions$/i.test(baseUrl) ? baseUrl : `${openAiBase}/chat/completions`,
            model,
            apiKey
        };
    }

    const baseEntry = envFirstEntry(KUGNUS_BASE_ENV_NAMES);
    const modelEntry = envFirstEntry(KUGNUS_MODEL_ENV_NAMES);
    const keyEntry = envFirstEntry(KUGNUS_KEY_ENV_NAMES);
    let baseUrl = baseEntry.value;
    let model = modelEntry.value;
    let apiKey = keyEntry.value;
    let route = kugnusRouteFromEnvName(baseEntry.name);

    baseUrl = String(baseUrl || "").trim().replace(/\/+$/, "");
    model = String(model || "").trim();

    if (!baseUrl || !model) {
        const err = new Error("KUGNUS AI is not configured");
        err.status = 503;
        throw err;
    }

    const provider = inferLlmProvider(baseUrl);
    return {
        engine: "kugnus",
        label: "KUGNUS SERVER",
        provider,
        route,
        url: chatCompletionsUrl(baseUrl, provider),
        model,
        apiKey
    };
}

function duckDuckGoConfig() {
    return {
        provider: "duckduckgo",
        apiKey: envFirst(DUCKDUCKGO_ENV_NAMES),
        baseUrl: "https://api.duckduckgo.com"
    };
}

function isPackAdmin(user) {
    return Boolean(user?.nickname && PACK_ADMIN_NICKNAMES.has(String(user.nickname).toLowerCase()));
}

function packId(value) {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
        const err = new Error("Invalid pack id");
        err.status = 400;
        throw err;
    }
    return id;
}

function sanitizePackText(value, limit) {
    if (typeof value !== "string") return "";
    return value.replace(/\s+/g, " ").trim().slice(0, limit);
}

function sanitizeSourceUrl(value) {
    const text = sanitizePackText(value, 500);
    if (!text) return "";
    try {
        const url = new URL(text);
        if (url.protocol !== "http:" && url.protocol !== "https:") return "";
        return url.toString().slice(0, 500);
    } catch (err) {
        return "";
    }
}

function sanitizePackSource(source) {
    const url = sanitizeSourceUrl(source?.url);
    if (!url) return null;
    return {
        title: sanitizePackText(source?.title, 120) || url,
        url,
        snippet: sanitizePackText(source?.snippet, 220)
    };
}

function sanitizePackItems(items, { strict = true, requireSources = false, fallbackSources = [] } = {}) {
    if (!Array.isArray(items)) return [];
    const seen = new Set();
    const sanitized = [];
    const fallback = fallbackSources.map(sanitizePackSource).filter(Boolean).slice(0, MAX_PACK_SOURCES);

    for (const item of items) {
        const term = sanitizePackText(item?.term ?? item?.text ?? item?.word, MAX_PACK_TERM_LEN);
        const desc = sanitizePackText(item?.desc ?? item?.description ?? item?.explain, MAX_PACK_ITEM_DESC_LEN);
        if (!term || !desc) continue;

        const key = term.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        let sources = Array.isArray(item?.sources)
            ? item.sources.map(sanitizePackSource).filter(Boolean).slice(0, MAX_PACK_SOURCES)
            : [];
        if (sources.length === 0) sources = fallback;
        if (requireSources && sources.length === 0) continue;

        sanitized.push({ term, desc, sources });
        if (sanitized.length >= MAX_PACK_ITEMS) break;
    }

    return sanitized;
}

function sanitizePackPayload(body, { strict = true } = {}) {
    const title = sanitizePackText(body?.title, MAX_PACK_TITLE_LEN);
    const submitForReview = body?.submitForReview === true;
    const items = sanitizePackItems(body?.items, { strict, requireSources: submitForReview });
    const description = normalizePackDescriptionForItems(body?.description, title, items);

    if (strict) {
        if (title.length < 3) {
            const err = new Error("Pack title must be 3-60 characters");
            err.status = 400;
            throw err;
        }
        if (items.length < MIN_PACK_ITEMS || items.length > MAX_PACK_ITEMS) {
            const err = new Error(`Pack must contain ${MIN_PACK_ITEMS}-${MAX_PACK_ITEMS} valid items`);
            err.status = 400;
            throw err;
        }
    }

    return {
        id: body?.id ? packId(body.id) : null,
        title,
        description,
        items,
        submitForReview
    };
}

function normalizePackDescriptionForItems(description, title, items) {
    const clean = sanitizePackText(description, MAX_PACK_DESC_LEN);
    const safeTitle = sanitizePackText(title, MAX_PACK_TITLE_LEN) || "Custom Pack";
    const count = Array.isArray(items) ? items.length : 0;
    const terms = Array.isArray(items) ? items.map(item => item.term || "").join(" ") : "";
    const koreanTerms = Array.isArray(items)
        ? items.filter(item => /[가-힣]/.test(item.term || "")).length
        : 0;
    const languageText = koreanTerms > count / 2 ? `${count}개 한글 도메인 용어` : `${count} English domain terms`;
    const fallback = `${safeTitle} - ${languageText}`;
    const counts = [
        ...clean.matchAll(/(\d{1,3})\s*(?:개|terms?|items?|words?)/gi),
        ...clean.matchAll(/(\d{1,3})(?=[^0-9]{0,40}\b(?:terms?|items?|words?)\b)/gi)
    ]
        .map(match => Number(match[1]))
        .filter(Number.isFinite);

    if (!clean) return fallback;
    if (count > 0 && counts.some(value => value !== count)) return fallback;
    if (!/[가-힣A-Za-z]/.test(clean) && terms) return fallback;
    return clean;
}

function normalizeDraftFromLlm(value, fallbackSources = []) {
    const source = value && typeof value === "object" ? value : {};
    const title = sanitizePackText(source.title, MAX_PACK_TITLE_LEN) || "Generated Data Pack";
    const description = sanitizePackText(source.description, MAX_PACK_DESC_LEN) || "Pack Maker draft";
    const items = sanitizePackItems(source.items, { strict: false, fallbackSources });
    return { title, description, items };
}

function clampPackTargetCount(value) {
    const count = Number(value);
    if (!Number.isFinite(count)) return DEFAULT_PACK_TARGET_COUNT;
    return Math.max(MIN_PACK_ITEMS, Math.min(Math.round(count), MAX_PACK_ITEMS));
}

function extractPackTitle(message) {
    const text = sanitizePackText(message, MAX_CHAT_MESSAGE_LEN);
    const explicitTitle = text.match(/(?:이름은|제목은|타이틀은)\s*([가-힣A-Za-z0-9 _-]{2,30}?팩)/i);
    const candidates = [...text.matchAll(/([가-힣A-Za-z0-9_-]+(?:\s+[가-힣A-Za-z0-9_-]+){0,3}\s*팩)/g)];
    const explicit = explicitTitle || candidates.at(-1);
    if (!explicit) return "";

    return sanitizePackText(explicit[1]
        .replace(/\d{1,3}\s*(?:개|개만|단어|용어|terms?|items?|words?)/gi, "")
        .replace(/^.*(?:뽑아서|뽑아|만들어|생성해서|제작해서|작성해서)\s*/i, "")
        .replace(/^(?:만|만큼|정도)\s*/i, "")
        .replace(/^(?:한글|한국어|한국말|영어|영문|english)\s*(?:로\s*된|로된|로)?\s*/i, "")
        .replace(/^(?:단어|용어)\s*/i, "")
        .replace(/\s{2,}/g, " ")
        .trim(), MAX_PACK_TITLE_LEN);
}

function inferPackTermLanguage(message) {
    const text = String(message || "").toLowerCase();
    if (/(한글|한국어|한글로|한국어로|한국말)/i.test(message)) return "korean";
    if (/(영어|영문|english|영어로)/i.test(message) || /\benglish\b/.test(text)) return "english";
    return "auto";
}

function extractPackIntent(message) {
    const text = sanitizePackText(message, MAX_CHAT_MESSAGE_LEN);
    const countMatch =
        text.match(/(\d{1,3})\s*(?:개|단어|용어|terms?|items?|words?)/i) ||
        text.match(/(?:정확히|총|단어|용어|terms?|items?|words?)\s*(\d{1,3})/i);
    const requestedCount = clampPackTargetCount(countMatch ? countMatch[1] : DEFAULT_PACK_TARGET_COUNT);
    const termLanguage = inferPackTermLanguage(text);
    const title = extractPackTitle(text);
    const topic = sanitizePackText(text
        .replace(/(?:팩\s*)?(?:초안|만들어줘|만들|생성|제작|작성|뽑아줘|뽑아서|부탁).*$/i, "")
        .replace(/\d{1,3}\s*(?:개|단어|용어|terms?|items?|words?)/gi, "")
        .replace(/\s+/g, " ")
        .trim(), 160) || text;

    return { requestedCount, termLanguage, title, topic };
}

function packTopicSignal(intent) {
    return sanitizePackText(intent.topic || "", 160)
        .replace(/\b(?:pack|data pack|terms?|items?|words?|make|create|generate|draft|build)\b/gi, " ")
        .replace(/(?:팩|데이터팩|단어|용어|개|만들어줘|만들|생성|제작|작성|뽑아줘|뽑아서|초안|부탁|해줘)/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function isPackGenerationRequest(message, intent = extractPackIntent(message)) {
    const text = sanitizePackText(message, MAX_CHAT_MESSAGE_LEN);
    const compact = text.replace(/\s+/g, "");

    if (/^(되냐|돼|가능|가능해|가능한가|되나|되나요|테스트|test|help|도움|안녕|hi|hello)[?!.。]*$/i.test(compact)) {
        return false;
    }

    const hasCreateVerb = /(만들|생성|제작|작성|뽑|추출|정리|초안|추천|부탁|make|create|generate|draft|build)/i.test(text);
    const hasPackWord = /(?:팩|데이터팩|\bpack\b|\bdata\s*pack\b)/i.test(text);
    const hasTermHint = /(?:단어|용어|고유명사|명령어|커맨드|부품|키워드|어휘|\bterms?\b|\bitems?\b|\bwords?\b|\bvocab(?:ulary)?\b|\bglossary\b|\bcommands?\b)/i.test(text);
    const hasCount = /(\d{1,3})\s*(?:개|단어|용어|terms?|items?|words?)/i.test(text);
    const topicSignal = packTopicSignal(intent);
    const hasDomainSignal = /[가-힣A-Za-z0-9]{2,}/.test(topicSignal);

    return hasCreateVerb && hasDomainSignal && (hasPackWord || hasTermHint || hasCount);
}

function packMakerBriefResponse(message) {
    const korean = /[가-힣]/.test(message || "");
    if (korean) {
        return [
            "됩니다. 다만 Pack Maker는 일반 대화보다 데이터팩 생성 요청에 맞춰져 있습니다.",
            "",
            "한 문장에 아래 4가지를 넣으면 KUGNUS SERVER가 검색 근거를 보고 초안을 만듭니다.",
            "- 도메인: 자동차 정비, EX280, 간호학, 회계 등",
            "- 언어: 한글 또는 영어",
            "- 개수: 10-120개",
            "- 팩 이름: 카 파츠 팩처럼 저장될 이름",
            "",
            "예: 자동차 정비소에 취직하는데 한글 자동차부품 단어 50개로 카 파츠 팩 만들어줘"
        ].join("\n");
    }

    return [
        "Yes. Pack Maker is for data pack generation requests, not open-ended chat.",
        "",
        "Tell Pack Maker the domain, term language, item count, and pack name.",
        "Example: Make a Korean car-parts pack with 50 common auto repair terms."
    ].join("\n");
}

function packLanguageLabel(language) {
    if (language === "korean") return "KOREAN";
    if (language === "english") return "ENGLISH";
    return "DOMAIN";
}

function packLanguageInstruction(language) {
    if (language === "korean") return "모든 term은 반드시 한글이 포함된 자동차 현장 용어로 작성한다. ABS 같은 약어도 단독 term으로 쓰지 말고 'ABS 센서'처럼 한글 부품명과 함께 쓴다.";
    if (language === "english") return "모든 term은 영어 단어 또는 영어 약어로 작성한다. 한글 term은 넣지 않는다.";
    return "term은 사용자가 요구한 도메인에서 실제로 외울 가치가 있는 짧은 명사/약어/명령어로 작성한다.";
}

function packIntentMessage(intent) {
    return [
        `목표 item 개수: 정확히 ${intent.requestedCount}개`,
        `term 언어: ${packLanguageLabel(intent.termLanguage)}`,
        `팩 제목 후보: ${intent.title || "-"}`,
        `주제/상황: ${intent.topic || "-"}`,
        packLanguageInstruction(intent.termLanguage),
        "items 배열 길이가 목표 개수보다 적거나 많으면 실패다.",
        "JSON 밖 설명은 생략하거나 한 문장만 쓴다.",
        "마지막 JSON draft는 파싱 가능한 단일 객체여야 한다."
    ].join("\n");
}

function packMakerTokenBudget(count) {
    return Math.max(900, Math.min(5200, 500 + clampPackTargetCount(count) * 85));
}

function isLikelyLanguageMismatch(term, language) {
    const value = String(term || "");
    if (language === "korean") {
        return !/[가-힣]/.test(value) && /[A-Za-z]{2,}/.test(value);
    }
    if (language === "english") {
        return /[가-힣]/.test(value);
    }
    return false;
}

function draftLanguageMismatchCount(draft, intent) {
    if (intent.termLanguage === "auto") return 0;
    return draft.items.filter(item => isLikelyLanguageMismatch(item.term, intent.termLanguage)).length;
}

function fallbackDescriptionForIntent(intent, title) {
    const count = clampPackTargetCount(intent.requestedCount);
    if (intent.termLanguage === "korean") return `${title} - ${count}개 한글 도메인 용어`;
    if (intent.termLanguage === "english") return `${title} - ${count} English domain terms`;
    return `${title} - ${count} domain terms`;
}

function descriptionHasWrongTargetCount(description, intent) {
    const target = clampPackTargetCount(intent.requestedCount);
    const counts = [...String(description || "").matchAll(/(\d{1,3})\s*(?:개|terms?|items?|words?)/gi)]
        .map(match => Number(match[1]))
        .filter(Number.isFinite);
    return counts.some(count => count !== target);
}

function cleanDescriptionForIntent(description, intent, title) {
    const clean = sanitizePackText(description, MAX_PACK_DESC_LEN);
    if (!clean) return fallbackDescriptionForIntent(intent, title);
    if (/\bdata pack\b/i.test(clean) || /단어\s*만/.test(clean) || descriptionHasWrongTargetCount(clean, intent)) {
        return fallbackDescriptionForIntent(intent, title);
    }
    return clean;
}

function normalizeDraftForIntent(value, intent, fallbackSources = []) {
    const draft = normalizeDraftFromLlm(value, fallbackSources);
    const title = intent.title || draft.title;
    const safeTitle = sanitizePackText(title, MAX_PACK_TITLE_LEN) || "Generated Data Pack";
    return {
        title: safeTitle,
        description: cleanDescriptionForIntent(draft.description, intent, safeTitle),
        items: draft.items.slice(0, intent.requestedCount)
    };
}

function mergeDraftsForIntent(baseDraft, candidateDraft, intent) {
    const merged = {
        title: intent.title || candidateDraft.title || baseDraft.title,
        description: candidateDraft.description || baseDraft.description,
        items: []
    };
    const seen = new Set();

    for (const item of [...baseDraft.items, ...candidateDraft.items]) {
        const key = String(item.term || "").toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        merged.items.push(item);
        if (merged.items.length >= intent.requestedCount) break;
    }

    return normalizeDraftForIntent(merged, intent);
}

function draftMeetsPackIntent(draft, intent) {
    if (draft.items.length !== intent.requestedCount) return false;
    const mismatchCount = draftLanguageMismatchCount(draft, intent);
    if (intent.termLanguage === "korean") return mismatchCount <= Math.max(2, Math.floor(intent.requestedCount * 0.1));
    if (intent.termLanguage === "english") return mismatchCount === 0;
    return true;
}

function buildPackMakerRepairMessages(payload, draft, reason) {
    return [
        { role: "system", content: PACK_MAKER_SYSTEM_PROMPT },
        { role: "system", content: `이번 요청 계약:\n${packIntentMessage(payload.intent)}` },
        { role: "system", content: `검색 결과:\n${payload.sourceBundle}` },
        { role: "system", content: `현재 draft JSON:\n${JSON.stringify(draft).slice(0, 12000)}` },
        {
            role: "user",
            content: [
                `보강 사유: ${reason}`,
                `기존 유효 term은 최대한 유지하고 부족분을 추가해 전체 items를 정확히 ${payload.intent.requestedCount}개로 맞춰라.`,
                "중복 term 없이, 사용자가 요구한 언어를 지켜라.",
                "최종 응답은 파싱 가능한 JSON draft 객체 하나를 마지막에 포함해야 한다."
            ].join("\n")
        }
    ];
}

function packMakerBatchFocus(intent, batchNumber) {
    const topic = `${intent.topic || ""} ${intent.title || ""}`.toLowerCase();
    const carRepair = /(자동차|정비|차량|부품|카\s*파츠|car|auto|vehicle|parts)/i.test(topic);

    const carGroups = [
        "엔진 내부 부품, 흡기/배기, 윤활, 냉각 계통",
        "브레이크, 조향, 서스펜션, 하체 연결 부품",
        "전장, 센서, 배터리, 발전기, 조명, 배선 부품",
        "변속기, 구동계, 차축, 클러치, 디퍼런셜 부품",
        "외장, 차체 패널, 유리, 와이퍼, 실내 조작 부품",
        "소모품, 필터, 호스, 벨트, 가스켓, 정비 현장 교체 부품"
    ];

    const genericGroups = [
        "입문자가 먼저 외워야 하는 핵심 기본 용어",
        "하위 구성요소, 세부 부품, 관련 명령/속성",
        "현장에서 자주 보는 상태, 오류, 점검, 검증 용어",
        "운영/실무 작업에 쓰이는 도구, 절차, 액션 용어",
        "고급 주제, 약어, 주변 시스템, 연관 개념",
        "실전 문제에서 헷갈리기 쉬운 비슷하지만 다른 용어"
    ];

    const groups = carRepair ? carGroups : genericGroups;
    return groups[(Math.max(1, Number(batchNumber) || 1) - 1) % groups.length];
}

function packMakerWideFocusList(intent) {
    const topic = `${intent.topic || ""} ${intent.title || ""}`.toLowerCase();
    if (/(자동차|정비|차량|부품|카\s*파츠|car|auto|vehicle|parts)/i.test(topic)) {
        return [
            "엔진: 실린더, 피스톤, 밸브, 점화, 흡기, 배기, 윤활",
            "냉각/공조: 라디에이터, 워터펌프, 팬, 냉매, 히터",
            "제동/조향: 브레이크, 캘리퍼, 로터, 조향장치, 타이로드",
            "하체/서스펜션: 쇼크업소버, 로어암, 부싱, 베어링, 링크",
            "구동/변속: 미션, 클러치, 드라이브샤프트, 디퍼런셜, CV 조인트",
            "전장/센서: 배터리, 발전기, 스타터, ECU, 릴레이, 센서류",
            "외장/실내: 범퍼, 펜더, 도어, 유리, 와이퍼, 스위치",
            "소모품/정비: 필터, 벨트, 호스, 가스켓, 오일, 패드, 플러그"
        ];
    }

    return [
        "입문 핵심 용어",
        "하위 구성요소와 세부 부품",
        "현장에서 자주 보는 상태/오류/점검 용어",
        "실무 도구와 절차 용어",
        "약어, 제품명, 주변 시스템",
        "비슷해서 헷갈리는 구분 용어"
    ];
}

function buildPackMakerBatchMessages(payload, draft, batchCount, batchNumber) {
    const excludedTerms = draft.items
        .map(item => item.term)
        .filter(Boolean);
    const batchIntent = { ...payload.intent, requestedCount: batchCount };
    const focus = packMakerBatchFocus(payload.intent, batchNumber);

    return [
        {
            role: "system",
            content: [
                "너는 CodeDrop PACK MAKER의 용어 생성기다.",
                "응답은 반드시 줄 목록만 출력한다. 설명, markdown, 코드펜스, JSON은 쓰지 않는다.",
                "각 줄 형식은 정확히: 용어 | 한줄 설명",
                "예: 브레이크 패드 | 제동 시 디스크와 마찰해 차량을 멈추는 소모품입니다.",
                "raw HTML은 절대 쓰지 않는다."
            ].join("\n")
        },
        { role: "system", content: `이번 batch 계약:\n${packIntentMessage(batchIntent)}` },
        { role: "system", content: `전체 목표 제목: ${payload.intent.title || "Generated Data Pack"}` },
        { role: "system", content: `전체 주제/상황: ${payload.intent.topic || payload.message}` },
        { role: "system", content: `이번 batch의 범주 초점: ${focus}` },
        {
            role: "system",
            content: [
                `이미 사용한 term 목록(절대 재사용 금지): ${excludedTerms.length ? excludedTerms.join(", ") : "없음"}`,
                "위 금지 목록과 같은 term, 조사/띄어쓰기만 다른 term, 같은 부품의 표현만 바꾼 term은 모두 실패로 간주한다.",
                "금지 목록이 많을수록 더 구체적인 하위 부품명, 센서명, 소모품명, 외장/전장/하체 부품명으로 확장한다."
            ].join("\n")
        },
        { role: "system", content: `검색 결과:\n${payload.sourceBundle}` },
        {
            role: "user",
            content: [
                `batch ${batchNumber}: 아직 없는 새 item을 정확히 ${batchCount}개 생성해라.`,
                `팩 title은 반드시 "${payload.intent.title || "Generated Data Pack"}" 로 둔다.`,
                `이번 batch는 특히 다음 범주에서 뽑아라: ${focus}`,
                packLanguageInstruction(payload.intent.termLanguage),
                "term은 짧은 명사/부품명/현장 용어만 쓴다.",
                "중복 없이, 각 줄을 '용어 | 한줄 설명' 형식으로만 답한다."
            ].join("\n")
        }
    ];
}

function buildPackMakerFillMessages(payload, draft, count, repairNumber) {
    const excludedTerms = draft.items
        .map(item => item.term)
        .filter(Boolean);
    const fillIntent = { ...payload.intent, requestedCount: count };
    const focus = packMakerBatchFocus(payload.intent, repairNumber + 3);

    return [
        {
            role: "system",
            content: [
                "너는 CodeDrop PACK MAKER의 부족분 보강기다.",
                "응답은 반드시 줄 목록만 출력한다. 설명, markdown, 코드펜스, JSON은 쓰지 않는다.",
                "각 줄 형식은 정확히: 용어 | 한줄 설명",
                "raw HTML은 절대 쓰지 않는다."
            ].join("\n")
        },
        { role: "system", content: `이번 보강 계약:\n${packIntentMessage(fillIntent)}` },
        { role: "system", content: `전체 목표 제목: ${payload.intent.title || "Generated Data Pack"}` },
        { role: "system", content: `전체 주제/상황: ${payload.intent.topic || payload.message}` },
        { role: "system", content: `이번 보강의 범주 초점: ${focus}` },
        {
            role: "system",
            content: [
                "아래 term은 이미 draft에 있으므로 절대 다시 쓰지 않는다.",
                excludedTerms.length ? excludedTerms.join(", ") : "없음",
                "반복 term이 하나라도 있으면 그 줄은 서버에서 버려진다.",
                "자동차 정비 요청이면 엔진/제동/조향/하체/냉각/전장/외장/소모품/센서/변속기 부품을 고르게 섞는다."
            ].join("\n")
        },
        { role: "system", content: `검색 결과:\n${payload.sourceBundle}` },
        {
            role: "user",
            content: [
                `repair ${repairNumber}: 금지 목록에 없는 새 item을 정확히 ${count}개 생성해라.`,
                `이번 repair는 특히 다음 범주에서 뽑아라: ${focus}`,
                packLanguageInstruction(payload.intent.termLanguage),
                "짧은 명사/부품명/현장 용어만 term으로 쓴다.",
                "각 줄은 반드시 '용어 | 한줄 설명' 형식이다."
            ].join("\n")
        }
    ];
}

function buildPackMakerWideFillMessages(payload, draft, count, attempt) {
    const excludedTerms = draft.items
        .map(item => item.term)
        .filter(Boolean);
    const fillIntent = { ...payload.intent, requestedCount: count };
    const focusList = packMakerWideFocusList(payload.intent);

    return [
        {
            role: "system",
            content: [
                "너는 CodeDrop PACK MAKER의 넓은 후보 생성기다.",
                "목표는 기존 draft에 없는 새 후보를 많이 만들어 서버가 중복 제거 후 부족분을 채우게 하는 것이다.",
                "응답은 반드시 줄 목록만 출력한다. markdown, 코드펜스, JSON, 머리말은 쓰지 않는다.",
                "각 줄 형식은 정확히: 용어 | 한줄 설명",
                "설명은 짧고 구체적인 한국어 한 줄로 쓴다.",
                "raw HTML은 절대 쓰지 않는다."
            ].join("\n")
        },
        { role: "system", content: `넓은 후보 생성 계약:\n${packIntentMessage(fillIntent)}` },
        { role: "system", content: `전체 목표 제목: ${payload.intent.title || "Generated Data Pack"}` },
        { role: "system", content: `전체 주제/상황: ${payload.intent.topic || payload.message}` },
        { role: "system", content: `후보 범주 풀:\n- ${focusList.join("\n- ")}` },
        {
            role: "system",
            content: [
                `이미 사용한 term ${excludedTerms.length}개(절대 재사용 금지):`,
                excludedTerms.length ? excludedTerms.join(", ") : "없음",
                "금지 목록과 같은 term, 띄어쓰기만 다른 term, 표현만 바꾼 term은 서버에서 버려진다.",
                "따라서 더 구체적인 하위 부품명/현장 용어/센서명/소모품명/점검 대상명으로 넓혀라."
            ].join("\n")
        },
        {
            role: "user",
            content: [
                `wide fill ${attempt}: 금지 목록에 없는 후보를 정확히 ${count}줄 생성해라.`,
                "위 후보 범주 풀을 골고루 섞어라. 한 범주에 몰리지 마라.",
                packLanguageInstruction(payload.intent.termLanguage),
                "term은 2-5어절의 짧은 명사형이어야 한다.",
                "각 줄은 반드시 '용어 | 한줄 설명' 형식이다."
            ].join("\n")
        }
    ];
}

function buildPackMakerTermSweepMessages(payload, draft, count) {
    const focusList = packMakerWideFocusList(payload.intent);
    const topic = sanitizePackText(packTopicSignal(payload.intent) || payload.intent.topic || payload.message, 180);
    const excludedTerms = draft.items
        .map(item => item.term)
        .filter(Boolean);
    const language = payload.intent.termLanguage === "korean"
        ? "한글"
        : (payload.intent.termLanguage === "english" ? "English" : "도메인");

    return [
        {
            role: "user",
            content: [
                `${topic} 관련 ${language} 핵심 단어/용어 ${count}개를 쉼표로만 나열해.`,
                `이미 사용한 단어는 절대 다시 쓰지 마: ${excludedTerms.length ? excludedTerms.join(", ") : "없음"}.`,
                "설명하지 마. markdown, JSON, 머리말도 쓰지 마.",
                "중복 없이, 짧은 명사형만 써.",
                `가능하면 다음 범주를 골고루 섞어: ${focusList.join(", ")}.`
            ].join("\n")
        }
    ];
}

function buildPackMakerMicroSweepMessages(payload, draft, count, attempt) {
    const focusList = packMakerWideFocusList(payload.intent);
    const focus = focusList[(Math.max(1, Number(attempt) || 1) - 1) % focusList.length];
    const topic = sanitizePackText(packTopicSignal(payload.intent) || payload.intent.topic || payload.message, 180);
    const excludedTerms = draft.items
        .map(item => item.term)
        .filter(Boolean);
    const language = payload.intent.termLanguage === "korean"
        ? "한글"
        : (payload.intent.termLanguage === "english" ? "English" : "도메인");

    return [
        {
            role: "user",
            content: [
                `${topic} 관련 ${language} 새 단어/용어 후보 ${count}개를 쉼표로만 나열해.`,
                `이번에는 이 범주에서만 골라: ${focus}.`,
                `이미 사용한 단어는 절대 다시 쓰지 마: ${excludedTerms.length ? excludedTerms.join(", ") : "없음"}.`,
                "상위어를 반복하지 말고 더 구체적인 하위 부품명, 센서명, 소모품명, 점검 대상명을 써.",
                "설명하지 마. markdown, JSON, 머리말도 쓰지 마.",
                "중복 없이, 짧은 명사형만 써."
            ].join("\n")
        }
    ];
}

function splitPackMakerCandidateLines(answer) {
    const cleaned = String(answer || "")
        .replace(/```[\s\S]*?```/g, "")
        .replace(/[，、；;]/g, ",");
    const rawLines = cleaned.split(/\n+/).map(line => line.trim()).filter(Boolean);
    const lines = [];

    for (const raw of rawLines) {
        const withoutBullet = raw
            .replace(/^\s*(?:[-*]|\d+[.)])\s*/, "")
            .replace(/^["'`]+|["'`]+$/g, "")
            .trim();
        if (!withoutBullet) continue;

        if (!/[|:：-]/.test(withoutBullet) && withoutBullet.includes(",")) {
            withoutBullet.split(",").map(part => part.trim()).filter(Boolean).forEach(part => lines.push(part));
        } else {
            lines.push(withoutBullet);
        }
    }

    return lines;
}

function fallbackItemDescription(term, intent) {
    const topic = `${intent.topic || ""} ${intent.title || ""}`.toLowerCase();
    if (/(자동차|정비|차량|부품|카\s*파츠|car|auto|vehicle|parts)/i.test(topic)) {
        return `${term} 관련 점검이나 교체에서 자주 등장하는 자동차 정비 부품입니다.`;
    }
    return `${term} 관련 도메인에서 자주 등장하는 핵심 용어입니다.`;
}

function draftFromPackMakerLines(answer, intent, count, fallbackSources = []) {
    const items = [];
    const seen = new Set();
    const lines = splitPackMakerCandidateLines(answer);

    for (const rawLine of lines) {
        const line = rawLine
            .replace(/^\s*(?:[-*]|\d+[.)])\s*/, "")
            .replace(/^["'`]+|["'`]+$/g, "")
            .trim();
        let parts = line.split("|");
        if (parts.length < 2) parts = line.split(/\s+-\s+/);
        if (parts.length < 2) parts = line.split(/\s*:\s+/);

        const term = sanitizePackText(parts.shift(), MAX_PACK_TERM_LEN);
        const desc = sanitizePackText(parts.join(" ").trim(), MAX_PACK_ITEM_DESC_LEN) || `${term} 관련 자동차 정비 용어입니다.`;
        if (!term || !desc) continue;
        if (intent.termLanguage === "korean" && !/[가-힣]/.test(term)) continue;
        if (intent.termLanguage === "english" && /[가-힣]/.test(term)) continue;

        const key = term.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        items.push({ term, desc, sources: fallbackSources });
        if (items.length >= count) break;
    }

    return normalizeDraftForIntent({
        title: intent.title,
        description: `${intent.topic || intent.title} data pack`,
        items
    }, { ...intent, requestedCount: count }, fallbackSources);
}

async function generatePackMakerBatchDraft(target, payload, draft, searchResults, batchCount, batchNumber, signal, onDelta) {
    const batchMessages = buildPackMakerBatchMessages(payload, draft, batchCount, batchNumber);
    return generatePackMakerLineDraft(target, batchMessages, payload.intent, searchResults, batchCount, signal, onDelta);
}

async function generatePackMakerFillDraft(target, payload, draft, searchResults, count, repairNumber, signal, onDelta) {
    const fillMessages = buildPackMakerFillMessages(payload, draft, count, repairNumber);
    return generatePackMakerLineDraft(target, fillMessages, payload.intent, searchResults, count, signal, onDelta);
}

async function generatePackMakerWideFillDraft(target, payload, draft, searchResults, count, attempt, signal, onDelta) {
    const fillMessages = buildPackMakerWideFillMessages(payload, draft, count, attempt);
    return generatePackMakerLineDraft(target, fillMessages, payload.intent, searchResults, count, signal, onDelta);
}

async function generatePackMakerTermSweepDraft(target, payload, draft, searchResults, count, signal) {
    const messages = buildPackMakerTermSweepMessages(payload, draft, count);
    const childSignal = linkedTimeoutSignal(signal, PACK_MAKER_BATCH_TIMEOUT_MS);
    let answer = "";

    try {
        answer = await callPackMakerLlmOnce(
            target,
            messages,
            childSignal.signal,
            { maxTokens: packMakerTokenBudget(count), temperature: PACK_MAKER_SWEEP_TEMPERATURE }
        );
    } catch (err) {
        if (signal.aborted) throw err;
        if (childSignal.signal.aborted) {
            const timeoutError = new Error(`KUGNUS term sweep timeout after ${Math.round(PACK_MAKER_BATCH_TIMEOUT_MS / 1000)}s`);
            timeoutError.code = "PACK_TERM_SWEEP_TIMEOUT";
            throw timeoutError;
        }
        throw err;
    } finally {
        childSignal.cleanup();
    }

    const items = [];
    const seen = new Set();
    for (const raw of splitPackMakerCandidateLines(answer)) {
        const term = sanitizePackText(
            raw
                .split("|")[0]
                .split(/\s+-\s+/)[0]
                .split(/\s*[:：]\s*/)[0],
            MAX_PACK_TERM_LEN
        );
        if (!term) continue;
        if (payload.intent.termLanguage === "korean" && !/[가-힣]/.test(term)) continue;
        if (payload.intent.termLanguage === "english" && /[가-힣]/.test(term)) continue;
        const key = term.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        items.push({
            term,
            desc: fallbackItemDescription(term, payload.intent),
            sources: searchResults
        });
        if (items.length >= count) break;
    }

    return {
        answer,
        draft: normalizeDraftForIntent({
            title: payload.intent.title,
            description: `${payload.intent.topic || payload.intent.title} data pack`,
            items
        }, { ...payload.intent, requestedCount: count }, searchResults)
    };
}

async function generatePackMakerMicroSweepDraft(target, payload, draft, searchResults, count, attempt, signal) {
    const messages = buildPackMakerMicroSweepMessages(payload, draft, count, attempt);
    const childSignal = linkedTimeoutSignal(signal, PACK_MAKER_BATCH_TIMEOUT_MS);
    let answer = "";

    try {
        answer = await callPackMakerLlmOnce(
            target,
            messages,
            childSignal.signal,
            { maxTokens: packMakerTokenBudget(count), temperature: PACK_MAKER_SWEEP_TEMPERATURE }
        );
    } catch (err) {
        if (signal.aborted) throw err;
        if (childSignal.signal.aborted) {
            const timeoutError = new Error(`KUGNUS micro sweep timeout after ${Math.round(PACK_MAKER_BATCH_TIMEOUT_MS / 1000)}s`);
            timeoutError.code = "PACK_MICRO_SWEEP_TIMEOUT";
            throw timeoutError;
        }
        throw err;
    } finally {
        childSignal.cleanup();
    }

    const items = [];
    const seen = new Set();
    for (const raw of splitPackMakerCandidateLines(answer)) {
        const term = sanitizePackText(
            raw
                .split("|")[0]
                .split(/\s+-\s+/)[0]
                .split(/\s*[:：]\s*/)[0],
            MAX_PACK_TERM_LEN
        );
        if (!term) continue;
        if (payload.intent.termLanguage === "korean" && !/[가-힣]/.test(term)) continue;
        if (payload.intent.termLanguage === "english" && /[가-힣]/.test(term)) continue;
        const key = term.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        items.push({
            term,
            desc: fallbackItemDescription(term, payload.intent),
            sources: searchResults
        });
        if (items.length >= count) break;
    }

    return {
        answer,
        draft: normalizeDraftForIntent({
            title: payload.intent.title,
            description: `${payload.intent.topic || payload.intent.title} data pack`,
            items
        }, { ...payload.intent, requestedCount: count }, searchResults)
    };
}

async function generatePackMakerLineDraft(target, messages, intent, searchResults, count, signal, onDelta) {
    const childSignal = linkedTimeoutSignal(signal, PACK_MAKER_BATCH_TIMEOUT_MS);
    let answer = "";

    try {
        answer = await readLearnLlmStream(
            target,
            messages,
            childSignal.signal,
            delta => onDelta(delta),
            {
                maxTokens: packMakerTokenBudget(count),
                temperature: PACK_MAKER_TEMPERATURE
            }
        );
    } catch (err) {
        if (signal.aborted) throw err;
        if (childSignal.signal.aborted) {
            const timeoutError = new Error(`KUGNUS batch timeout after ${Math.round(PACK_MAKER_BATCH_TIMEOUT_MS / 1000)}s`);
            timeoutError.code = "PACK_BATCH_TIMEOUT";
            throw timeoutError;
        }
        throw err;
    } finally {
        childSignal.cleanup();
    }

    const parsed = extractDraftJson(answer);
    const parsedDraft = normalizeDraftForIntent(parsed || {}, { ...intent, requestedCount: count }, searchResults);
    const lineDraft = draftFromPackMakerLines(answer, intent, count, searchResults);
    const bestDraft = lineDraft.items.length >= parsedDraft.items.length ? lineDraft : parsedDraft;
    return {
        answer,
        draft: bestDraft
    };
}

async function generatePackMakerDraftInBatches(target, payload, searchResults, signal, onDelta, onStatus) {
    let draft = normalizeDraftForIntent({
        title: payload.intent.title,
        description: `${payload.intent.topic || payload.intent.title} data pack`,
        items: []
    }, payload.intent, searchResults);
    let answer = "";
    const plannedBatches = Math.ceil(payload.intent.requestedCount / PACK_MAKER_BATCH_SIZE);
    const maxBatches = plannedBatches + 1;

    for (let batchNumber = 1; batchNumber <= maxBatches && draft.items.length < payload.intent.requestedCount; batchNumber += 1) {
        const remaining = payload.intent.requestedCount - draft.items.length;
        let batchCount = Math.min(PACK_MAKER_BATCH_SIZE, remaining);
        onStatus(`${draft.items.length}/${payload.intent.requestedCount} GENERATING BATCH ${batchNumber}/${maxBatches}`);

        let result = null;
        let lastError = null;
        for (let attempt = 1; attempt <= 3 && !result; attempt += 1) {
            try {
                result = await generatePackMakerBatchDraft(
                    target,
                    payload,
                    draft,
                    searchResults,
                    batchCount,
                    batchNumber,
                    signal,
                    text => onDelta(text)
                );
            } catch (err) {
                if (signal.aborted || err.name === "AbortError") throw err;
                lastError = err;
                batchCount = Math.max(4, Math.ceil(batchCount / 2));
                onStatus(`${draft.items.length}/${payload.intent.requestedCount} RETRYING`);
            }
        }

        if (!result) {
            onDelta(`\n[PACK MAKER] batch ${batchNumber} failed: ${lastError?.message || "unknown error"}\n`);
            continue;
        }

        answer += `\n${result.answer || ""}`;
        const before = draft.items.length;
        draft = mergeDraftsForIntent(draft, result.draft, payload.intent);
        const gained = draft.items.length - before;
        const expectedGain = Math.min(remaining, batchCount);

        if (draft.items.length < payload.intent.requestedCount && gained < Math.max(3, Math.floor(expectedGain * 0.5))) {
            onStatus(`${draft.items.length}/${payload.intent.requestedCount} REPAIRING`);
            const repairRemaining = payload.intent.requestedCount - draft.items.length;
            const repairCount = Math.min(PACK_MAKER_BATCH_SIZE, repairRemaining + 8);
            try {
                const repair = await generatePackMakerFillDraft(
                    target,
                    payload,
                    draft,
                    searchResults,
                    repairCount,
                    batchNumber,
                    signal,
                    text => onDelta(text)
                );
                answer += `\n${repair.answer || ""}`;
                draft = mergeDraftsForIntent(draft, repair.draft, payload.intent);
            } catch (err) {
                if (signal.aborted || err.name === "AbortError") throw err;
                onDelta(`\n[PACK MAKER] repair ${batchNumber} failed: ${err.message || "unknown error"}\n`);
            }
        }
    }

    for (let attempt = 1; attempt <= PACK_WIDE_FILL_ATTEMPTS && draft.items.length < payload.intent.requestedCount; attempt += 1) {
        const remaining = payload.intent.requestedCount - draft.items.length;
        const candidateCount = Math.min(MAX_PACK_ITEMS, Math.max(payload.intent.requestedCount + 20, remaining * 5));
        onStatus(`${draft.items.length}/${payload.intent.requestedCount} WIDE FILL ${attempt}/${PACK_WIDE_FILL_ATTEMPTS}`);

        try {
            const fill = await generatePackMakerWideFillDraft(
                target,
                payload,
                draft,
                searchResults,
                candidateCount,
                attempt,
                signal,
                text => onDelta(text)
            );
            answer += `\n${fill.answer || ""}`;
            const before = draft.items.length;
            draft = mergeDraftsForIntent(draft, fill.draft, payload.intent);
            const gained = draft.items.length - before;
            if (gained === 0) {
                onDelta(`\n[PACK MAKER] wide fill ${attempt} produced no new valid terms\n`);
            }
        } catch (err) {
            if (signal.aborted || err.name === "AbortError") throw err;
            onDelta(`\n[PACK MAKER] wide fill ${attempt} failed: ${err.message || "unknown error"}\n`);
        }
    }

    for (let attempt = 1; attempt <= PACK_MICRO_SWEEP_ATTEMPTS && draft.items.length < payload.intent.requestedCount; attempt += 1) {
        const remaining = payload.intent.requestedCount - draft.items.length;
        const candidateCount = Math.min(30, Math.max(12, remaining * 3));
        onStatus(`${draft.items.length}/${payload.intent.requestedCount} MICRO SWEEP ${attempt}/${PACK_MICRO_SWEEP_ATTEMPTS}`);

        try {
            const sweep = await generatePackMakerMicroSweepDraft(
                target,
                payload,
                draft,
                searchResults,
                candidateCount,
                attempt,
                signal
            );
            answer += `\n${sweep.answer || ""}`;
            const before = draft.items.length;
            draft = mergeDraftsForIntent(draft, sweep.draft, payload.intent);
            const gained = draft.items.length - before;
            if (gained === 0) {
                onDelta(`\n[PACK MAKER] micro sweep ${attempt} produced no new valid terms\n`);
            }
        } catch (err) {
            if (signal.aborted || err.name === "AbortError") throw err;
            onDelta(`\n[PACK MAKER] micro sweep ${attempt} failed: ${err.message || "unknown error"}\n`);
        }
    }

    if (draft.items.length < payload.intent.requestedCount) {
        const sweepCount = MAX_PACK_ITEMS;
        onStatus(`${draft.items.length}/${payload.intent.requestedCount} TERM SWEEP`);

        try {
            const sweep = await generatePackMakerTermSweepDraft(
                target,
                payload,
                draft,
                searchResults,
                sweepCount,
                signal
            );
            answer += `\n${sweep.answer || ""}`;
            const before = draft.items.length;
            draft = mergeDraftsForIntent(draft, sweep.draft, payload.intent);
            const gained = draft.items.length - before;
            if (gained === 0) {
                onDelta(`\n[PACK MAKER] term sweep produced no new valid terms\n`);
            }
        } catch (err) {
            if (signal.aborted || err.name === "AbortError") throw err;
            onDelta(`\n[PACK MAKER] term sweep failed: ${err.message || "unknown error"}\n`);
        }
    }

    for (let attempt = 1; attempt <= PACK_FINAL_FILL_ATTEMPTS && draft.items.length < payload.intent.requestedCount; attempt += 1) {
        const remaining = payload.intent.requestedCount - draft.items.length;
        const fillCount = Math.min(PACK_MAKER_BATCH_SIZE, Math.max(remaining + 12, remaining * 2));
        onStatus(`${draft.items.length}/${payload.intent.requestedCount} FINAL FILL ${attempt}/${PACK_FINAL_FILL_ATTEMPTS}`);

        try {
            const fill = await generatePackMakerFillDraft(
                target,
                payload,
                draft,
                searchResults,
                fillCount,
                maxBatches + attempt,
                signal,
                text => onDelta(text)
            );
            answer += `\n${fill.answer || ""}`;
            const before = draft.items.length;
            draft = mergeDraftsForIntent(draft, fill.draft, payload.intent);
            const gained = draft.items.length - before;
            if (gained === 0) {
                onDelta(`\n[PACK MAKER] final fill ${attempt} produced no new valid terms\n`);
            }
        } catch (err) {
            if (signal.aborted || err.name === "AbortError") throw err;
            onDelta(`\n[PACK MAKER] final fill ${attempt} failed: ${err.message || "unknown error"}\n`);
        }
    }

    draft = normalizeDraftForIntent(draft, payload.intent, searchResults);
    return { draft, answer };
}

function coerceDraftJson(value) {
    if (!value || typeof value !== "object") return null;
    if (Array.isArray(value.items)) return value;
    if (value.draft && typeof value.draft === "object" && Array.isArray(value.draft.items)) return value.draft;
    if (value.pack && typeof value.pack === "object" && Array.isArray(value.pack.items)) return value.pack;
    if (Array.isArray(value)) return { title: "Generated Data Pack", description: "Pack Maker draft", items: value };
    return null;
}

function parseDraftCandidate(candidate) {
    const text = String(candidate || "").trim();
    if (!text) return null;
    try {
        return coerceDraftJson(JSON.parse(text));
    } catch (err) {
        const cleaned = text
            .replace(/,\s*([}\]])/g, "$1")
            .replace(/^\uFEFF/, "");
        try {
            return coerceDraftJson(JSON.parse(cleaned));
        } catch (e) {
            return null;
        }
    }
}

function balancedJsonCandidates(text) {
    const candidates = [];
    let depth = 0;
    let start = -1;
    let inString = false;
    let escaped = false;

    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];

        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (char === "\\") {
                escaped = true;
            } else if (char === "\"") {
                inString = false;
            }
            continue;
        }

        if (char === "\"") {
            inString = true;
            continue;
        }

        if (char === "{") {
            if (depth === 0) start = index;
            depth += 1;
        } else if (char === "}" && depth > 0) {
            depth -= 1;
            if (depth === 0 && start !== -1) {
                candidates.push(text.slice(start, index + 1));
                start = -1;
            }
        }
    }

    return candidates;
}

function extractDraftJson(answer) {
    const text = String(answer || "");
    const candidates = [];
    for (const match of text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) {
        candidates.push(match[1]);
    }
    candidates.push(...balancedJsonCandidates(text));

    let best = null;
    for (const candidate of candidates) {
        const parsed = parseDraftCandidate(candidate);
        if (!parsed) continue;
        if (!best || (parsed.items || []).length > (best.items || []).length) best = parsed;
    }

    return best;
}

async function ensureCustomPackTables() {
    if (!customPackTablesReady) {
        customPackTablesReady = (async () => {
            await db.query(`
                CREATE TABLE IF NOT EXISTS custom_packs (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    owner_id BIGINT NOT NULL,
                    title VARCHAR(60) NOT NULL,
                    description VARCHAR(240) DEFAULT '',
                    status VARCHAR(16) NOT NULL DEFAULT 'draft',
                    review_reason VARCHAR(240) DEFAULT '',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_custom_packs_owner (owner_id, status),
                    INDEX idx_custom_packs_status (status, updated_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);

            await db.query(`
                CREATE TABLE IF NOT EXISTS custom_pack_items (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    pack_id BIGINT NOT NULL,
                    term VARCHAR(80) NOT NULL,
                    description VARCHAR(180) NOT NULL,
                    sources_json TEXT NOT NULL,
                    sort_order INT NOT NULL DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_custom_pack_items_pack (pack_id, sort_order)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);

            await db.query(`
                CREATE TABLE IF NOT EXISTS custom_pack_scores (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    pack_id BIGINT NOT NULL,
                    user_id BIGINT NOT NULL,
                    score INT NOT NULL,
                    wpm INT NOT NULL DEFAULT 0,
                    accuracy INT NOT NULL DEFAULT 0,
                    difficulty VARCHAR(16) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_custom_pack_scores_pack (pack_id, difficulty, score),
                    INDEX idx_custom_pack_scores_user (user_id, created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);
        })().catch(err => {
            customPackTablesReady = null;
            throw err;
        });
    }

    return customPackTablesReady;
}

function packRowVisibleToUser(row, user) {
    return row && (row.status === "approved" || row.owner_id === user.id);
}

function serializePackRow(row, items = undefined) {
    const pack = {
        id: row.id,
        title: row.title,
        description: row.description || "",
        status: row.status,
        ownerId: row.owner_id,
        ownerNickname: row.owner_nickname || "",
        reviewReason: row.review_reason || "",
        updatedAt: row.updated_at,
        itemCount: Number(row.item_count || 0)
    };
    if (items) pack.items = items;
    return pack;
}

function serializePackItem(row) {
    let sources = [];
    try {
        sources = JSON.parse(row.sources_json || "[]");
    } catch (err) {
        sources = [];
    }
    return {
        id: row.id,
        term: row.term,
        desc: row.description,
        sources: Array.isArray(sources) ? sources : []
    };
}

async function fetchPackRow(id) {
    const [rows] = await db.query(`
        SELECT p.*, u.nickname AS owner_nickname,
            (SELECT COUNT(*) FROM custom_pack_items i WHERE i.pack_id = p.id) AS item_count
        FROM custom_packs p
        JOIN users u ON u.id = p.owner_id
        WHERE p.id = ?
        LIMIT 1
    `, [id]);
    return rows[0] || null;
}

async function fetchPackItems(id) {
    const [rows] = await db.query(`
        SELECT id, term, description, sources_json
        FROM custom_pack_items
        WHERE pack_id = ?
        ORDER BY sort_order ASC, id ASC
    `, [id]);
    return rows.map(serializePackItem);
}

async function savePackItems(connection, packIdValue, items) {
    await connection.query("DELETE FROM custom_pack_items WHERE pack_id = ?", [packIdValue]);
    for (const [index, item] of items.entries()) {
        await connection.query(
            "INSERT INTO custom_pack_items (pack_id, term, description, sources_json, sort_order) VALUES (?, ?, ?, ?, ?)",
            [packIdValue, item.term, item.desc, JSON.stringify(item.sources), index]
        );
    }
}

function decodeHtmlEntities(value) {
    return String(value || "")
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
        .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, " ")
        .replace(/&nbsp;/g, " ");
}

function stripHtml(value) {
    return sanitizePackText(
        decodeHtmlEntities(String(value || "").replace(/<[^>]+>/g, " ")),
        280
    );
}

function normalizeDuckDuckGoHref(href) {
    const decoded = decodeHtmlEntities(href);
    try {
        const url = new URL(decoded, "https://duckduckgo.com");
        const uddg = url.searchParams.get("uddg");
        if (uddg) return decodeURIComponent(uddg);
        return url.toString();
    } catch (err) {
        return "";
    }
}

async function duckDuckGoHtmlSearch(query) {
    const url = new URL("https://duckduckgo.com/html/");
    url.searchParams.set("q", query);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 CodeDrop Pack Maker",
                "Accept": "text/html"
            },
            signal: controller.signal
        });
        if (!res.ok) throw new Error(`DuckDuckGo HTML request failed (${res.status})`);
        const html = await res.text();
        const blocks = html.match(/<div class="result[\s\S]*?<\/div>\s*<\/div>/g) || [];
        const results = [];

        for (const block of blocks) {
            const linkMatch = block.match(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
            if (!linkMatch) continue;
            const snippetMatch = block.match(/<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/)
                || block.match(/<div[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/div>/);
            const sourceUrl = sanitizeSourceUrl(normalizeDuckDuckGoHref(linkMatch[1]));
            const title = stripHtml(linkMatch[2]).slice(0, 120);
            const snippet = stripHtml(snippetMatch ? snippetMatch[1] : title).slice(0, 260);
            if (!sourceUrl || !title || !snippet) continue;
            if (results.some(item => item.url === sourceUrl)) continue;
            results.push({ title, url: sourceUrl, snippet });
            if (results.length >= 8) break;
        }

        return results;
    } catch (err) {
        console.warn("DuckDuckGo HTML search failed:", err.message);
        return [];
    } finally {
        clearTimeout(timeout);
    }
}

async function duckDuckGoSearch(query) {
    const cleanQuery = sanitizeChatText(query, 180);
    if (!cleanQuery) return [];

    const config = duckDuckGoConfig();
    const url = new URL(config.baseUrl);
    url.searchParams.set("q", cleanQuery);
    url.searchParams.set("format", "json");
    url.searchParams.set("no_html", "1");
    url.searchParams.set("skip_disambig", "1");

    const headers = {};
    if (config.apiKey) {
        headers.Authorization = `Bearer ${config.apiKey}`;
        headers["X-API-Key"] = config.apiKey;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
        const res = await fetch(url, { headers, signal: controller.signal });
        if (!res.ok) throw new Error(`DuckDuckGo request failed (${res.status})`);
        const data = await res.json();
        const results = [];
        const add = (title, sourceUrl, snippet) => {
            const safeUrl = sanitizeSourceUrl(sourceUrl);
            const safeSnippet = sanitizePackText(snippet, 260);
            const safeTitle = sanitizePackText(title, 120) || safeUrl;
            if (!safeUrl || !safeSnippet) return;
            if (results.some(item => item.url === safeUrl)) return;
            results.push({ title: safeTitle, url: safeUrl, snippet: safeSnippet });
        };

        add(data.Heading, data.AbstractURL, data.AbstractText);
        (data.Results || []).forEach(item => add(item.Text, item.FirstURL, item.Text));
        const walk = items => {
            (items || []).forEach(item => {
                if (item.Topics) walk(item.Topics);
                else add(item.Text, item.FirstURL, item.Text);
            });
        };
        walk(data.RelatedTopics);
        if (results.length) return results.slice(0, 8);
        return duckDuckGoHtmlSearch(cleanQuery);
    } catch (err) {
        console.warn("DuckDuckGo search failed:", err.message);
        return duckDuckGoHtmlSearch(cleanQuery);
    } finally {
        clearTimeout(timeout);
    }
}

function llmHeaders(target) {
    const headers = { "Content-Type": "application/json" };
    if (target.provider !== "ollama" && target.apiKey) headers.Authorization = `Bearer ${target.apiKey}`;
    return headers;
}

function llmPayload(target, messages, stream = false, options = {}) {
    const maxTokens = Number(options.maxTokens) || 700;
    const temperature = Number.isFinite(Number(options.temperature)) ? Number(options.temperature) : 0.2;
    if (target.provider === "ollama") {
        return {
            model: target.model,
            messages,
            stream,
            ...(options.format ? { format: options.format } : {}),
            options: {
                temperature,
                num_predict: maxTokens
            }
        };
    }

    if (target.engine === "openai") {
        return {
            model: target.model,
            messages,
            max_completion_tokens: maxTokens,
            stream
        };
    }

    return {
        model: target.model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream
    };
}

function ollamaBaseUrl(target) {
    const url = new URL(target.url);
    if (/\/api\/(chat|generate)$/i.test(url.pathname)) {
        url.pathname = url.pathname.replace(/\/api\/(chat|generate)$/i, "");
    } else if (/\/v1\/chat\/completions$/i.test(url.pathname)) {
        url.pathname = url.pathname.replace(/\/v1\/chat\/completions$/i, "");
    }
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/+$/, "");
}

function extractLlmAnswer(provider, data) {
    if (provider === "ollama") {
        return data?.message?.content || data?.response || "";
    }
    return data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || "";
}

async function callLearnLlm(messages, engine) {
    const target = buildLlmTarget(engine);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

    try {
        const response = await fetch(target.url, {
            method: "POST",
            headers: llmHeaders(target),
            body: JSON.stringify(llmPayload(target, messages)),
            signal: controller.signal
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const err = new Error(data.error?.message || data.error || `LLM request failed (${response.status})`);
            err.status = response.status >= 500 ? 502 : response.status;
            throw err;
        }

        const answer = extractLlmAnswer(target.provider, data).trim();
        if (!answer) {
            const err = new Error("Empty LLM response");
            err.status = 502;
            throw err;
        }

        return { answer, provider: target.provider, model: target.model, engine: target.engine, label: target.label };
    } finally {
        clearTimeout(timeout);
    }
}

function buildLearnMessages(body) {
    const message = sanitizeChatText(body?.message);
    if (!message) {
        const err = new Error("Message required");
        err.status = 400;
        throw err;
    }

    const engine = normalizeChatEngine(body?.engine);
    if (!engine) {
        const err = new Error("Invalid LLM engine");
        err.status = 400;
        throw err;
    }

    const context = sanitizeChatContext(body?.context);
    const history = sanitizeChatHistory(body?.history);
    return {
        engine,
        messages: [
            { role: "system", content: LEARN_CHAT_SYSTEM_PROMPT },
            { role: "system", content: learnContextMessage(context) },
            ...history,
            { role: "user", content: message }
        ]
    };
}

function buildPackMakerMessages(body, searchResults, providedIntent = null) {
    const message = sanitizeChatText(body?.message);
    if (!message) {
        const err = new Error("Message required");
        err.status = 400;
        throw err;
    }

    const engine = normalizeChatEngine(body?.engine);
    if (!engine) {
        const err = new Error("Invalid LLM engine");
        err.status = 400;
        throw err;
    }

    const history = sanitizeChatHistory(body?.history);
    const intent = providedIntent || extractPackIntent(message);
    const draft = normalizeDraftFromLlm(body?.draft || {}, searchResults);
    const sourceBundle = searchResults.length
        ? searchResults.map((item, index) => `${index + 1}. ${item.title}\nURL: ${item.url}\n요약: ${item.snippet}`).join("\n\n")
        : "검색 결과가 비어 있습니다. 일반 지식으로 초안을 만들되 출처가 부족하다고 표시하세요.";

    const currentDraft = draft.items.length
        ? JSON.stringify(draft).slice(0, 5000)
        : "아직 저장된 draft가 없습니다.";

    return {
        engine,
        message,
        intent,
        sourceBundle,
        maxTokens: packMakerTokenBudget(intent.requestedCount),
        messages: [
            { role: "system", content: PACK_MAKER_SYSTEM_PROMPT },
            { role: "system", content: `이번 요청 계약:\n${packIntentMessage(intent)}` },
            { role: "system", content: `검색 결과:\n${sourceBundle}` },
            { role: "system", content: `현재 draft:\n${currentDraft}` },
            ...history,
            { role: "user", content: message }
        ]
    };
}

function parseStreamDelta(provider, data) {
    if (provider === "ollama") {
        return data?.message?.content || data?.response || "";
    }

    const choice = data?.choices?.[0] || {};
    return choice.delta?.content || choice.message?.content || choice.text || "";
}

async function readLearnLlmStream(target, messages, signal, onDelta, options = {}) {
    const response = await fetch(target.url, {
        method: "POST",
        headers: llmHeaders(target),
        body: JSON.stringify(llmPayload(target, messages, true, options)),
        signal
    });

    if (!response.ok) {
        const text = await response.text().catch(() => "");
        let message = `LLM request failed (${response.status})`;
        try {
            const data = JSON.parse(text);
            message = data.error?.message || data.error || message;
        } catch (e) {
            if (text.trim()) message = text.trim().slice(0, 240);
        }
        const err = new Error(message);
        err.status = response.status >= 500 ? 502 : response.status;
        throw err;
    }

    if (!response.body) {
        const err = new Error("LLM stream is unavailable");
        err.status = 502;
        throw err;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let output = "";

    function consumeLine(rawLine) {
        const line = rawLine.trim();
        if (!line) return false;

        if (target.provider !== "ollama") {
            if (!line.startsWith("data:")) return false;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") return payload === "[DONE]";
            try {
                const data = JSON.parse(payload);
                const delta = parseStreamDelta(target.provider, data);
                if (delta) {
                    output += delta;
                    onDelta(delta);
                }
            } catch (err) {
                console.warn("Skipping malformed LLM SSE chunk:", err.message);
            }
            return false;
        }

        try {
            const data = JSON.parse(line);
            const delta = parseStreamDelta(target.provider, data);
            if (delta) {
                output += delta;
                onDelta(delta);
            }
            return data.done === true;
        } catch (err) {
            console.warn("Skipping malformed LLM JSON chunk:", err.message);
            return false;
        }
    }

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            if (consumeLine(line)) {
                await reader.cancel().catch(() => {});
                return output.trim();
            }
        }
    }

    buffer += decoder.decode();
    if (buffer.trim()) consumeLine(buffer);
    return output.trim();
}

async function callPackMakerLlmOnce(target, messages, signal, options = {}) {
    const response = await fetch(target.url, {
        method: "POST",
        headers: llmHeaders(target),
        body: JSON.stringify(llmPayload(target, messages, false, options)),
        signal
    });

    const text = await response.text().catch(() => "");
    if (!response.ok) {
        let message = `LLM request failed (${response.status})`;
        try {
            const data = JSON.parse(text);
            message = data.error?.message || data.error || message;
        } catch (e) {
            if (text.trim()) message = text.trim().slice(0, 240);
        }
        const err = new Error(message);
        err.status = response.status >= 500 ? 502 : response.status;
        throw err;
    }

    let data = {};
    try {
        data = text ? JSON.parse(text) : {};
    } catch (err) {
        const parsed = extractDraftJson(text);
        if (parsed) return JSON.stringify(parsed);
        throw err;
    }

    const answer = extractLlmAnswer(target.provider, data).trim();
    if (!answer) {
        const parsed = coerceDraftJson(data);
        if (parsed) return JSON.stringify(parsed);
    }
    return answer;
}

function linkedTimeoutSignal(parentSignal, timeoutMs) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const abortFromParent = () => controller.abort();

    if (parentSignal.aborted) {
        controller.abort();
    } else {
        parentSignal.addEventListener("abort", abortFromParent, { once: true });
    }

    return {
        signal: controller.signal,
        cleanup() {
            clearTimeout(timeout);
            parentSignal.removeEventListener("abort", abortFromParent);
        }
    };
}

function writeNdjson(res, event, payload = {}) {
    if (res.writableEnded || res.destroyed) return;
    res.write(`${JSON.stringify({ event, ...payload })}\n`);
}

// 서버 프로세스 자체의 생존 상태를 확인한다. DB 준비 여부는 /ready에서 검증한다.
app.get("/health", (req, res) => {
    res.json({ server: "ok" });
});

app.get("/ready", async (req, res) => {
    try {
        await Promise.race([
            db.query("SELECT 1"),
            new Promise((_, reject) => setTimeout(() => reject(new Error("DB readiness timeout")), 1000))
        ]);
        res.json({ server: "ok", db: "ok" });
    } catch (err) {
        res.status(503).json({ server: "ok", db: "unavailable" });
    }
});

app.get("/api/llm/kugnus/health", rateLimit("kugnus-health", 30, 60_000), async (req, res) => {
    let target;
    try {
        target = buildLlmTarget("kugnus");
    } catch (err) {
        return res.json({
            ok: false,
            engine: "kugnus",
            label: "KUGNUS SERVER",
            reason: err.message
        });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), KUGNUS_HEALTH_TIMEOUT_MS);

    try {
        if (target.provider === "ollama") {
            const baseUrl = ollamaBaseUrl(target);
            const response = await fetch(`${baseUrl}/api/tags`, { signal: controller.signal });
            const data = await response.json().catch(() => ({}));
            const models = Array.isArray(data.models) ? data.models : [];
            const hasModel = models.some(model => model.name === target.model || model.model === target.model);
            return res.json({
                ok: response.ok && hasModel,
                engine: "kugnus",
                label: "KUGNUS SERVER",
                provider: target.provider,
                route: target.route,
                model: target.model,
                reason: response.ok && !hasModel ? `Model not found: ${target.model}` : ""
            });
        }

        const response = await fetch(target.url, {
            method: "POST",
            headers: llmHeaders(target),
            body: JSON.stringify(llmPayload(target, [
                { role: "user", content: "Health check. Reply only OK." }
            ], false, { maxTokens: 16 })),
            signal: controller.signal
        });

        const text = await response.text().catch(() => "");
        if (!response.ok) {
            return res.json({
                ok: false,
                engine: "kugnus",
                label: "KUGNUS SERVER",
                route: target.route,
                reason: `KUGNUS request failed (${response.status})`
            });
        }

        let data = {};
        try {
            data = text ? JSON.parse(text) : {};
        } catch (err) {
            data = {};
        }

        const answer = extractLlmAnswer(target.provider, data).trim();
        res.json({
            ok: Boolean(answer || text.trim()),
            engine: "kugnus",
            label: "KUGNUS SERVER",
            provider: target.provider,
            route: target.route,
            model: target.model,
            target: safeLlmTargetUrlParts(target.url),
            reason: answer || text.trim() ? "" : "Empty KUGNUS response"
        });
    } catch (err) {
        res.json({
            ok: false,
            engine: "kugnus",
            label: "KUGNUS SERVER",
            provider: target && target.provider,
            route: target && target.route,
            model: target && target.model,
            target: target ? safeLlmTargetUrlParts(target.url) : undefined,
            reason: err.name === "AbortError" ? "KUGNUS health timeout" : err.message
        });
    } finally {
        clearTimeout(timeout);
    }
});

// 🔹 API 구현

app.post("/api/learn-chat", rateLimit("learn-chat", 40, 60_000), async (req, res) => {
    let payload;
    try {
        payload = buildLearnMessages(req.body);
    } catch (err) {
        return res.status(err.status || 400).json({ error: err.message });
    }

    try {
        const result = await callLearnLlm(payload.messages, payload.engine);
        res.json({
            ok: true,
            answer: result.answer,
            model: result.model,
            provider: result.provider,
            engine: result.engine,
            label: result.label
        });
    } catch (err) {
        const status = err.status && Number.isInteger(err.status) ? err.status : 500;
        console.error("Learn chat failed:", err.message);
        res.status(status).json({ error: status === 503 ? err.message : "LLM request failed" });
    }
});

app.post("/api/learn-chat/stream", rateLimit("learn-chat-stream", 40, 60_000), async (req, res) => {
    let payload;
    let target;

    try {
        payload = buildLearnMessages(req.body);
        target = buildLlmTarget(payload.engine);
    } catch (err) {
        return res.status(err.status || 400).json({ error: err.message });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
    let finished = false;

    res.on("close", () => {
        if (!finished) controller.abort();
    });

    res.status(200);
    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof res.flushHeaders === "function") res.flushHeaders();

    writeNdjson(res, "meta", {
        provider: target.provider,
        model: target.model,
        engine: target.engine,
        route: target.route,
        label: target.label
    });

    try {
        const answer = await readLearnLlmStream(target, payload.messages, controller.signal, text => {
            writeNdjson(res, "delta", { text });
        });

        if (!answer) {
            const err = new Error("Empty LLM response");
            err.status = 502;
            throw err;
        }

        finished = true;
        writeNdjson(res, "done", { answer });
        if (!res.writableEnded && !res.destroyed) res.end();
    } catch (err) {
        const aborted = controller.signal.aborted || err.name === "AbortError";
        if (aborted && res.destroyed) return;

        const status = err.status && Number.isInteger(err.status) ? err.status : (aborted ? 499 : 500);
        const message = aborted ? "LLM stream stopped" : (status === 503 ? err.message : "LLM request failed");
        if (!aborted) console.error("Learn chat stream failed:", err.message);

        finished = true;
        writeNdjson(res, "error", { error: message });
        if (!res.writableEnded && !res.destroyed) res.end();
    } finally {
        clearTimeout(timeout);
    }
});

app.post("/api/pack-maker/chat/stream", authUser, rateLimit("pack-maker-chat", 20, 60_000, req => req.user.id), async (req, res) => {
    const message = sanitizeChatText(req.body?.message);
    if (!message) return res.status(400).json({ error: "Message required" });

    const engine = normalizeChatEngine(req.body?.engine);
    if (!engine) return res.status(400).json({ error: "Invalid LLM engine" });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PACK_MAKER_TIMEOUT_MS);
    let finished = false;

    res.on("close", () => {
        if (!finished) controller.abort();
    });

    res.status(200);
    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof res.flushHeaders === "function") res.flushHeaders();

    try {
        const intent = extractPackIntent(message);
        if (!isPackGenerationRequest(message, intent)) {
            const answer = packMakerBriefResponse(message);
            finished = true;
            writeNdjson(res, "meta", {
                engine,
                route: "not-needed",
                label: engine === "openai" ? "GPT 5.4 mini" : "KUGNUS SERVER"
            });
            writeNdjson(res, "status", { text: "PACK BRIEF REQUIRED" });
            writeNdjson(res, "delta", { text: answer });
            writeNdjson(res, "done", { answer });
            if (!res.writableEnded && !res.destroyed) res.end();
            return;
        }

        const target = buildLlmTarget(engine);
        writeNdjson(res, "meta", {
            provider: target.provider,
            model: target.model,
            engine: target.engine,
            route: target.route,
            label: target.label
        });

        writeNdjson(res, "status", {
            text: `TARGET ${intent.requestedCount} ${packLanguageLabel(intent.termLanguage)} TERMS`
        });

        const searchResults = await duckDuckGoSearch(`${intent.topic || message} glossary key terms official docs`);
        writeNdjson(res, "search", { results: searchResults });
        const payload = buildPackMakerMessages(req.body, searchResults, intent);

        const generated = await generatePackMakerDraftInBatches(
            target,
            payload,
            searchResults,
            controller.signal,
            text => writeNdjson(res, "delta", { text }),
            text => writeNdjson(res, "status", { text })
        );

        const answer = generated.answer;
        const draft = generated.draft;

        if (!draftMeetsPackIntent(draft, payload.intent)) {
            finished = true;
            writeNdjson(res, "draft", { draft });
            writeNdjson(res, "status", {
                text: `DRAFT SHORT - ${draft.items.length}/${payload.intent.requestedCount}`,
                danger: true
            });
            writeNdjson(res, "error", {
                error: `DRAFT SHORT - ${draft.items.length}/${payload.intent.requestedCount}`
            });
            if (!res.writableEnded && !res.destroyed) res.end();
            return;
        }

        finished = true;
        writeNdjson(res, "status", {
            text: `${draft.items.length}/${payload.intent.requestedCount} ITEMS READY`
        });
        writeNdjson(res, "draft", { draft });
        writeNdjson(res, "done", { answer });
        if (!res.writableEnded && !res.destroyed) res.end();
    } catch (err) {
        const aborted = controller.signal.aborted || err.name === "AbortError";
        if (aborted && res.destroyed) return;

        const status = err.status && Number.isInteger(err.status) ? err.status : (aborted ? 499 : 500);
        const messageText = aborted ? "Pack Maker timed out before completing the draft" : (status === 503 ? err.message : "Pack Maker request failed");
        if (!aborted) console.error("Pack Maker stream failed:", err.message);

        finished = true;
        writeNdjson(res, "error", { error: messageText });
        if (!res.writableEnded && !res.destroyed) res.end();
    } finally {
        clearTimeout(timeout);
    }
});

app.get("/api/packs", authUser, rateLimit("packs-list", 80, 60_000, req => req.user.id), async (req, res) => {
    const scope = String(req.query.scope || "mine").toLowerCase();
    if (scope !== "mine" && scope !== "public") {
        return res.status(400).json({ error: "Invalid pack scope" });
    }

    try {
        await ensureCustomPackTables();
        const params = [];
        let where;
        if (scope === "mine") {
            where = "p.owner_id = ?";
            params.push(req.user.id);
        } else {
            where = "p.status = 'approved'";
        }

        const [rows] = await db.query(`
            SELECT p.*, u.nickname AS owner_nickname,
                (SELECT COUNT(*) FROM custom_pack_items i WHERE i.pack_id = p.id) AS item_count
            FROM custom_packs p
            JOIN users u ON u.id = p.owner_id
            WHERE ${where}
            ORDER BY p.updated_at DESC
            LIMIT 50
        `, params);

        res.json({ packs: rows.map(row => serializePackRow(row)) });
    } catch (err) {
        console.error("Pack list failed:", err.message);
        res.status(500).json({ error: "Database error" });
    }
});

app.get("/api/packs/:id", authUser, rateLimit("packs-detail", 120, 60_000, req => req.user.id), async (req, res) => {
    let id;
    try {
        id = packId(req.params.id);
    } catch (err) {
        return res.status(err.status || 400).json({ error: err.message });
    }

    try {
        await ensureCustomPackTables();
        const row = await fetchPackRow(id);
        if (!row || !packRowVisibleToUser(row, req.user)) {
            return res.status(404).json({ error: "Pack not found" });
        }
        const items = await fetchPackItems(id);
        res.json({ pack: serializePackRow(row, items) });
    } catch (err) {
        console.error("Pack detail failed:", err.message);
        res.status(500).json({ error: "Database error" });
    }
});

app.post("/api/packs", authUser, rateLimit("packs-save", 20, 60_000, req => req.user.id), async (req, res) => {
    let payload;
    try {
        payload = sanitizePackPayload(req.body, { strict: true });
    } catch (err) {
        return res.status(err.status || 400).json({ error: err.message });
    }

    const status = payload.submitForReview ? "pending" : "draft";
    const connection = await db.getConnection();

    try {
        await ensureCustomPackTables();
        await connection.beginTransaction();

        let id = payload.id;
        if (id) {
            const [rows] = await connection.query("SELECT owner_id, status FROM custom_packs WHERE id = ? LIMIT 1", [id]);
            const row = rows[0];
            if (!row || row.owner_id !== req.user.id) {
                await connection.rollback();
                return res.status(404).json({ error: "Pack not found" });
            }
            if (row.status === "approved" && status !== "pending") {
                await connection.rollback();
                return res.status(400).json({ error: "Approved packs must be resubmitted for review after edits" });
            }
            await connection.query(
                "UPDATE custom_packs SET title = ?, description = ?, status = ?, review_reason = '' WHERE id = ?",
                [payload.title, payload.description, status, id]
            );
        } else {
            const [result] = await connection.query(
                "INSERT INTO custom_packs (owner_id, title, description, status) VALUES (?, ?, ?, ?)",
                [req.user.id, payload.title, payload.description, status]
            );
            id = result.insertId;
        }

        await savePackItems(connection, id, payload.items);
        await connection.commit();

        const row = await fetchPackRow(id);
        const items = await fetchPackItems(id);
        res.json({ ok: true, pack: serializePackRow(row, items) });
    } catch (err) {
        await connection.rollback();
        console.error("Pack save failed:", err.message);
        res.status(500).json({ error: "Database error" });
    } finally {
        connection.release();
    }
});

app.post("/api/packs/:id/review", authUser, rateLimit("packs-review", 20, 60_000, req => req.user.id), async (req, res) => {
    if (!isPackAdmin(req.user)) return res.status(403).json({ error: "Pack admin required" });

    let id;
    try {
        id = packId(req.params.id);
    } catch (err) {
        return res.status(err.status || 400).json({ error: err.message });
    }

    const action = String(req.body?.action || "").toLowerCase();
    if (action !== "approve" && action !== "reject") return res.status(400).json({ error: "Invalid review action" });
    const status = action === "approve" ? "approved" : "rejected";
    const reason = sanitizePackText(req.body?.reason, 240);

    try {
        await ensureCustomPackTables();
        const [result] = await db.query(
            "UPDATE custom_packs SET status = ?, review_reason = ? WHERE id = ?",
            [status, reason, id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: "Pack not found" });
        const row = await fetchPackRow(id);
        const items = await fetchPackItems(id);
        res.json({ ok: true, pack: serializePackRow(row, items) });
    } catch (err) {
        console.error("Pack review failed:", err.message);
        res.status(500).json({ error: "Database error" });
    }
});

app.post("/api/packs/:id/submit-score", authUser, rateLimit("pack-score", 60, 60_000, req => req.user.id), async (req, res) => {
    let id;
    try {
        id = packId(req.params.id);
    } catch (err) {
        return res.status(err.status || 400).json({ error: err.message });
    }

    const safeScore = boundedNumber(req.body?.score, 0, MAX_SUBMITTED_SCORE);
    const safeWpm = boundedNumber(req.body?.wpm ?? 0, 0, 1000);
    const safeAccuracy = boundedNumber(req.body?.accuracy ?? 0, 0, 100);
    const safeDifficulty = normalizeCategory(req.body?.difficulty, DIFFICULTIES);
    if (safeScore === null || safeWpm === null || safeAccuracy === null || !safeDifficulty) {
        return res.status(400).json({ error: "Missing fields" });
    }

    try {
        await ensureCustomPackTables();
        const row = await fetchPackRow(id);
        if (!row || !packRowVisibleToUser(row, req.user)) return res.status(404).json({ error: "Pack not found" });

        await db.query(
            "INSERT INTO custom_pack_scores (pack_id, user_id, score, wpm, accuracy, difficulty) VALUES (?, ?, ?, ?, ?, ?)",
            [id, req.user.id, safeScore, safeWpm, safeAccuracy, safeDifficulty]
        );
        const top10 = await getCustomPackLeaderboard(id, safeDifficulty);
        res.json({ ok: true, top10 });
    } catch (err) {
        console.error("Custom pack score failed:", err.message);
        res.status(500).json({ error: "Database error" });
    }
});

app.get("/api/packs/:id/leaderboard", authUser, rateLimit("pack-leaderboard", 120, 60_000, req => req.user.id), async (req, res) => {
    let id;
    try {
        id = packId(req.params.id);
    } catch (err) {
        return res.status(err.status || 400).json({ error: err.message });
    }

    const difficulty = normalizeCategory(req.query.difficulty, DIFFICULTIES);
    if (difficulty === false) return res.status(400).json({ error: "Invalid leaderboard filter" });

    try {
        await ensureCustomPackTables();
        const row = await fetchPackRow(id);
        if (!row || !packRowVisibleToUser(row, req.user)) return res.status(404).json({ error: "Pack not found" });
        const top10 = await getCustomPackLeaderboard(id, difficulty);
        res.json({ top10 });
    } catch (err) {
        console.error("Custom pack leaderboard failed:", err.message);
        res.status(500).json({ error: "Database error" });
    }
});

// 1. 회원가입
app.post("/register", rateLimit("register", 12), async (req, res) => {
    const { nickname, password } = req.body;
    if (!nickname || !password) return res.status(400).json({ error: "Nickname and password required" });
    if (!validNickname(nickname)) return res.status(400).json({ error: "Nickname must be 3-16 letters, numbers, _ or -" });
    if (password.length < 4) return res.status(400).json({ error: "Password must be at least 4 characters" });

    try {
        // Check if user exists
        const [rows] = await db.query("SELECT id FROM users WHERE nickname = ?", [nickname]);
        if (rows.length > 0) {
            return res.status(409).json({ error: "Nickname already taken" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const [result] = await db.query("INSERT INTO users (nickname, password) VALUES (?, ?)", [nickname, hashedPassword]);
        const token = createSession({ id: result.insertId, nickname });
        return res.json({ user_id: result.insertId, nickname, token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

// 2. 로그인
app.post("/login", rateLimit("login", 20), async (req, res) => {
    const { nickname, password } = req.body;
    if (!nickname || !password) return res.status(400).json({ error: "Nickname and password required" });
    if (!validNickname(nickname)) return res.status(400).json({ error: "Invalid nickname format" });

    try {
        const [rows] = await db.query("SELECT id, nickname, password FROM users WHERE nickname = ?", [nickname]);
        if (rows.length === 0) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const user = rows[0];

        // Handle legacy users (no password)
        if (!user.password) {
            return res.status(401).json({ error: "Legacy account. Please contact admin or register new account." });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = createSession({ id: user.id, nickname: user.nickname });
        return res.json({ user_id: user.id, nickname: user.nickname, token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

// 3. 회원탈퇴
app.post("/withdraw", authUser, rateLimit("withdraw", 8, 60_000, req => req.user.id), async (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: "Missing fields" });

    await ensureCustomPackTables();
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();
        // Verify password before deleting
        const [rows] = await connection.query("SELECT password FROM users WHERE id = ?", [req.user.id]);
        if (rows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: "User not found" });
        }

        const match = await bcrypt.compare(password, rows[0].password);
        if (!match) {
            await connection.rollback();
            return res.status(401).json({ error: "Incorrect password" });
        }

        await connection.query(`
            DELETE FROM custom_pack_scores
            WHERE user_id = ?
               OR pack_id IN (SELECT id FROM custom_packs WHERE owner_id = ?)
        `, [req.user.id, req.user.id]);
        await connection.query(`
            DELETE FROM custom_pack_items
            WHERE pack_id IN (SELECT id FROM custom_packs WHERE owner_id = ?)
        `, [req.user.id]);
        await connection.query("DELETE FROM custom_packs WHERE owner_id = ?", [req.user.id]);
        await connection.query("DELETE FROM leaderboard WHERE user_id = ?", [req.user.id]);
        await connection.query("DELETE FROM users WHERE id = ?", [req.user.id]);
        await connection.commit();
        if (req.sessionToken) sessions.delete(req.sessionToken);

        res.json({ ok: true });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ error: "Database error" });
    } finally {
        connection.release();
    }
});

// 2. 점수 제출
app.post("/submit", authUser, rateLimit("submit", 60, 60_000, req => req.user.id), async (req, res) => {
    const { score, wpm, accuracy, difficulty, pack } = req.body;

    const safeScore = boundedNumber(score, 0, MAX_SUBMITTED_SCORE);
    const safeWpm = boundedNumber(wpm ?? 0, 0, 1000);
    const safeAccuracy = boundedNumber(accuracy ?? 0, 0, 100);
    const safeDifficulty = normalizeCategory(difficulty, DIFFICULTIES);
    const safePack = normalizeCategory(pack, PACKS);

    if (safeScore === null || safeWpm === null || safeAccuracy === null || !safeDifficulty || !safePack) {
        return res.status(400).json({ error: "Missing fields" });
    }

    try {
        await db.query(
            "INSERT INTO leaderboard (user_id, score, wpm, accuracy, difficulty, pack) VALUES (?, ?, ?, ?, ?, ?)",
            [req.user.id, safeScore, safeWpm, safeAccuracy, safeDifficulty, safePack]
        );

        // Return updated top 10 for this category
        const top10 = await getLeaderboard(safeDifficulty, safePack);
        res.json({ ok: true, top10 });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

// 3. 리더보드 조회
app.get("/leaderboard", async (req, res) => {
    const difficulty = normalizeCategory(req.query.difficulty, DIFFICULTIES);
    const pack = normalizeCategory(req.query.pack, PACKS);
    if (difficulty === false || pack === false) {
        return res.status(400).json({ error: "Invalid leaderboard filter" });
    }

    try {
        const top10 = await getLeaderboard(difficulty, pack);
        res.json({ top10 });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

app.get(/^\/games\/codedrop(?:\/.*)?$/, (req, res) => {
    sendIndexHtml(res);
});

// Helper function to get leaderboard
async function getLeaderboard(difficulty, pack) {
    let query = `
        SELECT l.id, u.nickname, l.score, l.wpm, l.accuracy, l.created_at, l.difficulty, l.pack
        FROM leaderboard l
        JOIN users u ON l.user_id = u.id
    `;

    const params = [];
    const conditions = [];

    if (difficulty) {
        conditions.push("l.difficulty = ?");
        params.push(difficulty);
    }
    if (pack) {
        conditions.push("l.pack = ?");
        params.push(pack);
    }

    if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY l.score DESC LIMIT 10";

    const [rows] = await db.query(query, params);
    return rows;
}

async function getCustomPackLeaderboard(packIdValue, difficulty) {
    let query = `
        SELECT s.id, u.nickname, s.score, s.wpm, s.accuracy, s.created_at, s.difficulty, s.pack_id
        FROM custom_pack_scores s
        JOIN users u ON u.id = s.user_id
        WHERE s.pack_id = ?
    `;
    const params = [packIdValue];

    if (difficulty) {
        query += " AND s.difficulty = ?";
        params.push(difficulty);
    }

    query += " ORDER BY s.score DESC LIMIT 10";
    const [rows] = await db.query(query, params);
    return rows;
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`CodeDrop server running on port ${PORT}`);
});
