
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 4000,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "codedrop_db",
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    }
};

async function checkSchema() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute(`SHOW COLUMNS FROM users LIKE 'password';`);

        if (rows.length > 0) {
            console.log("✅ TiDB Cloud Verification: 'password' column EXISTS.");
        } else {
            console.log("❌ TiDB Cloud Verification: 'password' column MISSING.");
        }
    } catch (error) {
        console.error("❌ Verification failed:", error.message);
    } finally {
        if (connection) await connection.end();
    }
}

checkSchema();
