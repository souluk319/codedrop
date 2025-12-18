import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

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

app.use(express.static(__dirname)); // Serve static files from current directory

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

// 🔹 서버 + DB 살아있는지 확인용
app.get("/health", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT 1 AS ok");
        res.json({ server: "ok", db: rows[0].ok });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🔹 API 구현

// 1. 유저 등록/조회
app.post("/user", async (req, res) => {
    const { nickname } = req.body;
    if (!nickname) return res.status(400).json({ error: "Nickname required" });

    try {
        // Check if user exists
        const [rows] = await db.query("SELECT id FROM users WHERE nickname = ?", [nickname]);

        if (rows.length > 0) {
            return res.json({ user_id: rows[0].id });
        } else {
            // Create new user
            const [result] = await db.query("INSERT INTO users (nickname) VALUES (?)", [nickname]);
            return res.json({ user_id: result.insertId });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

// 2. 점수 제출
app.post("/submit", async (req, res) => {
    const { user_id, score, wpm, accuracy, difficulty, pack } = req.body;

    if (!user_id || score === undefined) {
        return res.status(400).json({ error: "Missing fields" });
    }

    try {
        await db.query(
            "INSERT INTO leaderboard (user_id, score, wpm, accuracy, difficulty, pack) VALUES (?, ?, ?, ?, ?, ?)",
            [user_id, score, wpm, accuracy, difficulty, pack]
        );

        // Return updated top 10 for this category
        const top10 = await getLeaderboard(difficulty, pack);
        res.json({ ok: true, top10 });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

// 3. 리더보드 조회
app.get("/leaderboard", async (req, res) => {
    const { difficulty, pack } = req.query;
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
