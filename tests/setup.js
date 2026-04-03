const pool = require("../src/db");

afterAll(async () => {
  await pool.end();
});
