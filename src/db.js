const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL client error:", err);
});

/**
 * Run a parameterised query and return the full result object.
 * Usage: const { rows } = await query('SELECT * FROM users WHERE id = $1', [id])
 */
async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

/**
 * Convenience: return the first row or null.
 */
async function queryOne(text, params) {
  const { rows } = await query(text, params);
  return rows[0] || null;
}

module.exports = { pool, query, queryOne };
