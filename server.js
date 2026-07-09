import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import crypto from "crypto";
import https from "https";
import { Resolver, resolve4 } from "dns/promises";
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

function envValue(name) {
    return String(process.env[name] || "").trim();
}

function normalizedEngineName(value, fallback = "gemini") {
    const engine = String(value || fallback).toLowerCase().replace(/[\s_]+/g, "-");
    if (engine === "openai" || engine === "gpt-5-4-mini" || engine === "gpt54-mini") return "openai";
    if (engine === "kugnus" || engine === "kugnus-ai" || engine === "local") return "kugnus";
    if (engine === "gemini" || engine === "google" || engine === "gemini-flash") return "gemini";
    return engine;
}

function validateProductionConfig() {
    if (!IS_PRODUCTION) return [];

    const errors = [];
    const sessionSecret = envValue("SESSION_SECRET");
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
        if (!envValue(name)) errors.push(`${name} is required in production`);
    }

    const defaultEngine = normalizedEngineName(process.env.DEFAULT_CHAT_ENGINE);
    if (!["gemini", "openai", "kugnus"].includes(defaultEngine)) {
        errors.push(`DEFAULT_CHAT_ENGINE must be gemini, openai, or kugnus in production: ${process.env.DEFAULT_CHAT_ENGINE}`);
    }

    const hasAnyKugnusConfig = ["KUGNUS_GATEWAY_BASE_URL", "KUGNUS_GATEWAY_API_KEY", "KUGNUS_GATEWAY_MODEL", "KUGNUS_CHAT_MODEL"]
        .some(name => envValue(name));
    if (defaultEngine === "kugnus" || hasAnyKugnusConfig) {
        for (const name of ["KUGNUS_GATEWAY_BASE_URL", "KUGNUS_GATEWAY_API_KEY"]) {
            if (!envValue(name)) errors.push(`${name} is required when KUGNUS is enabled in production`);
        }
        if (!["KUGNUS_GATEWAY_MODEL", "KUGNUS_CHAT_MODEL"].some(name => envValue(name))) {
            errors.push("KUGNUS_GATEWAY_MODEL or KUGNUS_CHAT_MODEL is required when KUGNUS is enabled in production");
        }
    }

    const gatewayBase = envValue("KUGNUS_GATEWAY_BASE_URL");
    if (gatewayBase && !publicHttpsUrlLike(gatewayBase)) {
        errors.push(`KUGNUS_GATEWAY_BASE_URL must be a public https URL: ${gatewayBase}`);
    }

    if (defaultEngine === "gemini" && !envValue("GEMINI_API_KEY")) {
        errors.push("GEMINI_API_KEY is required when DEFAULT_CHAT_ENGINE=gemini in production");
    }

    if (defaultEngine === "openai" && !envValue("OPENAI_API_KEY")) {
        errors.push("OPENAI_API_KEY is required when DEFAULT_CHAT_ENGINE=openai in production");
    }

    const openAiModel = envValue("OPENAI_MODEL");
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
app.use(express.json({ limit: "2mb" }));
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
            if (err.code === "EPIPE" || err.code === "ECONNABORTED" || res.headersSent || res.writableEnded) {
                return;
            }
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
const GEMINI_TIMEOUT_MS = Math.max(LLM_TIMEOUT_MS, Math.min(Number(process.env.GEMINI_TIMEOUT_MS) || 120_000, 180_000));
const PACK_MAKER_TIMEOUT_MS = Math.max(LLM_TIMEOUT_MS, Math.min(Number(process.env.PACK_MAKER_TIMEOUT_MS) || 600_000, 600_000));
const KUGNUS_HEALTH_TIMEOUT_MS = Math.max(1000, Math.min(Number(process.env.KUGNUS_HEALTH_TIMEOUT_MS) || 12_000, 30_000));
const CHAT_ENGINES = new Set(["kugnus", "openai", "gemini"]);
const PACK_STATUSES = new Set(["draft", "pending", "approved", "rejected"]);
const MAX_PACK_TITLE_LEN = 60;
const MAX_PACK_DESC_LEN = 240;
const MIN_PACK_ITEMS = 10;
const MAX_PACK_ITEMS = 120;
const MAX_PACK_TERM_LEN = 80;
const MAX_PACK_ITEM_DESC_LEN = 180;
const MAX_PACK_SOURCES = 3;
const MIN_LONG_PACK_TEXT_LEN = 20;
const MAX_LONG_PACK_TEXT_LEN = 60_000;
const DEFAULT_PACK_TARGET_COUNT = 30;
const PACK_REPAIR_ATTEMPTS = 2;
const PACK_FINAL_FILL_ATTEMPTS = 2;
const PACK_WIDE_FILL_ATTEMPTS = 2;
const PACK_MICRO_SWEEP_ATTEMPTS = 4;
const PACK_MAKER_BATCH_SIZE = 25;
const PACK_MAKER_BATCH_TIMEOUT_MS = Math.max(10_000, Math.min(Number(process.env.PACK_MAKER_BATCH_TIMEOUT_MS) || 180_000, 180_000));
const PACK_MAKER_TEMPERATURE = Math.max(0.1, Math.min(Number(process.env.PACK_MAKER_TEMPERATURE) || 0.65, 1.2));
const PACK_MAKER_SWEEP_TEMPERATURE = Math.max(PACK_MAKER_TEMPERATURE, Math.min(Number(process.env.PACK_MAKER_SWEEP_TEMPERATURE) || 0.85, 1.3));
const KPOP_NON_GROUP_TERM_RE = /^(?:조PD|조피디|JYP|박진영|싸이|PSY|아이유|IU|보아|BoA|비|Rain|청하|현아|선미|태연|태민|지코|ZICO|지드래곤|G-?DRAGON|GD|에일리|Ailee|크러쉬|Crush|헤이즈|Heize|딘|DEAN)$/i;
const KPOP_IDOL_GROUP_TERMS = [
    "H.O.T.", "S.E.S.", "Fin.K.L", "god", "신화", "클릭비", "코요태", "플라이 투 더 스카이",
    "동방신기", "TVXQ", "Super Junior", "BIGBANG", "Wonder Girls", "소녀시대", "Girls' Generation",
    "KARA", "SHINee", "2PM", "2AM", "2NE1", "티아라", "f(x)", "BEAST", "Highlight",
    "INFINITE", "SISTAR", "miss A", "Apink", "B1A4", "EXID", "BTOB", "VIXX", "EXO", "AOA",
    "BTS", "방탄소년단", "Red Velvet", "레드벨벳", "MAMAMOO", "마마무", "GOT7", "WINNER",
    "iKON", "TWICE", "트와이스", "SEVENTEEN", "세븐틴", "GFRIEND", "여자친구", "MONSTA X",
    "BLACKPINK", "블랙핑크", "NCT", "ASTRO", "PENTAGON", "Stray Kids", "스트레이 키즈",
    "(G)I-DLE", "아이들", "IZ*ONE", "ITZY", "ATEEZ", "TXT", "TOMORROW X TOGETHER",
    "aespa", "에스파", "ENHYPEN", "IVE", "아이브", "LE SSERAFIM", "르세라핌", "NewJeans",
    "뉴진스", "NMIXX", "RIIZE", "ZEROBASEONE", "BOYNEXTDOOR", "BABYMONSTER", "TWS", "ILLIT",
    "KISS OF LIFE", "tripleS", "Kep1er", "THE BOYZ", "LOONA", "이달의 소녀", "Dreamcatcher",
    "드림캐쳐", "WJSN", "우주소녀", "Oh My Girl", "오마이걸", "Lovelyz", "TREASURE", "CRAVITY",
    "STAYC", "fromis_9", "프로미스나인", "NCT DREAM", "NCT 127", "NCT WISH"
];
const REVIEW_EMAIL_TIMEOUT_MS = Math.max(3000, Math.min(Number(process.env.REVIEW_EMAIL_TIMEOUT_MS) || 10_000, 30_000));
const PACK_ADMIN_NICKNAMES = new Set(
    (process.env.PACK_ADMIN_NICKNAMES || "")
        .split(",")
        .map(name => name.trim().toLowerCase())
        .filter(Boolean)
);
let customPackTablesReady = null;
let customPackSchemaReady = null;
let databaseSchemaReady = null;

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
    "KUGNUS_GATEWAY_MODEL",
    "KUGNUS_CHAT_MODEL"
];

const GEMINI_KEY_ENV_NAMES = [
    "GEMINI_API_KEY",
    "GOOGLE_GEMINI_API_KEY"
];

const GEMINI_MODEL_ENV_NAMES = [
    "GEMINI_MODEL",
    "GEMINI_CHAT_MODEL"
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
    "확실하지 않은 시험 정책이나 버전 의존 내용은 단정하지 말고 확인 필요성을 말한다.",
    "응답은 원칙적으로 6~10줄 안에서 끝낸다. 장황한 개론, 인사말, 면책 문구, 불필요한 Markdown 장식은 쓰지 않는다.",
    "항상 아래 답변 골격을 따른다:",
    "1) 핵심: 사용자의 질문에 대한 결론을 1~2문장으로 말한다.",
    "2) 명령: 필요한 경우 바로 따라 칠 명령어를 코드블록 1개 이하로 제시한다.",
    "3) 확인: 결과를 검증할 oc/kubectl 명령이나 관찰 포인트를 1~2개 말한다.",
    "4) 조교의 한마디: 마지막 줄은 반드시 '조교의 한마디:'로 시작하고, 시험장에서 기억할 핵심 습관을 한 문장으로 짚는다."
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
    "term 언어 지시가 있으면 모든 term은 그 언어를 따른다. desc 언어 지시가 있으면 모든 desc는 그 언어를 따른다.",
    "desc 언어 지시가 없으면 desc는 한국어 한 줄 설명으로 쓴다.",
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
    const engine = normalizedEngineName(value || process.env.DEFAULT_CHAT_ENGINE);
    if (engine === "openai" || engine === "gpt-5-4-mini" || engine === "gpt54-mini") return "openai";
    if (engine === "kugnus" || engine === "kugnus-ai" || engine === "local") return "kugnus";
    if (engine === "gemini" || engine === "google" || engine === "gemini-flash") return "gemini";
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

function geminiApiBaseUrl() {
    return String(process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta")
        .trim()
        .replace(/\/+$/, "")
        .replace(/\/models\/[^/]+:(streamGenerateContent|generateContent)(\?.*)?$/i, "");
}

function geminiContentUrl(model, stream = false) {
    const baseUrl = geminiApiBaseUrl();
    const method = stream ? "streamGenerateContent?alt=sse" : "generateContent";
    return `${baseUrl}/models/${encodeURIComponent(model)}:${method}`;
}

function geminiDisplayLabel(model) {
    const id = String(model || "gemini-2.5-flash").trim();
    if (!id) return "GEMINI";
    return id
        .replace(/^gemini[-_]?/i, "GEMINI ")
        .replace(/[-_]+/g, " ")
        .toUpperCase();
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

function isKugnusGatewayTarget(target) {
    return target?.engine === "kugnus" && target?.route === "gateway" && target?.provider === "openai";
}

function shouldRetryGatewayWithResolve4(target, err) {
    if (!isKugnusGatewayTarget(target)) return false;
    const code = err?.cause?.code || err?.code || "";
    const message = String(err?.message || "");
    return code === "ENOTFOUND"
        || code === "EAI_AGAIN"
        || message === "fetch failed"
        || /ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(message);
}

function httpsTextRequestWithLookup(urlString, { method = "GET", headers = {}, body = "", signal } = {}, address) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlString);
        const request = https.request(url, {
            method,
            headers,
            lookup(hostname, options, callback) {
                if (typeof options === "function") {
                    callback = options;
                    options = {};
                }
                if (options?.all) {
                    callback(null, [{ address, family: 4 }]);
                    return;
                }
                callback(null, address, 4);
            }
        }, response => {
            const chunks = [];
            response.on("data", chunk => chunks.push(chunk));
            response.on("end", () => {
                resolve({
                    ok: response.statusCode >= 200 && response.statusCode < 300,
                    status: response.statusCode || 0,
                    text: Buffer.concat(chunks).toString("utf8"),
                    dnsFallback: true
                });
            });
        });

        request.on("error", reject);
        request.on("close", () => {
            if (signal) signal.removeEventListener("abort", abort);
        });

        const abort = () => {
            request.destroy(new Error("Request aborted"));
        };
        if (signal) {
            if (signal.aborted) return abort();
            signal.addEventListener("abort", abort, { once: true });
        }

        if (body) request.write(body);
        request.end();
    });
}

async function httpsTextRequestWithResolve4(urlString, options = {}) {
    const url = new URL(urlString);
    const addresses = await resolveGatewayAddresses(url.hostname);
    if (!addresses.length) throw new Error(`DNS resolve4 returned no addresses for ${url.hostname}`);

    let lastError;
    for (const address of addresses) {
        try {
            return await httpsTextRequestWithLookup(urlString, options, address);
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError || new Error(`KUGNUS gateway DNS fallback failed for ${url.hostname}`);
}

async function resolveGatewayAddresses(hostname) {
    const attempts = [
        { label: "system", run: () => resolve4(hostname) },
        {
            label: "cloudflare",
            run: () => {
                const resolver = new Resolver();
                resolver.setServers(["1.1.1.1", "1.0.0.1"]);
                return resolver.resolve4(hostname);
            }
        },
        {
            label: "google",
            run: () => {
                const resolver = new Resolver();
                resolver.setServers(["8.8.8.8", "8.8.4.4"]);
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

    const err = new Error(`KUGNUS gateway DNS fallback failed for ${hostname} (${errors.join(", ")})`);
    err.code = "KUGNUS_DNS_FALLBACK_FAILED";
    throw err;
}

async function fetchLlmText(target, url, options = {}) {
    try {
        const response = await fetch(url, options);
        return {
            ok: response.ok,
            status: response.status,
            text: await response.text().catch(() => ""),
            dnsFallback: false
        };
    } catch (err) {
        if (!shouldRetryGatewayWithResolve4(target, err)) throw err;
        return httpsTextRequestWithResolve4(url, options);
    }
}

function kugnusRouteFromEnvName(envName) {
    return envName === "KUGNUS_GATEWAY_BASE_URL" ? "gateway" : "unknown";
}

function buildLlmTarget(engine = "gemini") {
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

    if (engine === "gemini") {
        const model = String(envFirst(GEMINI_MODEL_ENV_NAMES) || "gemini-2.5-flash").trim();
        const apiKey = envFirst(GEMINI_KEY_ENV_NAMES);

        if (!apiKey) {
            const err = new Error("Gemini API key is not configured");
            err.status = 503;
            throw err;
        }

        return {
            engine: "gemini",
            label: geminiDisplayLabel(model),
            provider: "gemini",
            route: "google",
            url: geminiContentUrl(model, false),
            streamUrl: geminiContentUrl(model, true),
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

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function publicAppBaseUrl(req) {
    const configured = envFirst(["PUBLIC_APP_URL"]);
    if (configured) return configured.replace(/\/+$/, "");

    const proto = req.get("x-forwarded-proto") || req.protocol || "http";
    const host = req.get("x-forwarded-host") || req.get("host") || `localhost:${PORT}`;
    return `${proto}://${host}/games/codedrop`;
}

function reviewUrlForPack(req, pack, intent = "") {
    const url = new URL(`${publicAppBaseUrl(req)}/admin/packs`);
    url.searchParams.set("pack", String(pack.id));
    if (intent) url.searchParams.set("intent", intent);
    return url.toString();
}

function reviewEmailPreviewItems(items) {
    return items.slice(0, 8).map((item, index) => `
        <tr>
            <td style="padding:10px 8px;color:#ff2f5f;font-family:monospace;font-size:13px;">${String(index + 1).padStart(2, "0")}</td>
            <td style="padding:10px 8px;color:#ffffff;font-family:monospace;font-weight:700;">${escapeHtml(item.term)}</td>
            <td style="padding:10px 8px;color:#cfd4dc;font-family:monospace;">${escapeHtml(item.desc)}</td>
        </tr>
    `).join("");
}

function renderPackReviewEmail({ pack, items, user, openUrl, approveUrl, rejectUrl }) {
    const safeTitle = escapeHtml(pack.title);
    const safeUser = escapeHtml(user.nickname);
    const packKind = sanitizePackKind(pack.pack_kind || pack.kind || pack.packKind);
    const isLongPack = packKind === "long";
    const sourceCount = isLongPack ? 1 : items.reduce((sum, item) => sum + (Array.isArray(item.sources) ? item.sources.length : 0), 0);
    const missingSources = isLongPack ? 0 : items.filter(item => !Array.isArray(item.sources) || item.sources.length === 0).length;
    const longPreview = escapeHtml(sanitizeLongPackText(pack.text_content || pack.text || "").slice(0, 1800));
    const previewBlock = isLongPack
        ? `<div style="border:1px solid rgba(0,243,255,.35);background:#050507;padding:14px;color:#d8e2ed;font-family:monospace;white-space:pre-wrap;line-height:1.65;max-height:340px;overflow:auto;">${longPreview || "No long text preview"}</div>`
        : `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid rgba(0,243,255,.35);background:#050507;">
                    ${reviewEmailPreviewItems(items)}
                </table>`;

    return `<!doctype html>
<html>
<body style="margin:0;background:#050507;padding:28px;font-family:Arial,sans-serif;color:#f4f7fb;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:760px;margin:0 auto;background:#090a12;border:1px solid #bc13fe;border-radius:14px;box-shadow:0 0 28px rgba(188,19,254,.45);overflow:hidden;">
        <tr>
            <td style="padding:28px 30px 16px;border-bottom:1px solid rgba(188,19,254,.4);background:linear-gradient(135deg,rgba(188,19,254,.22),rgba(0,243,255,.08));">
                <div style="font-family:monospace;color:#00f3ff;letter-spacing:4px;font-size:13px;">CODEDROP ADMIN</div>
                <h1 style="margin:10px 0 0;color:#ff2f5f;font-size:30px;letter-spacing:2px;">PUBLIC PACK REVIEW</h1>
            </td>
        </tr>
        <tr>
            <td style="padding:24px 30px;">
                <div style="display:inline-block;padding:7px 12px;border:1px solid #ffb000;border-radius:999px;color:#ffb000;font-family:monospace;font-weight:700;letter-spacing:2px;">PENDING</div>
                <h2 style="margin:18px 0 8px;color:#ffffff;font-size:24px;">${safeTitle}</h2>
                <p style="margin:0 0 20px;color:#aeb5c2;font-family:monospace;line-height:1.6;">
                    작성자: <strong style="color:#00f3ff;">${safeUser}</strong><br>
                    팩 유형: <strong>${isLongPack ? "LONG PRACTICE" : "DROP WORD"}</strong><br>
                    항목 수: <strong>${isLongPack ? "장문 1개" : items.length}</strong><br>
                    Source 수: <strong>${isLongPack ? "USER PROVIDED" : sourceCount}</strong><br>
                    Source 누락 항목: <strong style="color:${missingSources ? "#ffb000" : "#00ff85"};">${missingSources}</strong>
                </p>
                ${previewBlock}
                <p style="margin:18px 0 0;color:#777f8e;font-size:12px;font-family:monospace;">메일 버튼은 관리자 로그인 후 해당 팩 검수와 승인/반려 확인창으로 이어집니다.</p>
            </td>
        </tr>
        <tr>
            <td style="padding:0 30px 30px;">
                <a href="${escapeHtml(openUrl)}" style="display:inline-block;margin:0 8px 10px 0;padding:13px 18px;background:#00f3ff;color:#020307;text-decoration:none;font-family:monospace;font-weight:800;letter-spacing:1px;border-radius:6px;">OPEN REVIEW</a>
                <a href="${escapeHtml(approveUrl)}" style="display:inline-block;margin:0 8px 10px 0;padding:13px 18px;background:#00ff85;color:#020307;text-decoration:none;font-family:monospace;font-weight:800;letter-spacing:1px;border-radius:6px;">APPROVE CHECK</a>
                <a href="${escapeHtml(rejectUrl)}" style="display:inline-block;margin:0 0 10px 0;padding:13px 18px;background:#ff2f5f;color:#ffffff;text-decoration:none;font-family:monospace;font-weight:800;letter-spacing:1px;border-radius:6px;">REJECT CHECK</a>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

async function sendPackReviewEmail(req, pack, items, user) {
    const apiKey = envFirst(["RESEND_API_KEY"]);
    const to = envFirst(["REVIEW_NOTIFY_EMAIL"]);
    const from = envFirst(["MAIL_FROM"]) || "CodeDrop <onboarding@resend.dev>";
    if (!apiKey || !to) return { sent: false, reason: "mail env missing" };

    const openUrl = reviewUrlForPack(req, pack);
    const approveUrl = reviewUrlForPack(req, pack, "approve");
    const rejectUrl = reviewUrlForPack(req, pack, "reject");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REVIEW_EMAIL_TIMEOUT_MS);

    try {
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            signal: controller.signal,
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                from,
                to: [to],
                subject: `[CodeDrop] 공개팩 심사 요청: ${pack.title}`,
                html: renderPackReviewEmail({ pack, items, user, openUrl, approveUrl, rejectUrl }),
                text: [
                    "CodeDrop 공개팩 심사 요청",
                    `팩 제목: ${pack.title}`,
                    `작성자: ${user.nickname}`,
                    `팩 유형: ${sanitizePackKind(pack.pack_kind || pack.kind || pack.packKind) === "long" ? "LONG PRACTICE" : "DROP WORD"}`,
                    `항목 수: ${sanitizePackKind(pack.pack_kind || pack.kind || pack.packKind) === "long" ? "장문 1개" : items.length}`,
                    `심사 화면: ${openUrl}`
                ].join("\n")
            })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return { sent: false, reason: data?.message || `resend ${response.status}` };
        }
        return { sent: true, id: data?.id || "" };
    } catch (err) {
        return { sent: false, reason: err.name === "AbortError" ? "mail timeout" : err.message };
    } finally {
        clearTimeout(timeout);
    }
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

function sanitizeLongPackText(value) {
    if (typeof value !== "string") return "";
    return value
        .replace(/\r\n?/g, "\n")
        .replace(/\u00a0/g, " ")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{4,}/g, "\n\n\n")
        .trim()
        .slice(0, MAX_LONG_PACK_TEXT_LEN);
}

function sanitizePackKind(value) {
    return String(value || "").toLowerCase() === "long" ? "long" : "word";
}

function sanitizePackTags(value) {
    if (!Array.isArray(value)) return [];
    const seen = new Set();
    const tags = [];
    for (const item of value) {
        const tag = sanitizePackText(item, 32).toLowerCase();
        if (!tag || seen.has(tag)) continue;
        seen.add(tag);
        tags.push(tag);
        if (tags.length >= 12) break;
    }
    return tags;
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
        snippet: sanitizePackText(source?.snippet, 360)
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
    const packKind = sanitizePackKind(body?.kind || body?.packKind);
    if (packKind === "long") {
        const title = sanitizePackText(body?.title, MAX_PACK_TITLE_LEN);
        const description = sanitizePackText(body?.description, MAX_PACK_DESC_LEN)
            || `${title || "Long Practice Pack"} - user-provided long-form`;
        const text = sanitizeLongPackText(body?.text || body?.textContent || body?.content);
        const submitForReview = body?.submitForReview === true;
        const preprocess = sanitizePackText(body?.preprocess, 32) || "user-provided";
        const tags = sanitizePackTags(body?.tags);

        if (strict) {
            if (title.length < 3) {
                const err = new Error("Pack title must be 3-60 characters");
                err.status = 400;
                throw err;
            }
            if (text.length < MIN_LONG_PACK_TEXT_LEN) {
                const err = new Error(`Long pack text must be at least ${MIN_LONG_PACK_TEXT_LEN} characters`);
                err.status = 400;
                throw err;
            }
        }

        return {
            id: body?.id ? packId(body.id) : null,
            title,
            description,
            items: [],
            submitForReview,
            packKind,
            text,
            preprocess,
            tags
        };
    }

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
        submitForReview,
        packKind: "word",
        text: "",
        preprocess: "",
        tags: []
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

function cleanPackTitleCandidate(value) {
    const cleaned = sanitizePackText(String(value || "")
        .replace(/\d{1,3}\s*(?:개(?:만)?|단어|용어|terms?|items?|words?)\s*(?:로|으로)?/gi, " ")
        .replace(/(?:^|\s)(?:로|으로)(?=\s|팩|$)/g, " ")
        .replace(/(?:로|으로)\s*(?=팩)/g, " ")
        .replace(/^.*(?:뽑아서|뽑아|만들어|생성해서|제작해서|작성해서)\s*/i, "")
        .replace(/^.*(?:기반으로|기반|관련해서|관련)\s*/i, "")
        .replace(/^(?:만|만큼|정도)\s*/i, "")
        .replace(/^(?:한글|한국어|한국말|영어|영문|english)\s*(?:로\s*된|로된|로)?\s*/i, "")
        .replace(/^(?:단어|용어)\s*/i, "")
        .replace(/\s{2,}/g, " ")
        .trim(), MAX_PACK_TITLE_LEN);
    if (/^(?:팩|단어\s*팩|용어\s*팩|키워드\s*팩|data\s*pack)$/i.test(cleaned)) return "";
    return cleaned;
}

function extractPackTitle(message) {
    const text = sanitizePackText(message, MAX_CHAT_MESSAGE_LEN);
    const titlePhrase = "([가-힣A-Za-z0-9][가-힣A-Za-z0-9 _-]{1,38}?팩)";
    const explicitPatterns = [
        new RegExp(`(?:이름은|제목은|타이틀은)\\s*${titlePhrase}`, "i"),
        new RegExp(`\\d{1,3}\\s*개(?:만)?\\s*(?:로|으로)\\s*${titlePhrase}`, "i"),
        new RegExp(`(?:뽑아서|뽑아\\s*서|추려서|골라서|정리해서)\\s*${titlePhrase}`, "i"),
        new RegExp(`(?:로|으로)\\s*${titlePhrase}\\s*(?:초안|만들|생성|제작|작성|부탁|해줘|$)`, "i")
    ];

    for (const pattern of explicitPatterns) {
        const match = text.match(pattern);
        const cleaned = match ? cleanPackTitleCandidate(match[1]) : "";
        if (cleaned) return cleaned;
    }

    const candidates = [...text.matchAll(/([가-힣A-Za-z0-9_-]+(?:\s+[가-힣A-Za-z0-9_-]+){0,3}\s*팩)/g)];
    const fallback = candidates.at(-1);
    return fallback ? cleanPackTitleCandidate(fallback[1]) : "";
}

function inferPackTitleFallback(message, topic) {
    const text = `${message || ""} ${topic || ""}`;
    if (/(미국.{0,12}주|미국의\s*주|u\.?s\.?\s*states?|united\s*states\s*states?)/i.test(text)) {
        return "미국 주 이름 팩";
    }
    if (/((우리나라|한국|대한민국).{0,18}(산|명산|mountain)|korean\s*mountains?)/i.test(text)) {
        return "우리나라 산 이름 팩";
    }
    if (/(예술\s*작가|미술\s*작가|화가|조각가|아티스트|artist|artists|painters?|sculptors?)/i.test(text)) {
        return "예술 작가 이름 팩";
    }
    if (/(국가|국명|나라|세계\s*나라|country|countries|nation|nations)/i.test(text)) {
        return "국가 이름 팩";
    }
    if (/(국내\s*아이돌|한국\s*아이돌|아이돌\s*그룹|케이팝\s*그룹|k[-\s]?pop\s*(?:idol\s*)?groups?)/i.test(text)) {
        return /걸그룹/i.test(text) ? "걸그룹 팩" : (/보이그룹/i.test(text) ? "보이그룹 팩" : "아이돌 그룹 팩");
    }
    if (/(젠지|z세대|gen\s*z|신조어|유행어|밈|slang|meme)/i.test(text)) {
        return "젠지 신조어 팩";
    }
    if (/(판교|it\s*회사|스타트업|개발팀|업무\s*용어|회사\s*용어|말귀|사투리)/i.test(text)) {
        return "판교사투리 팩";
    }
    if (/(육아템|육아|신생아|출산|아기|수유|기저귀|parenting|baby)/i.test(text)) {
        return "육아템 팩";
    }
    if (/(코르티스|cortis|redred)/i.test(text) && /(노래|곡|싱글|앨범|분위기|테마|theme|song|single|album)/i.test(text)) {
        return "REDRED 테마 팩";
    }
    return "";
}

function inferPackTermLanguage(message) {
    const source = String(message || "");
    const termScope = source
        .replace(/(?:맞[^\s,.\n]*\s*때\s*뜨는\s*)?(?:한줄|한\s*줄|설명|해설|뜻|desc|description|explanation)[^,.\n]*(?:한글|한국어|한국말|영어|영문|english|korean)[^,.\n]*/gi, " ")
        .replace(/(?:한글|한국어|한국말|영어|영문|english|korean)[^,.\n]*(?:한줄|한\s*줄|설명|해설|뜻|desc|description|explanation)/gi, " ");
    const text = termScope.toLowerCase();
    if (/(영어|영문|english|영어로)/i.test(termScope) || /\benglish\b/.test(text)) return "english";
    if (/(한글|한국어|한글로|한국어로|한국말)/i.test(termScope)) return "korean";
    return "auto";
}

function inferPackDescriptionLanguage(message) {
    const text = String(message || "");
    const lower = text.toLowerCase();
    const englishDesc =
        /(?:설명|해설|뜻|한줄|한\s*줄)[^.\n]{0,24}(?:영어|영문|english)/i.test(text) ||
        /(?:영어|영문|english)[^.\n]{0,24}(?:설명|해설|뜻|한줄|한\s*줄)/i.test(text) ||
        /(?:desc|description|explanation)[^.\n]{0,24}english/i.test(lower);
    if (englishDesc) return "english";

    const koreanDesc =
        /(?:설명|해설|뜻|한줄|한\s*줄)[^.\n]{0,24}(?:한글|한국어|한국말|korean)/i.test(text) ||
        /(?:한글|한국어|한국말|korean)[^.\n]{0,24}(?:설명|해설|뜻|한줄|한\s*줄)/i.test(text) ||
        /(?:desc|description|explanation)[^.\n]{0,24}korean/i.test(lower);
    if (koreanDesc) return "korean";

    return "korean";
}

function normalizePackLanguageOverride(value) {
    if (value === "korean" || value === "english") return value;
    return "";
}

function isPackConfirmationResponse(message) {
    const compact = String(message || "").replace(/\s+/g, "").trim().toLowerCase();
    return /^(응|ㅇㅇ|어|그래|좋아|좋음|그렇게해줘|그걸로|그걸로해줘|진행|가자|해줘|만들어줘|ok|okay|yes|yep|go|makeit|makeitplease)$/i.test(compact);
}

function sanitizePendingPackSuggestion(value, options = {}) {
    if (!value || typeof value !== "object") return null;
    const title = sanitizePackText(value.title, MAX_PACK_TITLE_LEN);
    const topic = sanitizePackText(value.topic, 180);
    if (!title && !topic) return null;
    return {
        requestedCount: clampPackTargetCount(value.requestedCount || value.count || 50),
        termLanguage: normalizePackLanguageOverride(options.termLanguageOverride) || normalizePackLanguageOverride(value.termLanguage) || "korean",
        descriptionLanguage: normalizePackLanguageOverride(options.descriptionLanguageOverride) || normalizePackLanguageOverride(value.descriptionLanguage) || "korean",
        title: title || inferPackTitleFallback(topic, topic) || "추천 팩",
        topic: topic || title || "추천 도메인 용어"
    };
}

function extractPackIntent(message, options = {}) {
    const text = sanitizePackText(message, MAX_CHAT_MESSAGE_LEN);
    const confirmedSuggestion = sanitizePendingPackSuggestion(options.confirmSuggestion, options);
    if (confirmedSuggestion && isPackConfirmationResponse(text)) {
        return confirmedSuggestion;
    }

    const countMatch =
        text.match(/(\d{1,3})\s*(?:개|단어|용어|terms?|items?|words?)/i) ||
        text.match(/(?:정확히|총|단어|용어|terms?|items?|words?)\s*(\d{1,3})/i);
    const requestedCount = clampPackTargetCount(countMatch ? countMatch[1] : DEFAULT_PACK_TARGET_COUNT);
    const termLanguage = normalizePackLanguageOverride(options.termLanguageOverride) || inferPackTermLanguage(text);
    const descriptionLanguage = normalizePackLanguageOverride(options.descriptionLanguageOverride) || inferPackDescriptionLanguage(text);
    const topic = sanitizePackText(text
        .replace(/(?:팩\s*)?(?:초안|만들어줘|만들|생성|제작|작성|뽑아줘|뽑아서|부탁).*$/i, "")
        .replace(/\d{1,3}\s*(?:개|단어|용어|terms?|items?|words?)/gi, "")
        .replace(/(?:한글|한국어|한국말|영어|영문|english)\s*(?:로\s*된|로된|로)?/gi, "")
        .replace(/\b(?:로|으로)\b/gi, " ")
        .replace(/(?:로|으로)\s*$/g, "")
        .replace(/\s+/g, " ")
        .trim(), 160) || text;
    const title = extractPackTitle(text) || inferPackTitleFallback(text, topic);

    return { requestedCount, termLanguage, descriptionLanguage, title, topic };
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
            "- 도메인: 국가명, EX280, 간호학, 회계, 자동차 정비 등",
            "- 언어: 한글 또는 영어",
            "- 개수: 10-120개",
            "- 팩 이름: 국가이름 팩처럼 저장될 이름",
            "",
            "예: 국가이름 50개로 국가이름 팩 만들어줘. 한글로."
        ].join("\n");
    }

    return [
        "Yes. Pack Maker is for data pack generation requests, not open-ended chat.",
        "",
        "Tell Pack Maker the domain, term language, item count, and pack name.",
        "Example: Make a Korean country-name pack with 50 items."
    ].join("\n");
}

function isPackIdeaPrompt(message) {
    const text = String(message || "");
    return /(아이디어|추천|뭐\s*만들|무슨\s*팩|팩\s*뭐|입사|취직|말귀|못\s*알아듣|판교|it\s*회사|회사\s*용어|업무\s*용어|일상대화|상황)/i.test(text);
}

function isPackClarifyPrompt(message) {
    const text = String(message || "");
    const hasSoftNeed = /(알고\s*싶|리스트|시작했는데|배우고\s*싶|필요해|궁금|정리하고\s*싶|챙겨야|준비)/i.test(text);
    const hasDomain = /(육아|육아템|신생아|출산|아기|젠지|z세대|gen\s*z|신조어|유행어|밈|slang|it\s*회사|판교|업무\s*용어)/i.test(text);
    return hasSoftNeed && hasDomain;
}

function suggestedPackForMessage(message, intent) {
    const profile = packDomainProfile(intent);
    const base = {
        requestedCount: 50,
        termLanguage: "korean",
        descriptionLanguage: "korean"
    };

    if (profile === "workplace_it_slang") {
        return {
            ...base,
            title: "판교사투리 팩",
            topic: "IT 회사와 스타트업에서 자주 쓰는 업무 용어와 판교식 표현"
        };
    }

    if (profile === "parenting_items") {
        return {
            ...base,
            title: "육아템 팩",
            topic: "초보 부모가 알아두면 좋은 육아템과 신생아 육아용품"
        };
    }

    if (profile === "genz_slang") {
        return {
            ...base,
            title: "젠지 신조어 팩",
            topic: "Z세대와 온라인 문화에서 자주 쓰이는 신조어와 밈 표현"
        };
    }

    const title = intent.title || inferPackTitleFallback(message, intent.topic) || "도메인 용어 팩";
    return {
        ...base,
        title,
        topic: sanitizePackText(packTopicSignal(intent) || intent.topic || message || title, 180)
    };
}

function packMakerIdeationResponse(message, intent) {
    const suggestion = suggestedPackForMessage(message, intent);
    const profile = packDomainProfile(suggestion);
    let answer;

    if (profile === "workplace_it_slang") {
        answer = [
            "그 상황이면 바로 `판교사투리 팩`이 좋겠습니다.",
            "",
            "IT 회사에서 말귀가 안 잡힐 때는 업무 영어식 표현, 개발팀 협업 용어, 회의 액션 아이템을 먼저 외우는 게 체감이 큽니다.",
            "",
            "원하면 `판교사투리 팩`으로 50개 한글 제시어와 한글 설명을 만들어드릴게요. 좋으면 `응`이라고 답해주세요."
        ].join("\n");
    } else {
        answer = [
            `좋습니다. 지금 말한 상황은 \`${suggestion.title}\`으로 만들면 잘 맞습니다.`,
            "",
            `초안은 ${suggestion.requestedCount}개 한글 제시어와 한글 설명으로 만들 수 있습니다.`,
            "",
            "이 방향으로 만들까요? 좋으면 `응`이라고 답해주세요. 더 좁히고 싶으면 분야를 한 문장만 더 말해주세요."
        ].join("\n");
    }

    return { answer, suggestion };
}

function packMakerClarifyResponse(message, intent) {
    const suggestion = suggestedPackForMessage(message, intent);
    const profile = packDomainProfile(suggestion);
    let answer;

    if (profile === "parenting_items") {
        answer = [
            "육아는 템빨이라는 말이 있죠.",
            "",
            "`육아템 팩`으로 초보 부모가 자주 접하는 아이템 50개를 뽑아볼까요?",
            "제시어와 한줄설명은 둘 다 한글로 맞춰두겠습니다.",
            "",
            "좋으면 `응`이라고 답해주세요. 수유/수면/외출처럼 범위를 좁혀도 됩니다."
        ].join("\n");
    } else if (profile === "genz_slang") {
        answer = [
            "`젠지 신조어 팩`을 말하는 걸까요?",
            "",
            "Z세대 신조어, 밈 표현, SNS 줄임말을 50개 정도로 묶을 수 있습니다.",
            "맞으면 `응`이라고 답해주세요. 특정 플랫폼이나 커뮤니티 말투로 좁혀도 됩니다."
        ].join("\n");
    } else {
        answer = [
            "팩으로 만들 수 있습니다. 다만 초안을 정확히 만들려면 한 번만 확인할게요.",
            "",
            `\`${suggestion.title}\`으로 ${suggestion.requestedCount}개 한글 제시어와 한글 설명을 만들까요?`,
            "좋으면 `응`이라고 답해주세요. 언어/개수를 바꾸고 싶으면 같이 말해주세요."
        ].join("\n");
    }

    return { answer, suggestion };
}

function classifyPackMakerConversation(message, intent, options = {}) {
    if (sanitizePendingPackSuggestion(options.confirmSuggestion, options) && isPackConfirmationResponse(message)) {
        return "generate";
    }
    if (isPackGenerationRequest(message, intent)) return "generate";
    if (isPackIdeaPrompt(message)) return "ideate";
    if (isPackClarifyPrompt(message)) return "clarify";
    return "brief";
}

function packMakerEngineLabel(engine) {
    if (engine === "openai") return "GPT 5.4 mini";
    if (engine === "gemini") return geminiDisplayLabel(envFirst(GEMINI_MODEL_ENV_NAMES) || "gemini-2.5-flash");
    return "KUGNUS SERVER";
}

function isLyricsExtractionRequest(message) {
    const text = String(message || "");
    const lower = text.toLowerCase();
    return (
        /(?:가사|lyrics?|lyric)[^.\n]{0,80}(?:에서|기반|뽑|추출|단어|용어|팩|만들|word|term|extract|make|pack)/i.test(text) ||
        /(?:from|based on|extract)[^.\n]{0,80}(?:lyrics?|lyric)/i.test(lower)
    );
}

function hasUserProvidedLyricsText(message) {
    const text = String(message || "");
    const markerMatch = text.match(/(?:가사|lyrics?)\s*[:：]\s*([\s\S]+)/i);
    const candidate = markerMatch ? markerMatch[1] : "";
    if (!candidate) return false;

    const tokens = candidate.match(/[A-Za-z가-힣0-9']+/g) || [];
    const lineCount = candidate.split(/\n+/).filter(line => line.trim()).length;
    return tokens.length >= 60 || (lineCount >= 6 && tokens.length >= 30);
}

function packMakerLyricsRequiredResponse(message) {
    const korean = /[가-힣]/.test(message || "");
    if (korean) {
        return [
            "가사에서 단어를 뽑는 요청은 가사 본문이 필요합니다.",
            "",
            "DuckDuckGo/Wikipedia 검색은 연결되어 있지만 Pack Maker가 받는 것은 제목, 스니펫, URL이지 실제 가사 전문이 아닙니다. 이 상태에서 'REDRED 가사에서 단어 50개'를 만들면 모델이 없는 가사를 상상하게 됩니다.",
            "",
            "정확하게 만들려면 둘 중 하나로 요청해 주세요.",
            "- 가사를 직접 붙여넣고: `가사: ...` 뒤에 본문을 넣은 다음 단어팩을 요청",
            "- 또는 `CORTIS REDRED 노래 분위기 기반으로 단어 50개 팩 만들어줘`처럼 가사 전문 추출이 아닌 테마팩으로 요청"
        ].join("\n");
    }

    return [
        "Pack Maker cannot extract words from lyrics unless the lyric text is provided in the prompt.",
        "",
        "Search is connected and can find lyric pages, but Pack Maker only receives titles, snippets, and URLs, not the full lyric body. Generating a lyric-derived pack from that would hallucinate the source text.",
        "",
        "Paste the lyrics after `lyrics:` or ask for a theme/interpretation-based pack instead."
    ].join("\n");
}

function packLanguageLabel(language) {
    if (language === "korean") return "KOREAN";
    if (language === "english") return "ENGLISH";
    return "DOMAIN";
}

function packLanguageInstruction(language) {
    if (language === "korean") return "모든 term은 반드시 사용자가 요구한 도메인의 한글 표기로 작성한다. 영문 약어가 꼭 필요하면 한글 설명어를 함께 붙인다.";
    if (language === "english") return "모든 term은 영어 단어 또는 영어 약어로 작성한다. 한글 term은 넣지 않는다.";
    return "term은 사용자가 요구한 도메인에서 실제로 외울 가치가 있는 짧은 명사/약어/명령어로 작성한다.";
}

function packDescriptionLanguageLabel(language) {
    if (language === "english") return "ENGLISH";
    return "KOREAN";
}

function packDescriptionInstruction(language) {
    if (language === "english") return "모든 desc는 반드시 영어 한 문장으로 작성한다.";
    return "모든 desc는 반드시 한국어 한 문장으로 작성한다. term이 영어여도 desc는 한국어로 뜻과 쓰임을 설명한다.";
}

function packDomainText(intent) {
    return `${intent.topic || ""} ${intent.title || ""}`.toLowerCase();
}

function packDomainProfile(intent) {
    const topic = packDomainText(intent);
    if (/(미국.{0,12}주|미국의\s*주|미국\s*주\s*이름|u\.?s\.?\s*states?|united\s*states\s*states?|state\s*names?)/i.test(topic)) {
        return "us_states";
    }
    if (/((우리나라|한국|대한민국).{0,18}(산|명산|mountain)|korean\s*mountains?)/i.test(topic)) {
        return "korean_mountains";
    }
    if (/(예술\s*작가|미술\s*작가|화가|조각가|아티스트|artist|artists|painters?|sculptors?)/i.test(topic)) {
        return "art_creators";
    }
    if (/(국가|국명|나라|세계\s*나라|country|countries|nation|nations|state\s*names?)/i.test(topic)) {
        return "country_names";
    }
    if (/(자동차|정비|차량|부품|카\s*파츠|car|auto|vehicle|parts)/i.test(topic)) {
        return "car_repair";
    }
    if (/(국내\s*아이돌|한국\s*아이돌|아이돌\s*그룹|보이그룹|걸그룹|케이팝\s*그룹|k[-\s]?pop\s*(?:idol\s*)?groups?|south korean idol groups?|korean boy groups?|korean girl groups?)/i.test(topic)) {
        return "kpop_idol_groups";
    }
    if (/(젠지|z세대|gen\s*z|mz|신조어|유행어|밈|slang|meme)/i.test(topic)) {
        return "genz_slang";
    }
    if (/(판교|it\s*회사|스타트업|개발팀|업무\s*용어|회사\s*용어|말귀|사투리|협업|워크플로우|workplace\s*slang|office\s*slang)/i.test(topic)) {
        return "workplace_it_slang";
    }
    if (/(육아템|육아|신생아|출산|아기|수유|기저귀|유모차|parenting|baby\s*items?|newborn)/i.test(topic)) {
        return "parenting_items";
    }
    if (/(코르티스|cortis|redred|케이팝|k[-\s]?pop).{0,30}(노래|곡|싱글|앨범|분위기|테마|theme|song|single|album)/i.test(topic)) {
        return "kpop_song_theme";
    }
    return "generic";
}

function packDomainLabel(intent) {
    const profile = packDomainProfile(intent);
    if (profile === "us_states") return "us_states";
    if (profile === "korean_mountains") return "korean_mountains";
    if (profile === "art_creators") return "art_creators";
    if (profile === "country_names") return "country_names";
    if (profile === "car_repair") return "car_repair";
    if (profile === "kpop_idol_groups") return "kpop_idol_groups";
    if (profile === "genz_slang") return "genz_slang";
    if (profile === "workplace_it_slang") return "workplace_it_slang";
    if (profile === "parenting_items") return "parenting_items";
    if (profile === "kpop_song_theme") return "kpop_song_theme";
    return "generic";
}

function packMakerFocusGroups(intent) {
    const profile = packDomainProfile(intent);
    if (profile === "us_states") {
        return [
            "미국 50개 주의 공식 영어 주 이름",
            "서부, 중서부, 남부, 북동부 지역별 주 이름",
            "한국어 사용자가 헷갈리기 쉬운 주 이름",
            "주 이름과 도시/카운티/국가명을 섞지 않는 기준",
            "약어가 아니라 전체 주 이름",
            "미국 지리 학습용 기본 주 이름"
        ];
    }
    if (profile === "korean_mountains") {
        return [
            "대한민국의 대표 명산과 국립공원 산 이름",
            "서울/수도권, 강원, 충청, 전라, 경상, 제주 지역 산 이름",
            "등산 지도와 관광 안내에서 자주 보는 산 이름",
            "한라산, 지리산처럼 널리 알려진 고유명사",
            "봉우리/능선보다 산 이름 중심",
            "한글 표기로 외울 수 있는 국내 산 이름"
        ];
    }
    if (profile === "art_creators") {
        return [
            "서양 미술사 대표 화가와 조각가",
            "한국 근현대 미술 작가",
            "현대미술, 사진, 디자인, 설치미술 작가",
            "작품명보다 창작자 이름 중심",
            "영문/한글 표기 혼동이 쉬운 작가명",
            "입문자가 먼저 접하는 예술가 이름"
        ];
    }
    if (profile === "country_names") {
        return [
            "동아시아, 동남아시아, 남아시아 국가명",
            "서유럽, 북유럽, 남유럽, 동유럽 국가명",
            "북아프리카, 서아프리카, 동아프리카, 남아프리카 국가명",
            "북아메리카, 중앙아메리카, 남아메리카, 카리브해 국가명",
            "중동, 중앙아시아, 오세아니아, 태평양 섬 국가명",
            "한국어 사용자가 헷갈리기 쉬운 공식 한글 국가명"
        ];
    }
    if (profile === "car_repair") {
        return [
            "엔진 내부 부품, 흡기/배기, 윤활, 냉각 계통",
            "브레이크, 조향, 서스펜션, 하체 연결 부품",
            "전장, 센서, 배터리, 발전기, 조명, 배선 부품",
            "변속기, 구동계, 차축, 클러치, 디퍼런셜 부품",
            "외장, 차체 패널, 유리, 와이퍼, 실내 조작 부품",
            "소모품, 필터, 호스, 벨트, 가스켓, 정비 현장 교체 부품"
        ];
    }
    if (profile === "kpop_idol_groups") {
        return [
            "1세대와 2세대 대표 국내 아이돌 그룹",
            "3세대 대표 국내 보이그룹과 걸그룹",
            "4세대와 5세대 국내 아이돌 그룹",
            "대형 기획사와 중소 기획사 대표 그룹",
            "혼성 그룹, 밴드형 아이돌, 프로젝트 그룹",
            "해체 여부와 관계없이 K-pop 맥락에서 널리 알려진 그룹명"
        ];
    }
    if (profile === "genz_slang") {
        return [
            "Z세대와 온라인 커뮤니티에서 자주 보이는 신조어",
            "SNS, 숏폼, 밈 문화에서 쓰이는 짧은 표현",
            "게임, 팬덤, 댓글 문화에서 쓰이는 줄임말",
            "요즘 대화에서 뜻을 모르면 맥락을 놓치기 쉬운 표현",
            "비속어보다 학습용으로 설명 가능한 표현",
            "비슷한 뜻이 반복되지 않도록 다양한 용례"
        ];
    }
    if (profile === "workplace_it_slang") {
        return [
            "IT 회사와 스타트업 회의에서 자주 듣는 업무 표현",
            "기획, 개발, 디자인, PM 협업에서 쓰이는 용어",
            "판교식 줄임말, 영어식 업무 표현, 회의 액션 아이템",
            "스프린트, 백로그, 배포, QA, 일정 조율 관련 표현",
            "입사 초기에 말귀를 잡는 데 필요한 현장 용어",
            "회사 밖 일상어와 의미가 달라지는 업무 표현"
        ];
    }
    if (profile === "parenting_items") {
        return [
            "신생아 수유, 기저귀, 목욕, 수면에 필요한 육아템",
            "외출, 이동, 안전, 위생 관련 육아용품",
            "초보 부모가 이름을 먼저 익히면 좋은 물건",
            "소모품과 장비형 아이템을 골고루 섞은 목록",
            "출산 준비물 체크리스트에 자주 나오는 물품",
            "실사용 맥락을 설명하기 좋은 짧은 제품명"
        ];
    }
    if (profile === "kpop_song_theme") {
        return [
            "곡 제목, 아티스트, 장르, 무대 분위기",
            "퍼포먼스, 리듬, 후렴, 비트, 사운드 질감",
            "뮤직비디오, 콘셉트, 색감, 이미지",
            "팬덤이 말하는 감정 키워드와 해석 용어",
            "댄스, 보컬, 랩, 프로덕션 관련 짧은 음악 용어",
            "가사 원문 없이도 설명 가능한 비가사 테마 키워드"
        ];
    }
    return [
        "입문자가 먼저 외워야 하는 핵심 기본 용어",
        "하위 구성요소, 세부 속성, 관련 명령/약어",
        "현장에서 자주 보는 상태, 오류, 점검, 검증 용어",
        "실무 작업에 쓰이는 도구, 절차, 액션 용어",
        "고급 주제, 제품명, 주변 시스템, 연관 개념",
        "실전에서 헷갈리기 쉬운 비슷하지만 다른 용어"
    ];
}

function packMakerDomainHint(intent) {
    return [
        `domain profile: ${packDomainLabel(intent)}`,
        `domain focus groups:\n- ${packMakerFocusGroups(intent).join("\n- ")}`,
        "profile이 맞지 않는 다른 도메인의 예전 draft나 예전 대화 용어는 절대 섞지 않는다."
    ].join("\n");
}

function packMakerLineExample(intent) {
    const profile = packDomainProfile(intent);
    if (intent.termLanguage === "english") {
        if (profile === "us_states") return "예: California | 미국 서부에 있는 주 이름입니다.";
        if (profile === "korean_mountains") return "예: Hallasan | 제주도에 있는 대표적인 산 이름입니다.";
        if (profile === "art_creators") return "예: Vincent van Gogh | 후기 인상주의를 대표하는 예술가 이름입니다.";
        if (profile === "country_names") return "예: South Korea | 동아시아에 있는 국가명입니다.";
        if (profile === "car_repair") return "예: brake pad | 제동 시 디스크와 마찰해 차량을 멈추는 소모품입니다.";
        if (profile === "kpop_idol_groups") return "예: BTS | 대한민국의 대표적인 K-pop 보이그룹명입니다.";
        if (profile === "genz_slang") return "예: rizz | 매력이나 플러팅 능력을 뜻하는 Gen Z slang입니다.";
        if (profile === "workplace_it_slang") return "예: backlog | 아직 처리하지 않은 작업 목록을 뜻하는 업무 용어입니다.";
        if (profile === "parenting_items") return "예: stroller | 아기를 태우고 이동할 때 쓰는 유모차입니다.";
        if (profile === "kpop_song_theme") return "예: chorus | 곡에서 반복되어 인상을 남기는 후렴 구간입니다.";
        return "예: cache | 자주 쓰는 데이터를 임시로 저장해 접근 속도를 높이는 개념입니다.";
    }
    if (profile === "us_states") return "예: 캘리포니아 | 미국 서부에 있는 주 이름입니다.";
    if (profile === "korean_mountains") return "예: 한라산 | 제주도에 있는 대표적인 산 이름입니다.";
    if (profile === "art_creators") return "예: 백남준 | 비디오 아트로 널리 알려진 예술가 이름입니다.";
    if (profile === "country_names") return "예: 대한민국 | 동아시아에 있는 국가명입니다.";
    if (profile === "car_repair") return "예: 브레이크 패드 | 제동 시 디스크와 마찰해 차량을 멈추는 소모품입니다.";
    if (profile === "kpop_idol_groups") return "예: 소녀시대 | 대한민국의 대표적인 K-pop 걸그룹명입니다.";
    if (profile === "genz_slang") return "예: 꾸안꾸 | 꾸민 듯 안 꾸민 듯한 스타일을 뜻하는 신조어입니다.";
    if (profile === "workplace_it_slang") return "예: 얼라인 | 팀 사이의 방향과 이해를 맞추는 업무 표현입니다.";
    if (profile === "parenting_items") return "예: 젖병소독기 | 젖병과 수유 도구를 위생적으로 관리하는 육아템입니다.";
    if (profile === "kpop_song_theme") return "예: 후렴 | 곡에서 반복되어 인상을 남기는 핵심 구간입니다.";
    return "예: 핵심 용어 | 사용자가 요청한 도메인에서 자주 등장하는 한줄 설명입니다.";
}

function packMakerExpansionInstruction(intent) {
    const profile = packDomainProfile(intent);
    if (profile === "us_states") return "금지 목록이 많을수록 미국 지역을 넓혀 아직 쓰지 않은 주 이름을 추가한다. 도시명, 카운티명, 국가명은 제외한다.";
    if (profile === "korean_mountains") return "금지 목록이 많을수록 지역을 넓혀 아직 쓰지 않은 국내 산 이름을 추가한다. 둘레길, 절, 도시명은 제외한다.";
    if (profile === "art_creators") return "금지 목록이 많을수록 시대, 국가, 매체를 넓혀 아직 쓰지 않은 예술가 이름을 추가한다. 작품명과 미술 사조명은 제외한다.";
    if (profile === "country_names") return "금지 목록이 많을수록 대륙과 지역을 넓혀 아직 쓰지 않은 공식 국가명을 추가한다.";
    if (profile === "car_repair") return "금지 목록이 많을수록 더 구체적인 하위 부품명, 센서명, 소모품명, 외장/전장/하체 부품명으로 확장한다.";
    if (profile === "kpop_idol_groups") return "금지 목록이 많을수록 세대, 성별, 기획사, 활동 시기를 넓혀 아직 쓰지 않은 국내 아이돌 그룹명을 추가한다. 멤버 개인명, 솔로 가수명, 곡명, 팬덤명은 제외한다.";
    if (profile === "genz_slang") return "금지 목록이 많을수록 SNS, 밈, 게임, 팬덤, 댓글 문화로 범위를 넓혀 아직 쓰지 않은 신조어를 추가한다.";
    if (profile === "workplace_it_slang") return "금지 목록이 많을수록 회의, 개발, PM, 디자인, 배포, 일정, 협업 범주로 넓혀 아직 쓰지 않은 업무 표현을 추가한다.";
    if (profile === "parenting_items") return "금지 목록이 많을수록 수유, 수면, 외출, 안전, 위생, 놀이, 소모품 범주로 넓혀 아직 쓰지 않은 육아템을 추가한다.";
    if (profile === "kpop_song_theme") return "금지 목록이 많을수록 가사 원문을 추측하지 말고 곡의 공개 정보, 장르, 무대, 사운드, 감정, 퍼포먼스 관련 키워드로 확장한다.";
    return "금지 목록이 많을수록 같은 도메인 안에서 더 구체적인 하위 개념, 약어, 도구, 절차, 제품명으로 확장한다.";
}

function packMakerTermShapeInstruction(intent) {
    const profile = packDomainProfile(intent);
    if (profile === "us_states") return intent.termLanguage === "english" ? "term은 미국 주의 공식 영어 전체 이름만 쓴다. 주 약어, 도시명, 카운티명은 제외한다." : "term은 미국 주의 널리 쓰이는 한글 표기만 쓴다. 도시명, 카운티명은 제외한다.";
    if (profile === "korean_mountains") return intent.termLanguage === "english" ? "term은 국내 산 이름의 영문 표기만 쓴다." : "term은 대한민국 산 이름의 한글 표기만 쓴다.";
    if (profile === "art_creators") return intent.termLanguage === "english" ? "term은 예술가의 널리 쓰이는 영문 이름만 쓴다. 작품명은 제외한다." : "term은 예술가의 널리 쓰이는 한글 이름만 쓴다. 작품명은 제외한다.";
    if (profile === "country_names") return intent.termLanguage === "english" ? "term은 공식 영어 국가명 또는 널리 쓰이는 영어 국가명만 쓴다." : "term은 공식 국가명 또는 널리 쓰이는 한글 국가명만 쓴다.";
    if (profile === "car_repair") return "term은 짧은 명사/부품명/현장 용어만 쓴다.";
    if (profile === "kpop_idol_groups") return "term은 국내 아이돌 그룹명만 쓴다. 멤버 개인명, 솔로 가수명, 곡명, 앨범명, 팬덤명은 제외한다. BTS, NCT, IVE처럼 공식 표기가 영문/약어인 그룹명은 그대로 허용한다.";
    if (profile === "genz_slang") return "term은 짧은 신조어, 줄임말, 밈 표현만 쓴다. 긴 문장이나 설명문은 제외한다.";
    if (profile === "workplace_it_slang") return "term은 IT 회사 업무 대화에서 쓰는 짧은 용어/줄임말/표현만 쓴다. 긴 문장은 제외한다.";
    if (profile === "parenting_items") return "term은 짧은 육아용품명이나 육아템 이름만 쓴다. 긴 설명형 문장은 제외한다.";
    if (profile === "kpop_song_theme") return "term은 가사 원문 문구가 아니라 곡/무대/음악 해석에 쓰는 짧은 명사형 키워드만 쓴다.";
    return "term은 짧은 명사형 도메인 용어만 쓴다.";
}

function packMakerSearchQuery(intent, message) {
    const profile = packDomainProfile(intent);
    if (profile === "us_states") return "미국 주 이름 공식 목록 US state names list";
    if (profile === "korean_mountains") return "대한민국 산 이름 목록 한국 명산";
    if (profile === "art_creators") return "예술 작가 이름 목록 화가 조각가 artists list";
    if (profile === "country_names") return "국가 이름 한글 공식 목록 country names official list";
    if (profile === "car_repair") return "자동차 정비 부품 용어 auto repair parts glossary";
    if (profile === "kpop_idol_groups") return "대한민국 아이돌 그룹 목록 K-pop idol groups list";
    if (profile === "genz_slang") return "Z세대 신조어 유행어 밈 용어 Gen Z slang list";
    if (profile === "workplace_it_slang") return "판교 사투리 IT 회사 업무 용어 스타트업 용어";
    if (profile === "parenting_items") return "육아템 리스트 신생아 육아용품 출산 준비물";
    if (profile === "kpop_song_theme") return `${intent.topic || message} CORTIS REDRED song theme review K-pop`;
    return `${intent.topic || message} glossary key terms official docs`;
}

function uniquePackQueries(queries, limit = 4) {
    const seen = new Set();
    const clean = [];
    for (const query of queries) {
        const value = sanitizeChatText(query, 160);
        if (!value) continue;
        const key = value.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        clean.push(value);
        if (clean.length >= limit) break;
    }
    return clean;
}

function packMakerSourceQueries(intent, message) {
    const profile = packDomainProfile(intent);
    const topic = sanitizeChatText(packTopicSignal(intent) || intent.topic || message || "용어", 120);
    const wantsEnglishTerms = intent.termLanguage === "english";

    if (profile === "country_names") {
        return uniquePackQueries(wantsEnglishTerms
            ? [
                "list of sovereign states country names",
                "ISO 3166-1 country names official list",
                "countries of the world list"
            ]
            : [
                "세계 나라 목록 한글 국가명",
                "유엔 회원국 목록 한글 국가명",
                "ISO 3166-1 국가 코드 나라 이름",
                "세계의 나라와 수도 목록"
            ]);
    }

    if (profile === "us_states") {
        return uniquePackQueries(wantsEnglishTerms
            ? [
                "official list of U.S. states",
                "United States state names list",
                "50 states names official list"
            ]
            : [
                "미국 50개 주 이름 목록",
                "미국 주 한글 이름",
                "미국의 주 목록",
                "미국 주 이름 공식 목록"
            ]);
    }

    if (profile === "korean_mountains") {
        return uniquePackQueries(wantsEnglishTerms
            ? [
                "mountains of South Korea list",
                "Korean mountains names list",
                "national parks mountains South Korea"
            ]
            : [
                "대한민국 산 목록",
                "한국 명산 목록",
                "국립공원 산 이름",
                "우리나라 산 이름"
            ]);
    }

    if (profile === "art_creators") {
        return uniquePackQueries(wantsEnglishTerms
            ? [
                "famous artists list painters sculptors",
                "art history artists names list",
                "modern artists names list"
            ]
            : [
                "예술가 이름 목록",
                "유명 화가 조각가 목록",
                "한국 미술 작가 목록",
                "세계 미술사 작가 이름"
            ]);
    }

    if (profile === "car_repair") {
        return uniquePackQueries(wantsEnglishTerms
            ? [
                "auto repair parts glossary",
                "automotive parts terminology",
                "car engine brake suspension parts"
            ]
            : [
                "자동차 부품 용어",
                "자동차 정비 부품 명칭",
                "자동차 엔진 브레이크 서스펜션 부품",
                "차량 정비 용어"
            ]);
    }

    if (profile === "kpop_idol_groups") {
        return uniquePackQueries(wantsEnglishTerms
            ? [
                "K-pop idol groups list",
                "South Korean idol groups list",
                "Korean boy groups girl groups list"
            ]
            : [
                "대한민국 아이돌 그룹 목록",
                "한국 아이돌 그룹 목록",
                "K-pop 아이돌 그룹 목록",
                "국내 보이그룹 걸그룹 목록"
            ]);
    }

    if (profile === "genz_slang") {
        return uniquePackQueries(wantsEnglishTerms
            ? [
                "Gen Z slang list",
                "popular internet slang terms",
                "social media slang glossary"
            ]
            : [
                "Z세대 신조어 목록",
                "요즘 신조어 유행어 모음",
                "SNS 밈 용어 목록",
                "온라인 커뮤니티 신조어"
            ]);
    }

    if (profile === "workplace_it_slang") {
        return uniquePackQueries(wantsEnglishTerms
            ? [
                "startup workplace terminology glossary",
                "software team agile terms glossary",
                "IT company business slang terms"
            ]
            : [
                "판교 사투리 IT 회사 용어",
                "스타트업 업무 용어 모음",
                "개발팀 협업 용어",
                "회사 업무 영어식 표현"
            ]);
    }

    if (profile === "parenting_items") {
        return uniquePackQueries(wantsEnglishTerms
            ? [
                "newborn baby items checklist",
                "parenting essentials list",
                "baby gear glossary"
            ]
            : [
                "육아템 리스트",
                "신생아 육아용품 체크리스트",
                "출산 준비물 목록",
                "아기 외출 수유 목욕 용품"
            ]);
    }

    if (profile === "kpop_song_theme") {
        return uniquePackQueries([
            `${topic} 곡 정보`,
            `${topic} 노래 리뷰`,
            `${topic} K-pop song theme`,
            `${topic} artist profile`
        ]);
    }

    return uniquePackQueries([
        topic,
        `${topic} 용어 목록`,
        `${topic} glossary key terms`,
        `${topic} terminology official documentation`
    ]);
}

function packIntentMessage(intent) {
    return [
        `목표 item 개수: 정확히 ${intent.requestedCount}개`,
        `term 언어: ${packLanguageLabel(intent.termLanguage)}`,
        `desc 언어: ${packDescriptionLanguageLabel(intent.descriptionLanguage)}`,
        `팩 제목 후보: ${intent.title || "-"}`,
        `주제/상황: ${intent.topic || "-"}`,
        `도메인 프로필: ${packDomainLabel(intent)}`,
        packLanguageInstruction(intent.termLanguage),
        packDescriptionInstruction(intent.descriptionLanguage),
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

function packProfileAllowsStylizedEnglishTerms(intent) {
    return packDomainProfile(intent) === "kpop_idol_groups";
}

function normalizeKpopGroupKey(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[\s.'’!()+/_-]+/g, "");
}

function isKnownKpopGroupTerm(term) {
    const key = normalizeKpopGroupKey(term);
    return KPOP_IDOL_GROUP_TERMS.some(group => normalizeKpopGroupKey(group) === key);
}

function isAllowedKpopGroupTerm(term) {
    const value = String(term || "").trim();
    if (!value) return false;
    if (KPOP_NON_GROUP_TERM_RE.test(value)) return false;
    if (/[\u3400-\u9fff\u3040-\u30ff]/.test(value)) return false;
    if (!(/[가-힣]/.test(value) || /^[A-Za-z0-9 .&'’+!()/_-]+$/.test(value))) return false;
    return isKnownKpopGroupTerm(value);
}

function isPackTermAllowedForIntent(term, intent) {
    if (packDomainProfile(intent) === "kpop_idol_groups") return isAllowedKpopGroupTerm(term);
    if (intent.termLanguage === "auto") return Boolean(term);
    if (intent.termLanguage === "korean" && packProfileAllowsStylizedEnglishTerms(intent)) {
        return isAllowedKpopGroupTerm(term);
    }
    if (intent.termLanguage === "korean") return /[가-힣]/.test(term);
    if (intent.termLanguage === "english") return !/[가-힣]/.test(term);
    return Boolean(term);
}

function draftLanguageMismatchCount(draft, intent) {
    if (intent.termLanguage === "auto") return 0;
    if (intent.termLanguage === "korean" && packProfileAllowsStylizedEnglishTerms(intent)) return 0;
    return draft.items.filter(item => isLikelyLanguageMismatch(item.term, intent.termLanguage)).length;
}

function fallbackDescriptionForIntent(intent, title) {
    const count = clampPackTargetCount(intent.requestedCount);
    const termLabel = intent.termLanguage === "korean"
        ? "한글 제시어"
        : (intent.termLanguage === "english" ? "영어 제시어" : "도메인 제시어");
    if (intent.descriptionLanguage === "english") return `${title} - ${count} ${packLanguageLabel(intent.termLanguage).toLowerCase()} terms with English notes`;
    return `${title} - ${count}개 ${termLabel} · 한글 설명`;
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

function descriptionMatchesLanguage(description, language) {
    const value = String(description || "");
    if (language === "english") return !/[가-힣]/.test(value) && /[A-Za-z]{2,}/.test(value);
    return /[가-힣]/.test(value);
}

function normalizeItemDescriptionForIntent(description, term, intent) {
    const clean = sanitizePackText(description, MAX_PACK_ITEM_DESC_LEN);
    if (clean && descriptionMatchesLanguage(clean, intent.descriptionLanguage || "korean")) return clean;
    return fallbackItemDescription(term, intent);
}

function fillKpopGroupDraftItems(items, intent, fallbackSources = []) {
    if (packDomainProfile(intent) !== "kpop_idol_groups") return items;
    const target = clampPackTargetCount(intent.requestedCount);
    const seen = new Set(items.map(item => normalizeKpopGroupKey(item.term)));
    const filled = [...items];
    const fallback = fallbackSources.map(sanitizePackSource).filter(Boolean).slice(0, MAX_PACK_SOURCES);

    for (const term of KPOP_IDOL_GROUP_TERMS) {
        if (filled.length >= target) break;
        const key = normalizeKpopGroupKey(term);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        filled.push({
            term,
            desc: fallbackItemDescription(term, intent),
            sources: fallback
        });
    }

    return filled;
}

function normalizeDraftForIntent(value, intent, fallbackSources = []) {
    const draft = normalizeDraftFromLlm(value, fallbackSources);
    const title = intent.title || draft.title;
    const safeTitle = sanitizePackText(title, MAX_PACK_TITLE_LEN) || "Generated Data Pack";
    const filteredItems = fillKpopGroupDraftItems(
        draft.items.filter(item => isPackTermAllowedForIntent(item.term, intent)),
        intent,
        fallbackSources
    );
    return {
        title: safeTitle,
        description: cleanDescriptionForIntent(draft.description, intent, safeTitle),
        items: filteredItems.slice(0, intent.requestedCount).map(item => ({
            ...item,
            desc: normalizeItemDescriptionForIntent(item.desc, item.term, intent)
        }))
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
    const groups = packMakerFocusGroups(intent);
    return groups[(Math.max(1, Number(batchNumber) || 1) - 1) % groups.length];
}

function packMakerWideFocusList(intent) {
    return packMakerFocusGroups(intent);
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
                packMakerLineExample(payload.intent),
                "raw HTML은 절대 쓰지 않는다."
            ].join("\n")
        },
        { role: "system", content: `이번 batch 계약:\n${packIntentMessage(batchIntent)}` },
        { role: "system", content: `전체 목표 제목: ${payload.intent.title || "Generated Data Pack"}` },
        { role: "system", content: `전체 주제/상황: ${payload.intent.topic || payload.message}` },
        { role: "system", content: `도메인 힌트:\n${packMakerDomainHint(payload.intent)}` },
        { role: "system", content: `이번 batch의 범주 초점: ${focus}` },
        {
            role: "system",
            content: [
                `이미 사용한 term 목록(절대 재사용 금지): ${excludedTerms.length ? excludedTerms.join(", ") : "없음"}`,
                "위 금지 목록과 같은 term, 조사/띄어쓰기만 다른 term, 같은 대상을 표현만 바꾼 term은 모두 실패로 간주한다.",
                packMakerExpansionInstruction(payload.intent)
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
                packDescriptionInstruction(payload.intent.descriptionLanguage),
                packMakerTermShapeInstruction(payload.intent),
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
        { role: "system", content: `도메인 힌트:\n${packMakerDomainHint(payload.intent)}` },
        { role: "system", content: `이번 보강의 범주 초점: ${focus}` },
        {
            role: "system",
            content: [
                "아래 term은 이미 draft에 있으므로 절대 다시 쓰지 않는다.",
                excludedTerms.length ? excludedTerms.join(", ") : "없음",
                "반복 term이 하나라도 있으면 그 줄은 서버에서 버려진다.",
                packMakerExpansionInstruction(payload.intent)
            ].join("\n")
        },
        { role: "system", content: `검색 결과:\n${payload.sourceBundle}` },
        {
            role: "user",
            content: [
                `repair ${repairNumber}: 금지 목록에 없는 새 item을 정확히 ${count}개 생성해라.`,
                `이번 repair는 특히 다음 범주에서 뽑아라: ${focus}`,
                packLanguageInstruction(payload.intent.termLanguage),
                packDescriptionInstruction(payload.intent.descriptionLanguage),
                packMakerTermShapeInstruction(payload.intent),
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
                packDescriptionInstruction(payload.intent.descriptionLanguage),
                "raw HTML은 절대 쓰지 않는다."
            ].join("\n")
        },
        { role: "system", content: `넓은 후보 생성 계약:\n${packIntentMessage(fillIntent)}` },
        { role: "system", content: `전체 목표 제목: ${payload.intent.title || "Generated Data Pack"}` },
        { role: "system", content: `전체 주제/상황: ${payload.intent.topic || payload.message}` },
        { role: "system", content: `도메인 힌트:\n${packMakerDomainHint(payload.intent)}` },
        { role: "system", content: `후보 범주 풀:\n- ${focusList.join("\n- ")}` },
        {
            role: "system",
            content: [
                `이미 사용한 term ${excludedTerms.length}개(절대 재사용 금지):`,
                excludedTerms.length ? excludedTerms.join(", ") : "없음",
                "금지 목록과 같은 term, 띄어쓰기만 다른 term, 표현만 바꾼 term은 서버에서 버려진다.",
                packMakerExpansionInstruction(payload.intent)
            ].join("\n")
        },
        {
            role: "user",
            content: [
                `wide fill ${attempt}: 금지 목록에 없는 후보를 정확히 ${count}줄 생성해라.`,
                "위 후보 범주 풀을 골고루 섞어라. 한 범주에 몰리지 마라.",
                packLanguageInstruction(payload.intent.termLanguage),
                packDescriptionInstruction(payload.intent.descriptionLanguage),
                packMakerTermShapeInstruction(payload.intent),
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
                packMakerExpansionInstruction(payload.intent),
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
    if (intent.descriptionLanguage === "english") {
        const profile = packDomainProfile(intent);
        if (profile === "us_states") return `${term} is a U.S. state name for this typing pack.`;
        if (profile === "korean_mountains") return `${term} is a South Korean mountain name for this typing pack.`;
        if (profile === "art_creators") return `${term} is an artist or creator name for this typing pack.`;
        if (profile === "country_names") return `${term} is a country or region name for this typing pack.`;
        if (profile === "car_repair") return `${term} is a car repair part or maintenance term.`;
        if (profile === "kpop_idol_groups") return `${term} is a South Korean idol group name for this typing pack.`;
        if (profile === "genz_slang") return `${term} is a Gen Z or internet slang term for this typing pack.`;
        if (profile === "workplace_it_slang") return `${term} is a workplace or IT-company expression for this typing pack.`;
        if (profile === "parenting_items") return `${term} is a parenting item or baby-care product for this typing pack.`;
        if (profile === "kpop_song_theme") return `${term} is a short theme keyword related to the requested K-pop song.`;
        return `${term} is a key term in the requested domain.`;
    }

    const profile = packDomainProfile(intent);
    if (profile === "us_states") {
        return `${term}는 미국 주 이름 학습팩에서 외울 수 있는 지명입니다.`;
    }
    if (profile === "korean_mountains") {
        return `${term}는 우리나라 산 이름 학습팩에서 외울 수 있는 고유명사입니다.`;
    }
    if (profile === "art_creators") {
        return `${term}는 예술 작가 이름 학습팩에서 외울 수 있는 창작자명입니다.`;
    }
    if (profile === "country_names") {
        return `${term}는 국가명 학습팩에서 외울 수 있는 나라 이름입니다.`;
    }
    if (profile === "car_repair") {
        return `${term} 관련 점검이나 교체에서 자주 등장하는 자동차 정비 부품입니다.`;
    }
    if (profile === "kpop_idol_groups") {
        return `${term}는 국내 아이돌 그룹 팩에서 외울 수 있는 K-pop 그룹명입니다.`;
    }
    if (profile === "genz_slang") {
        return `${term}는 Z세대와 온라인 문화에서 자주 쓰이는 신조어입니다.`;
    }
    if (profile === "workplace_it_slang") {
        return `${term}는 IT 회사와 스타트업 업무 대화에서 자주 쓰이는 표현입니다.`;
    }
    if (profile === "parenting_items") {
        return `${term}는 육아 상황에서 자주 쓰이는 아이템이나 용품 이름입니다.`;
    }
    if (profile === "kpop_song_theme") {
        return `${term}는 요청한 K-pop 곡의 분위기나 해석을 설명할 때 쓰는 키워드입니다.`;
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
        const desc = sanitizePackText(parts.join(" ").trim(), MAX_PACK_ITEM_DESC_LEN) || fallbackItemDescription(term, intent);
        if (!term || !desc) continue;
        if (!isPackTermAllowedForIntent(term, intent)) continue;

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
        if (!isPackTermAllowedForIntent(term, payload.intent)) continue;
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
        if (!isPackTermAllowedForIntent(term, payload.intent)) continue;
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

function sqlIdentifier(name) {
    if (!/^[A-Za-z0-9_]+$/.test(String(name || ""))) {
        throw new Error(`Invalid SQL identifier: ${name}`);
    }
    return `\`${name}\``;
}

async function tableColumnExists(tableName, columnName) {
    const [rows] = await db.query(`
        SELECT COUNT(*) AS count
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND COLUMN_NAME = ?
    `, [tableName, columnName]);
    return Number(rows?.[0]?.count || 0) > 0;
}

const REQUIRED_SCHEMA_COLUMNS = {
    users: ["id", "nickname", "password", "created_at"],
    leaderboard: ["id", "user_id", "score", "wpm", "accuracy", "difficulty", "pack", "created_at"],
    custom_packs: ["id", "owner_id", "title", "description", "status", "review_reason", "pack_kind", "text_content", "preprocess", "tags_json", "created_at", "updated_at"],
    custom_pack_items: ["id", "pack_id", "term", "description", "sources_json", "sort_order", "created_at"],
    custom_pack_scores: ["id", "pack_id", "user_id", "score", "wpm", "accuracy", "difficulty", "created_at"]
};

function recoverableSchemaError(err) {
    return /foreign key|constraint|incompatible|referencing column/i.test(String(err?.message || ""));
}

async function requiredDatabaseSchemaPresent() {
    const expected = [];
    Object.entries(REQUIRED_SCHEMA_COLUMNS).forEach(([tableName, columns]) => {
        columns.forEach(columnName => expected.push({ tableName, columnName }));
    });

    const tableNames = Object.keys(REQUIRED_SCHEMA_COLUMNS);
    const [rows] = await db.query(`
        SELECT TABLE_NAME, COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME IN (${tableNames.map(() => "?").join(",")})
    `, tableNames);

    const present = new Set(rows.map(row => `${row.TABLE_NAME}.${row.COLUMN_NAME}`));
    const missing = expected
        .filter(item => !present.has(`${item.tableName}.${item.columnName}`))
        .map(item => `${item.tableName}.${item.columnName}`);

    return { ok: missing.length === 0, missing };
}

async function ensureTableColumn(tableName, columnName, columnDefinition) {
    if (await tableColumnExists(tableName, columnName)) return;
    await db.query(`ALTER TABLE ${sqlIdentifier(tableName)} ADD COLUMN ${columnDefinition}`);
}

async function ensureDatabaseSchema() {
    if (!databaseSchemaReady) {
        databaseSchemaReady = (async () => {
            await db.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    nickname VARCHAR(16) NOT NULL UNIQUE,
                    password VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);
            await ensureTableColumn("users", "created_at", "`created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP");

            await db.query(`
                CREATE TABLE IF NOT EXISTS leaderboard (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    user_id BIGINT NOT NULL,
                    score INT NOT NULL,
                    wpm INT NOT NULL DEFAULT 0,
                    accuracy INT NOT NULL DEFAULT 0,
                    difficulty VARCHAR(16) NOT NULL,
                    pack VARCHAR(32) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_leaderboard_scope (difficulty, pack, score),
                    INDEX idx_leaderboard_user (user_id, created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);

            await ensureTableColumn("leaderboard", "wpm", "`wpm` INT NOT NULL DEFAULT 0");
            await ensureTableColumn("leaderboard", "accuracy", "`accuracy` INT NOT NULL DEFAULT 0");
            await ensureTableColumn("leaderboard", "pack", "`pack` VARCHAR(32) NOT NULL DEFAULT 'python'");
            await ensureCustomPackSchema();
        })().catch(err => {
            databaseSchemaReady = null;
            if (recoverableSchemaError(err)) {
                return requiredDatabaseSchemaPresent().then(result => {
                    if (result.ok) {
                        console.warn(`CodeDrop DB schema check recovered after constraint warning: ${err.message}`);
                        return undefined;
                    }
                    err.message = `${err.message}; required schema missing: ${result.missing.join(", ")}`;
                    throw err;
                });
            }
            throw err;
        });
    }

    return databaseSchemaReady;
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
                    pack_kind VARCHAR(16) NOT NULL DEFAULT 'word',
                    text_content MEDIUMTEXT NULL,
                    preprocess VARCHAR(32) DEFAULT '',
                    tags_json TEXT NULL,
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

async function ensureCustomPackSchema() {
    if (!customPackSchemaReady) {
        customPackSchemaReady = (async () => {
            await ensureCustomPackTables();
            await ensureTableColumn("custom_packs", "description", "`description` VARCHAR(240) DEFAULT ''");
            await ensureTableColumn("custom_packs", "status", "`status` VARCHAR(16) NOT NULL DEFAULT 'draft'");
            await ensureTableColumn("custom_packs", "review_reason", "`review_reason` VARCHAR(240) DEFAULT ''");
            await ensureTableColumn("custom_packs", "pack_kind", "`pack_kind` VARCHAR(16) NOT NULL DEFAULT 'word'");
            await ensureTableColumn("custom_packs", "text_content", "`text_content` MEDIUMTEXT NULL");
            await ensureTableColumn("custom_packs", "preprocess", "`preprocess` VARCHAR(32) DEFAULT ''");
            await ensureTableColumn("custom_packs", "tags_json", "`tags_json` TEXT NULL");
            await ensureTableColumn("custom_packs", "created_at", "`created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
            await ensureTableColumn("custom_packs", "updated_at", "`updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
            await ensureTableColumn("custom_pack_items", "sources_json", "`sources_json` TEXT NULL");
            await ensureTableColumn("custom_pack_items", "sort_order", "`sort_order` INT NOT NULL DEFAULT 0");
            await ensureTableColumn("custom_pack_items", "created_at", "`created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
            await ensureTableColumn("custom_pack_scores", "wpm", "`wpm` INT NOT NULL DEFAULT 0");
            await ensureTableColumn("custom_pack_scores", "accuracy", "`accuracy` INT NOT NULL DEFAULT 0");
            await ensureTableColumn("custom_pack_scores", "difficulty", "`difficulty` VARCHAR(16) NOT NULL DEFAULT 'normal'");
            await ensureTableColumn("custom_pack_scores", "created_at", "`created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        })().catch(err => {
            customPackSchemaReady = null;
            throw err;
        });
    }

    return customPackSchemaReady;
}

function packRowVisibleToUser(row, user) {
    return row && (row.status === "approved" || row.owner_id === user.id || isPackAdmin(user));
}

function serializePackRow(row, items = undefined) {
    const packKind = sanitizePackKind(row.pack_kind || row.kind || row.packKind);
    let tags = [];
    try {
        tags = JSON.parse(row.tags_json || "[]");
    } catch (err) {
        tags = [];
    }
    const pack = {
        id: row.id,
        title: row.title,
        description: row.description || "",
        status: row.status,
        kind: packKind,
        packKind,
        text: packKind === "long" ? (row.text_content || "") : "",
        preprocess: row.preprocess || "",
        tags: Array.isArray(tags) ? tags : [],
        ownerId: row.owner_id,
        ownerNickname: row.owner_nickname || "",
        reviewReason: row.review_reason || "",
        updatedAt: row.updated_at,
        itemCount: packKind === "long"
            ? (row.text_content ? 1 : 0)
            : Number(row.item_count || 0)
    };
    if (items) pack.items = packKind === "long" ? [] : items;
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
            CASE
                WHEN p.pack_kind = 'long' THEN IF(CHAR_LENGTH(COALESCE(p.text_content, '')) > 0, 1, 0)
                ELSE (SELECT COUNT(*) FROM custom_pack_items i WHERE i.pack_id = p.id)
            END AS item_count
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

async function fetchJsonWithTimeout(url, timeoutMs = 6500, headers = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": "CodeDrop Pack Maker/1.0 (https://www.kugnus.com)",
                "Accept": "application/json",
                ...headers
            },
            signal: controller.signal
        });
        if (!res.ok) throw new Error(`request failed (${res.status})`);
        return await res.json();
    } finally {
        clearTimeout(timeout);
    }
}

function packMakerSourceLanguage(intent) {
    return intent?.termLanguage === "english" ? "en" : "ko";
}

function packMakerWikipediaQuery(intent, message) {
    const profile = packDomainProfile(intent);
    if (profile === "us_states") return "미국의 주";
    if (profile === "korean_mountains") return "대한민국의 산 목록";
    if (profile === "art_creators") return "예술가 목록";
    if (profile === "country_names") return "국가 목록";
    if (profile === "car_repair") return "자동차 부품";
    if (profile === "kpop_idol_groups") return "대한민국의 아이돌 그룹 목록";
    if (profile === "genz_slang") return "신조어";
    if (profile === "workplace_it_slang") return "비즈니스 용어";
    if (profile === "parenting_items") return "육아";
    if (profile === "kpop_song_theme") return sanitizeChatText(`${intent?.topic || message || "K-pop"} 노래`, 80);
    return sanitizeChatText(intent?.topic || message || "용어", 80);
}

function sourceKey(source) {
    try {
        const url = new URL(source.url);
        url.hash = "";
        return url.toString().replace(/\/+$/, "").toLowerCase();
    } catch (err) {
        return String(source.url || "").toLowerCase();
    }
}

function mergePackMakerSources(...sourceLists) {
    const merged = [];
    const seen = new Set();
    for (const list of sourceLists) {
        for (const item of list || []) {
            const source = sanitizePackSource(item);
            if (!source) continue;
            const key = sourceKey(source);
            if (seen.has(key)) continue;
            seen.add(key);
            merged.push(source);
            if (merged.length >= 14) return merged;
        }
    }
    return merged;
}

function isPackMakerSourceRelevant(intent, source) {
    const profile = packDomainProfile(intent);
    const text = `${source?.title || ""} ${source?.snippet || ""}`.toLowerCase();
    if (!text.trim()) return false;

    if (profile === "country_names") {
        if (/(국가대표|축구|대통령|총리|천황|왕실|국가\s*\(國歌\)|찬가|anthem|football team|president|prime minister|emperor)/i.test(text)) {
            return false;
        }
        const title = String(source?.title || "");
        const titleLooksLikeList = /(나라\s*목록|국가명|국가\s*코드|국가\s*목록|유엔\s*회원국\s*목록|회원국\s*목록|세계.{0,16}(나라|국가).{0,16}목록|country names|countries of the world|list of countries|sovereign states|iso 3166|un member states)/i.test(title);
        return titleLooksLikeList || /(country names|countries of the world|list of countries|sovereign states|iso 3166|un member states)/i.test(text);
    }

    if (profile === "us_states") {
        if (/(country names|sovereign state|nation|국가명|유엔|회원국|자동차|정비|부품|아이돌|k[-\s]?pop|lyrics?)/i.test(text)) {
            return false;
        }
        return /(미국.{0,16}주|미국의 주|50개 주|주 이름|u\.?s\.?\s*states?|united states state|state names|50 states)/i.test(text);
    }

    if (profile === "korean_mountains") {
        if (/(country names|sovereign state|국가명|미국.{0,12}주|자동차|정비|부품|아이돌|lyrics?)/i.test(text)) {
            return false;
        }
        return /(산 목록|명산|국립공원|등산|mountains? of south korea|korean mountains?|한라산|지리산|설악산)/i.test(text);
    }

    if (profile === "art_creators") {
        if (/(country names|국가명|미국.{0,12}주|자동차|정비|부품|아이돌|lyrics?)/i.test(text)) {
            return false;
        }
        return /(예술가|미술가|화가|조각가|작가|artists?|painters?|sculptors?|art history|contemporary art)/i.test(text);
    }

    if (profile === "car_repair") {
        if (/(country|countries|국가명|유엔|회원국|wikipedia:\s*국가|sovereign state)/i.test(text)) {
            return false;
        }
        return /(자동차|차량|정비|부품|엔진|브레이크|서스펜션|센서|automotive|vehicle|car|repair|parts|engine|brake|suspension)/i.test(text);
    }

    if (profile === "kpop_idol_groups") {
        if (/(자동차|차량|정비|부품|국가명|유엔|회원국|lyrics?|가사|song lyrics|album review)/i.test(text)) {
            return false;
        }
        return /(아이돌|케이팝|k[-\s]?pop|보이그룹|걸그룹|boy group|girl group|idol group|south korean music group|korean pop)/i.test(text);
    }

    if (profile === "genz_slang") {
        if (/(자동차|정비|부품|국가명|유엔|회원국|육아|출산|baby|parenting)/i.test(text)) {
            return false;
        }
        return /(신조어|유행어|밈|z세대|젠지|mz|인터넷\s*용어|slang|meme|gen\s*z|social media)/i.test(text);
    }

    if (profile === "workplace_it_slang") {
        if (/(자동차|정비|부품|국가명|유엔|회원국|육아|출산|baby|parenting|lyrics?)/i.test(text)) {
            return false;
        }
        return /(판교|스타트업|it\s*회사|업무\s*용어|비즈니스\s*용어|협업|개발팀|agile|scrum|startup|workplace|business jargon)/i.test(text);
    }

    if (profile === "parenting_items") {
        if (/(자동차|정비|부품|국가명|유엔|회원국|lyrics?|가사|it\s*회사|판교)/i.test(text)) {
            return false;
        }
        return /(육아|육아템|신생아|출산|아기|기저귀|수유|유모차|parenting|baby|newborn|baby gear)/i.test(text);
    }

    if (profile === "kpop_song_theme") {
        if (/(자동차|차량|정비|부품|국가명|유엔|회원국)/i.test(text)) {
            return false;
        }
        return /(코르티스|cortis|redred|케이팝|k[-\s]?pop|song|single|album|music|review|artist|idol|노래|곡|싱글|앨범|뮤직|리뷰)/i.test(text);
    }

    return true;
}

function filterPackMakerSourcesByProfile(intent, sources) {
    const profile = packDomainProfile(intent);
    const filtered = (sources || []).filter(source => isPackMakerSourceRelevant(intent, source));
    if (profile !== "generic" && filtered.length > 0) return filtered;
    return filtered.length >= 3 ? filtered : sources;
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

async function wikipediaSearchQuery(language, query) {
    if (!query) return [];

    const apiUrl = new URL(`https://${language}.wikipedia.org/w/api.php`);
    apiUrl.searchParams.set("action", "query");
    apiUrl.searchParams.set("generator", "search");
    apiUrl.searchParams.set("gsrsearch", query);
    apiUrl.searchParams.set("gsrlimit", "5");
    apiUrl.searchParams.set("prop", "extracts|info");
    apiUrl.searchParams.set("exintro", "1");
    apiUrl.searchParams.set("explaintext", "1");
    apiUrl.searchParams.set("exchars", "600");
    apiUrl.searchParams.set("inprop", "url");
    apiUrl.searchParams.set("redirects", "1");
    apiUrl.searchParams.set("format", "json");
    apiUrl.searchParams.set("origin", "*");

    try {
        const data = await fetchJsonWithTimeout(apiUrl, 7500);
        const pages = Object.values(data?.query?.pages || {})
            .sort((a, b) => Number(a.index || 0) - Number(b.index || 0));
        return pages.slice(0, 5).map(page => {
            const title = sanitizePackText(page.title, 100);
            const fallbackUrl = `https://${language}.wikipedia.org/wiki/${encodeURIComponent(String(page.title || "").replace(/\s+/g, "_"))}`;
            return {
                title: `Wikipedia: ${title}`,
                url: sanitizeSourceUrl(page.fullurl || fallbackUrl),
                snippet: sanitizePackText(page.extract || page.title, 360)
            };
        }).filter(item => item.title && item.url && item.snippet);
    } catch (err) {
        console.warn("Wikipedia search failed:", err.message);
        return [];
    }
}

async function wikipediaSearch(intent, message) {
    const language = packMakerSourceLanguage(intent);
    const queries = packMakerSourceQueries(intent, message).slice(0, 3);
    const results = await Promise.all(queries.map(query => wikipediaSearchQuery(language, query)));
    return mergePackMakerSources(...results).slice(0, 7);
}

async function wikidataSearchQuery(language, query) {
    if (!query) return [];

    const apiUrl = new URL("https://www.wikidata.org/w/api.php");
    apiUrl.searchParams.set("action", "wbsearchentities");
    apiUrl.searchParams.set("search", query);
    apiUrl.searchParams.set("language", language);
    apiUrl.searchParams.set("uselang", language);
    apiUrl.searchParams.set("limit", "7");
    apiUrl.searchParams.set("format", "json");
    apiUrl.searchParams.set("origin", "*");

    try {
        const data = await fetchJsonWithTimeout(apiUrl);
        return (data?.search || []).slice(0, 7).map(item => {
            const id = sanitizePackText(item.id, 40);
            const label = sanitizePackText(item.label, 100);
            const description = sanitizePackText(item.description, 220);
            return {
                title: `Wikidata: ${label || id}`,
                url: id ? `https://www.wikidata.org/wiki/${id}` : "",
                snippet: description || label || id
            };
        }).filter(item => item.title && item.url && item.snippet);
    } catch (err) {
        console.warn("Wikidata search failed:", err.message);
        return [];
    }
}

async function wikidataSearch(intent, message) {
    const language = packMakerSourceLanguage(intent);
    const queries = packMakerSourceQueries(intent, message).slice(0, 3);
    const results = await Promise.all(queries.map(query => wikidataSearchQuery(language, query)));
    return mergePackMakerSources(...results).slice(0, 7);
}

async function collectPackMakerSources(intent, message) {
    const queries = packMakerSourceQueries(intent, message);
    const [duckResultLists, wikipediaResults, wikidataResults] = await Promise.all([
        Promise.all(queries.slice(0, 3).map(query => duckDuckGoSearch(query))),
        wikipediaSearch(intent, message),
        wikidataSearch(intent, message)
    ]);
    const duckResults = mergePackMakerSources(...duckResultLists);
    const mergedSources = mergePackMakerSources(wikipediaResults, wikidataResults, duckResults);
    return filterPackMakerSourcesByProfile(intent, mergedSources);
}

function llmHeaders(target) {
    const headers = { "Content-Type": "application/json" };
    if (target.provider === "gemini" && target.apiKey) {
        headers["x-goog-api-key"] = target.apiKey;
        return headers;
    }
    if (target.provider !== "ollama" && target.apiKey) headers.Authorization = `Bearer ${target.apiKey}`;
    return headers;
}

function geminiPayload(messages, options = {}) {
    const maxTokens = Number(options.maxTokens) || 700;
    const temperature = Number.isFinite(Number(options.temperature)) ? Number(options.temperature) : 0.2;
    const systemParts = [];
    const contents = [];

    for (const message of messages) {
        const text = String(message?.content || "").trim();
        if (!text) continue;
        if (message.role === "system") {
            systemParts.push(text);
            continue;
        }
        contents.push({
            role: message.role === "assistant" ? "model" : "user",
            parts: [{ text }]
        });
    }

    return {
        ...(systemParts.length ? {
            systemInstruction: {
                parts: [{ text: systemParts.join("\n\n") }]
            }
        } : {}),
        contents,
        generationConfig: {
            temperature,
            maxOutputTokens: maxTokens
        }
    };
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

    if (target.provider === "gemini") {
        return geminiPayload(messages, options);
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
    if (provider === "gemini") {
        return (data?.candidates?.[0]?.content?.parts || [])
            .map(part => part?.text || "")
            .join("");
    }
    return data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || "";
}

async function callLearnLlm(messages, engine) {
    const target = buildLlmTarget(engine);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), target.provider === "gemini" ? GEMINI_TIMEOUT_MS : LLM_TIMEOUT_MS);

    try {
        const response = await fetchLlmText(target, target.url, {
            method: "POST",
            headers: llmHeaders(target),
            body: JSON.stringify(llmPayload(target, messages)),
            signal: controller.signal
        });

        let data = {};
        try {
            data = response.text ? JSON.parse(response.text) : {};
        } catch {
            data = {};
        }
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

    const mode = body?.mode === "revision" ? "revision" : "new";
    const useContext = mode === "revision";
    const history = useContext ? sanitizeChatHistory(body?.history) : [];
    const intent = providedIntent || extractPackIntent(message);
    const draft = useContext ? normalizeDraftFromLlm(body?.draft || {}, searchResults) : normalizeDraftFromLlm({}, searchResults);
    const sourceBundle = searchResults.length
        ? searchResults.map((item, index) => `${index + 1}. ${item.title}\nURL: ${item.url}\n요약: ${item.snippet}`).join("\n\n")
        : "검색 결과가 비어 있습니다. 일반 지식으로 초안을 만들되 출처가 부족하다고 표시하세요.";

    const currentDraft = draft.items.length
        ? JSON.stringify(draft).slice(0, 5000)
        : "아직 저장된 draft가 없습니다.";
    const messages = [
        { role: "system", content: PACK_MAKER_SYSTEM_PROMPT },
        { role: "system", content: `이번 요청 계약:\n${packIntentMessage(intent)}` },
        { role: "system", content: `검색 결과:\n${sourceBundle}` },
        { role: "system", content: `도메인 힌트:\n${packMakerDomainHint(intent)}` },
        { role: "system", content: "출력 형식: 마지막 응답에는 파싱 가능한 JSON draft 객체 하나를 포함한다. batch 생성 경로에서는 줄 형식만 따른다." }
    ];

    if (useContext) {
        messages.push({ role: "system", content: `현재 draft:\n${currentDraft}` }, ...history);
    }
    messages.push({ role: "user", content: message });

    return {
        engine,
        message,
        mode,
        intent,
        sourceBundle,
        maxTokens: packMakerTokenBudget(intent.requestedCount),
        messages
    };
}

function parseStreamDelta(provider, data) {
    if (provider === "ollama") {
        return data?.message?.content || data?.response || "";
    }

    if (provider === "gemini") {
        return (data?.candidates?.[0]?.content?.parts || [])
            .map(part => part?.text || "")
            .join("");
    }

    const choice = data?.choices?.[0] || {};
    return choice.delta?.content || choice.message?.content || choice.text || "";
}

async function readLearnLlmStream(target, messages, signal, onDelta, options = {}) {
    if (target.provider === "gemini") {
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

        const data = text ? JSON.parse(text) : {};
        const answer = extractLlmAnswer(target.provider, data).trim();
        if (answer) onDelta(answer);
        return answer;
    }

    let response;
    try {
        response = await fetch(target.streamUrl || target.url, {
            method: "POST",
            headers: llmHeaders(target),
            body: JSON.stringify(llmPayload(target, messages, true, options)),
            signal
        });
    } catch (err) {
        if (!shouldRetryGatewayWithResolve4(target, err)) throw err;
        const fallback = await httpsTextRequestWithResolve4(target.url, {
            method: "POST",
            headers: llmHeaders(target),
            body: JSON.stringify(llmPayload(target, messages, false, options)),
            signal
        });
        if (!fallback.ok) {
            const error = new Error(`LLM request failed (${fallback.status})`);
            error.status = fallback.status >= 500 ? 502 : fallback.status;
            throw error;
        }
        let data = {};
        try {
            data = fallback.text ? JSON.parse(fallback.text) : {};
        } catch {
            data = {};
        }
        const answer = extractLlmAnswer(target.provider, data).trim();
        if (answer) onDelta(answer);
        return answer;
    }

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
    const response = await fetchLlmText(target, target.url, {
        method: "POST",
        headers: llmHeaders(target),
        body: JSON.stringify(llmPayload(target, messages, false, options)),
        signal
    });

    const text = response.text || "";
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
            ensureDatabaseSchema(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("DB readiness timeout")), 5000))
        ]);
        res.json({ server: "ok", db: "ok" });
    } catch (err) {
        res.status(503).json({ server: "ok", db: "unavailable", reason: err.message });
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

        const response = await fetchLlmText(target, target.url, {
            method: "POST",
            headers: llmHeaders(target),
            body: JSON.stringify(llmPayload(target, [
                { role: "user", content: "Health check. Reply only OK." }
            ], false, { maxTokens: 16 })),
            signal: controller.signal
        });

        const text = response.text || "";
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
    const timeout = setTimeout(() => controller.abort(), target.provider === "gemini" ? GEMINI_TIMEOUT_MS : LLM_TIMEOUT_MS);
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
        const intent = extractPackIntent(message, req.body || {});
        const conversationMode = classifyPackMakerConversation(message, intent, req.body || {});
        if (isLyricsExtractionRequest(message) && !hasUserProvidedLyricsText(message)) {
            const answer = packMakerLyricsRequiredResponse(message);
            finished = true;
            writeNdjson(res, "meta", {
                engine,
                route: "lyrics-text-required",
                label: packMakerEngineLabel(engine)
            });
            writeNdjson(res, "status", {
                text: "LYRICS TEXT REQUIRED",
                danger: true
            });
            writeNdjson(res, "delta", { text: answer });
            writeNdjson(res, "done", { answer });
            if (!res.writableEnded && !res.destroyed) res.end();
            return;
        }

        if (conversationMode === "ideate" || conversationMode === "clarify") {
            const result = conversationMode === "ideate"
                ? packMakerIdeationResponse(message, intent)
                : packMakerClarifyResponse(message, intent);
            finished = true;
            writeNdjson(res, "meta", {
                engine,
                route: conversationMode,
                label: packMakerEngineLabel(engine)
            });
            writeNdjson(res, "status", {
                text: conversationMode === "ideate" ? "PACK IDEAS READY" : "PACK IDEA CHECK"
            });
            writeNdjson(res, "delta", { text: result.answer });
            writeNdjson(res, "done", { answer: result.answer, suggestion: result.suggestion });
            if (!res.writableEnded && !res.destroyed) res.end();
            return;
        }

        if (conversationMode === "brief") {
            const answer = packMakerBriefResponse(message);
            finished = true;
            writeNdjson(res, "meta", {
                engine,
                route: "not-needed",
                label: packMakerEngineLabel(engine)
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
            text: `TARGET ${intent.requestedCount} ${packLanguageLabel(intent.termLanguage)} TERMS · ${packDescriptionLanguageLabel(intent.descriptionLanguage)} NOTES`
        });

        const searchResults = await collectPackMakerSources(intent, message);
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
        await ensureCustomPackSchema();
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
                CASE
                    WHEN p.pack_kind = 'long' THEN IF(CHAR_LENGTH(COALESCE(p.text_content, '')) > 0, 1, 0)
                    ELSE (SELECT COUNT(*) FROM custom_pack_items i WHERE i.pack_id = p.id)
                END AS item_count
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
        await ensureCustomPackSchema();
        const row = await fetchPackRow(id);
        if (!row || !packRowVisibleToUser(row, req.user)) {
            return res.status(404).json({ error: "Pack not found" });
        }
        const items = sanitizePackKind(row.pack_kind) === "long" ? [] : await fetchPackItems(id);
        res.json({ pack: serializePackRow(row, items) });
    } catch (err) {
        console.error("Pack detail failed:", err.message);
        res.status(500).json({ error: "Database error" });
    }
});

app.get("/api/admin/packs", authUser, rateLimit("admin-packs", 80, 60_000, req => req.user.id), async (req, res) => {
    if (!isPackAdmin(req.user)) return res.status(403).json({ error: "Pack admin required" });

    const status = String(req.query.status || "pending").toLowerCase();
    if (!PACK_STATUSES.has(status)) return res.status(400).json({ error: "Invalid pack status" });

    try {
        await ensureCustomPackSchema();
        const [rows] = await db.query(`
            SELECT p.*, u.nickname AS owner_nickname,
                CASE
                    WHEN p.pack_kind = 'long' THEN IF(CHAR_LENGTH(COALESCE(p.text_content, '')) > 0, 1, 0)
                    ELSE (SELECT COUNT(*) FROM custom_pack_items i WHERE i.pack_id = p.id)
                END AS item_count,
                CASE
                    WHEN p.pack_kind = 'long' THEN 0
                    ELSE (SELECT COUNT(*) FROM custom_pack_items i WHERE i.pack_id = p.id AND i.sources_json = '[]')
                END AS missing_source_count
            FROM custom_packs p
            JOIN users u ON u.id = p.owner_id
            WHERE p.status = ?
            ORDER BY p.updated_at DESC
            LIMIT 100
        `, [status]);

        res.json({
            packs: rows.map(row => ({
                ...serializePackRow(row),
                missingSourceCount: Number(row.missing_source_count || 0)
            }))
        });
    } catch (err) {
        console.error("Admin pack list failed:", err.message);
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
    const tagsJson = JSON.stringify(payload.tags || []);

    try {
        await ensureCustomPackSchema();
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
                `UPDATE custom_packs
                 SET title = ?, description = ?, status = ?, review_reason = '',
                     pack_kind = ?, text_content = ?, preprocess = ?, tags_json = ?
                 WHERE id = ?`,
                [payload.title, payload.description, status, payload.packKind, payload.text, payload.preprocess, tagsJson, id]
            );
        } else {
            const [result] = await connection.query(
                `INSERT INTO custom_packs
                 (owner_id, title, description, status, pack_kind, text_content, preprocess, tags_json)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [req.user.id, payload.title, payload.description, status, payload.packKind, payload.text, payload.preprocess, tagsJson]
            );
            id = result.insertId;
        }

        if (payload.packKind === "long") {
            await connection.query("DELETE FROM custom_pack_items WHERE pack_id = ?", [id]);
        } else {
            await savePackItems(connection, id, payload.items);
        }
        await connection.commit();

        const row = await fetchPackRow(id);
        const items = payload.packKind === "long" ? [] : await fetchPackItems(id);
        let reviewEmail = { sent: false, reason: "not submitted for review" };
        if (payload.submitForReview) {
            reviewEmail = await sendPackReviewEmail(req, row, items, req.user);
            if (!reviewEmail.sent) {
                console.warn(`Pack review email skipped/failed for pack ${id}: ${reviewEmail.reason}`);
            }
        }
        res.json({ ok: true, pack: serializePackRow(row, items), reviewEmail });
    } catch (err) {
        await connection.rollback();
        console.error("Pack save failed:", err.message);
        res.status(500).json({ error: "Database error" });
    } finally {
        connection.release();
    }
});

app.delete("/api/packs/:id", authUser, rateLimit("packs-delete", 20, 60_000, req => req.user.id), async (req, res) => {
    let id;
    try {
        id = packId(req.params.id);
    } catch (err) {
        return res.status(err.status || 400).json({ error: err.message });
    }

    await ensureCustomPackSchema();
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();
        const [rows] = await connection.query(
            "SELECT id, owner_id, title, status FROM custom_packs WHERE id = ? LIMIT 1",
            [id]
        );
        const row = rows[0];
        if (!row) {
            await connection.rollback();
            return res.status(404).json({ error: "Pack not found" });
        }
        if (row.owner_id !== req.user.id && !isPackAdmin(req.user)) {
            await connection.rollback();
            return res.status(403).json({ error: "Only the pack owner can delete this pack" });
        }

        await connection.query("DELETE FROM custom_pack_scores WHERE pack_id = ?", [id]);
        await connection.query("DELETE FROM custom_pack_items WHERE pack_id = ?", [id]);
        await connection.query("DELETE FROM custom_packs WHERE id = ?", [id]);
        await connection.commit();
        res.json({ ok: true, deletedId: id, title: row.title });
    } catch (err) {
        await connection.rollback();
        console.error("Pack delete failed:", err.message);
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
        await ensureCustomPackSchema();
        const [result] = await db.query(
            "UPDATE custom_packs SET status = ?, review_reason = ? WHERE id = ?",
            [status, reason, id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: "Pack not found" });
        const row = await fetchPackRow(id);
        const items = sanitizePackKind(row.pack_kind) === "long" ? [] : await fetchPackItems(id);
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
        await ensureCustomPackSchema();
        const row = await fetchPackRow(id);
        if (!row || !packRowVisibleToUser(row, req.user)) return res.status(404).json({ error: "Pack not found" });
        if (sanitizePackKind(row.pack_kind) === "long") {
            return res.status(400).json({ error: "Long practice packs do not use DROP scores" });
        }

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
        await ensureCustomPackSchema();
        const row = await fetchPackRow(id);
        if (!row || !packRowVisibleToUser(row, req.user)) return res.status(404).json({ error: "Pack not found" });
        if (sanitizePackKind(row.pack_kind) === "long") {
            return res.status(400).json({ error: "Long practice packs do not use DROP leaderboards" });
        }
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

    await ensureCustomPackSchema();
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
    ensureDatabaseSchema().catch(err => {
        console.error("CodeDrop DB schema check failed:", err.message);
    });
});
