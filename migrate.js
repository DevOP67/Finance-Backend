/**
 * Run with: node migrate.js
 * Reads DATABASE_URL from .env and applies migrations/001_init.sql
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { pool } = require("./src/db");

async function migrate() {
  const sql = fs.readFileSync(
    path.join(__dirname, "migrations/001_init.sql"),
    "utf-8"
  );
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log("✅  Migration applied successfully.");
  } catch (err) {
    console.error("❌  Migration failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
