import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import crypto from "crypto";
dotenv.config();

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
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const DIFFICULTIES = new Set(["easy", "normal", "developer"]);
const PACKS = new Set(["python", "js", "http", "cli", "linux", "oc_core", "vocab", "mix"]);
const NICKNAME_RE = /^[A-Za-z0-9_-]{3,16}$/;

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
    return Math.max(min, Math.min(max, Math.round(num)));
}

function normalizeCategory(value, allowed) {
    if (value === undefined || value === null || value === "") return null;
    const normalized = String(value).toLowerCase();
    return allowed.has(normalized) ? normalized : false;
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

// 1. 회원가입
app.post("/register", async (req, res) => {
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
app.post("/login", async (req, res) => {
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
app.post("/withdraw", authUser, async (req, res) => {
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
app.post("/submit", authUser, async (req, res) => {
    const { score, wpm, accuracy, difficulty, pack } = req.body;

    const safeScore = boundedNumber(score, 0, 1000000);
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
