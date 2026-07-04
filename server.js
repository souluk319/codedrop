import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import crypto from "crypto";
dotenv.config({ path: [".env.local", ".env"] });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const allowedOrigins = (process.env.ALLOWED_ORIGINS ||
    "http://localhost:3001,http://127.0.0.1:3001,https://codedrop-se9n.onrender.com")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

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

// 🔹 Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Serve index.html at root (Explicitly before static)
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'index.html');
    console.log("Serving index.html from:", indexPath);
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error("Error serving index.html:", err);
            res.status(500).send("Error loading game: " + err.message);
        }
    });
});

["privacy.html", "terms.html", "data-deletion.html", "meta-review.html"].forEach(file => {
    app.get(`/${file}`, (req, res) => {
        res.sendFile(path.join(__dirname, file));
    });
});

app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use("/sound", express.static(path.join(__dirname, "sound")));

// 🔹 MySQL 연결 설정
const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 4000,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "codedrop_db",
    // waitForConnections: true,
    // connectionLimit: 10,
    // [변경점 3] SSL 옵션 추가 (필수)
    // 설명: 클라우드 DB는 해킹 방지를 위해 이 옵션이 없으면 접속을 튕겨냅니다.
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    },
    waitForConnections: true,
    connectionLimit: 10,
});

const sessions = new Map();
const rateBuckets = new Map();
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const DIFFICULTIES = new Set(["easy", "normal", "developer"]);
const PACKS = new Set(["python", "js", "http", "cli", "linux", "oc_core", "vocab", "mix"]);
const NICKNAME_RE = /^[A-Za-z0-9_-]{3,16}$/;
const MAX_SUBMITTED_SCORE = 25000;
const MAX_CHAT_MESSAGE_LEN = 1200;
const MAX_CHAT_HISTORY = 8;
const LLM_TIMEOUT_MS = Math.max(1000, Math.min(Number(process.env.LLM_TIMEOUT_MS) || 30_000, 120_000));
const CHAT_ENGINES = new Set(["kugnus", "openai"]);

function envFirst(names) {
    for (const name of names) {
        const value = process.env[name];
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
}

const DUCKDUCKGO_ENV_NAMES = [
    "DUCKDUCKGO_API_KEY",
    "DUCKDUCKGO_KEY",
    "DUCKDUCKGO_SEARCH_API_KEY",
    "DUCKDUCKGO_TOKEN",
    "DDG_API_KEY",
    "DDG_KEY",
    "DDG_SEARCH_API_KEY",
    "DDG_TOKEN",
    "DUCK_API_KEY"
];

const OPENAI_KEY_ENV_NAMES = [
    "OPENAI_API_KEY",
    "OPENAI_KEY",
    "GPT54_MINI_API_KEY",
    "LLM_OPENAI_API_KEY"
];

const OPENAI_MODEL_ENV_NAMES = [
    "OPENAI_MODEL",
    "GPT54_MINI_MODEL",
    "GPT5_4_MINI_MODEL"
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

const LEARN_CHAT_SYSTEM_PROMPT = [
    "너는 CodeDrop OCP Edition의 EX280 학습 조교다.",
    "사용자는 OpenShift/리눅스 명령을 손에 익히는 중이다.",
    "항상 한국어로 답하고, 시험장에서 바로 쓸 수 있는 명령 중심으로 짧고 정확하게 설명한다.",
    "정답만 던지기보다 왜 이 명령을 쓰는지, 자주 틀리는 플래그, 검증 명령을 함께 알려준다.",
    "사용자가 현재 퀴즈를 풀고 있으면 먼저 힌트와 사고 방향을 주고, 사용자가 명시적으로 정답을 원할 때만 완성 명령을 제시한다.",
    "확실하지 않은 시험 정책이나 버전 의존 내용은 단정하지 말고 확인 필요성을 말한다."
].join(" ");

function createSession(user) {
    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, {
        userId: user.id,
        nickname: user.nickname,
        expiresAt: Date.now() + SESSION_TTL_MS
    });
    return token;
}

function authUser(req, res, next) {
    const header = req.get("authorization") || "";
    const match = header.match(/^Bearer\s+([a-f0-9]{64})$/i);
    if (!match) return res.status(401).json({ error: "Authentication required" });

    const session = sessions.get(match[1]);
    if (!session || session.expiresAt < Date.now()) {
        if (session) sessions.delete(match[1]);
        return res.status(401).json({ error: "Session expired" });
    }

    req.user = { id: session.userId, nickname: session.nickname };
    next();
}

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
    const engine = String(value || "kugnus").toLowerCase().replace(/[\s_]+/g, "-");
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

function inferLlmProvider(baseUrl, explicitProvider) {
    if (explicitProvider) return explicitProvider.toLowerCase();
    if (/ollama|:11434|\/api\/chat|\/api\/generate/i.test(baseUrl)) return "ollama";
    return "openai";
}

function buildLlmTarget(engine = "kugnus") {
    if (engine === "openai") {
        const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").trim().replace(/\/+$/, "");
        const model = normalizeOpenAiMiniModel(envFirst(OPENAI_MODEL_ENV_NAMES));
        const apiKey = envFirst(OPENAI_KEY_ENV_NAMES);

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

    const baseUrl = (process.env.LLM_ENDPOINT || process.env.LLM_BASE_URL || "").trim().replace(/\/+$/, "");
    const model = (process.env.LLM_MODEL || "").trim();
    if (!baseUrl || !model) {
        const err = new Error("KUGNUS AI is not configured");
        err.status = 503;
        throw err;
    }

    const provider = inferLlmProvider(baseUrl, process.env.LLM_PROVIDER || "");
    const apiKey = (process.env.LLM_API_KEY || process.env.LOCAL_LLM_API_KEY || "").trim();
    if (/\/(chat\/completions|api\/chat|api\/generate)$/i.test(baseUrl)) {
        return { engine: "kugnus", label: "KUGNUS AI", provider, url: baseUrl, model, apiKey };
    }

    if (provider === "ollama") {
        return { engine: "kugnus", label: "KUGNUS AI", provider, url: `${baseUrl}/api/chat`, model, apiKey };
    }

    const openAiBase = /\/v1$/i.test(baseUrl) ? baseUrl : `${baseUrl}/v1`;
    return { engine: "kugnus", label: "KUGNUS AI", provider, url: `${openAiBase}/chat/completions`, model, apiKey };
}

function duckDuckGoConfig() {
    return {
        provider: "duckduckgo",
        apiKey: envFirst(DUCKDUCKGO_ENV_NAMES),
        baseUrl: envFirst(["DUCKDUCKGO_BASE_URL", "DDG_BASE_URL"]) || "https://api.duckduckgo.com"
    };
}

function llmHeaders(target) {
    const headers = { "Content-Type": "application/json" };
    if (target.provider !== "ollama" && target.apiKey) headers.Authorization = `Bearer ${target.apiKey}`;
    return headers;
}

function llmPayload(target, messages, stream = false) {
    if (target.provider === "ollama") {
        return {
            model: target.model,
            messages,
            stream,
            options: { temperature: 0.2 }
        };
    }

    if (target.engine === "openai") {
        return {
            model: target.model,
            messages,
            max_completion_tokens: 700,
            stream
        };
    }

    return {
        model: target.model,
        messages,
        temperature: 0.2,
        max_tokens: 700,
        stream
    };
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

function parseStreamDelta(provider, data) {
    if (provider === "ollama") {
        return data?.message?.content || data?.response || "";
    }

    const choice = data?.choices?.[0] || {};
    return choice.delta?.content || choice.message?.content || choice.text || "";
}

async function readLearnLlmStream(target, messages, signal, onDelta) {
    const response = await fetch(target.url, {
        method: "POST",
        headers: llmHeaders(target),
        body: JSON.stringify(llmPayload(target, messages, true)),
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

function writeNdjson(res, event, payload = {}) {
    if (res.writableEnded || res.destroyed) return;
    res.write(`${JSON.stringify({ event, ...payload })}\n`);
}

// 🔹 서버 + DB 살아있는지 확인용
// 🔹 서버 + DB 살아있는지 확인용 (DB 체크 임시 비활성화)
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

        // Delete user (Cascade should handle leaderboard, but let's be safe or assume cascade is set. 
        // If not, we might need to delete leaderboard entries first. 
        // For now, let's assume simple delete user is enough or we leave leaderboard data as 'Unknown')
        // Actually, let's delete leaderboard entries for privacy.
        await connection.query("DELETE FROM leaderboard WHERE user_id = ?", [req.user.id]);
        await connection.query("DELETE FROM users WHERE id = ?", [req.user.id]);
        await connection.commit();

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

// 🔹 서버 실행 (마지막에 위치)
// [변경점 4] 포트 번호 유연화
// 설명: Render가 환경변수로 주는 PORT 값을 우선 사용하고, 없으면(로컬) 3001을 씁니다.
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`✅ CodeDrop server running on port ${PORT}`);
});

// 🔹 서버 실행 (마지막에 위치)
// app.listen(3001, () => {
//    console.log("✅ CodeDrop server running at http://127.0.0.1:3001");
//});
