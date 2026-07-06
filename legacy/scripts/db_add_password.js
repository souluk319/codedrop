
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

async function migrate() {
    let connection;
    try {
        console.log("Connecting to database...");
        connection = await mysql.createConnection(dbConfig);
        console.log("Connected.");

        console.log("Adding password column...");
        await connection.execute(`
            ALTER TABLE users 
            ADD COLUMN password VARCHAR(255) NULL AFTER nickname;
        `);
        console.log("✅ Successfully added password column to users table.");

    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log("⚠️ Password column already exists.");
        } else {
            console.error("❌ Migration failed:", error);
        }
    } finally {
        if (connection) await connection.end();
    }
}

migrate();
