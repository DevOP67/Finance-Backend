const bcrypt = require("bcryptjs");
const { query, queryOne } = require("../db");
const { AppError, notFound, conflict } = require("../middleware/errorHandler");

async function isFirstUser() {
  const { rows } = await query("SELECT COUNT(*) FROM users WHERE deleted_at IS NULL");
  return parseInt(rows[0].count) === 0;
}

async function findByEmail(email) {
  return queryOne("SELECT * FROM users WHERE email=$1 AND deleted_at IS NULL", [email.toLowerCase()]);
}

async function findById(id) {
  return queryOne(
    "SELECT id,name,email,role,status,created_at,updated_at FROM users WHERE id=$1 AND deleted_at IS NULL",
    [id]
  );
}

async function listAll() {
  const { rows } = await query(
    "SELECT id,name,email,role,status,created_at,updated_at FROM users WHERE deleted_at IS NULL ORDER BY id"
  );
  return rows;
}

async function createUser({ name, email, password, role }) {
  const existing = await findByEmail(email);
  if (existing) throw conflict("Email already registered");

  const hash = await bcrypt.hash(password, 10);
  return queryOne(
    `INSERT INTO users (name,email,password_hash,role,status)
     VALUES ($1,$2,$3,$4,'active')
     RETURNING id,name,email,role,status,created_at`,
    [name, email.toLowerCase(), hash, role]
  );
}

async function updateUser(id, fields) {
  const allowed = ["name", "role", "status"];
  const sets = [], values = [];
  let i = 1;
  for (const k of allowed) {
    if (fields[k] !== undefined) { sets.push(`${k}=$${i++}`); values.push(fields[k]); }
  }
  if (!sets.length) throw new AppError("No updatable fields provided", 400, "BAD_REQUEST");
  sets.push("updated_at=NOW()");
  values.push(id);

  const user = await queryOne(
    `UPDATE users SET ${sets.join(",")} WHERE id=$${i} AND deleted_at IS NULL
     RETURNING id,name,email,role,status,created_at,updated_at`,
    values
  );
  if (!user) throw notFound("User not found");
  return user;
}

async function softDeleteUser(id, requesterId) {
  if (+id === +requesterId) throw new AppError("Cannot delete yourself", 400, "BAD_REQUEST");
  const user = await queryOne(
    `UPDATE users SET deleted_at=NOW(), status='inactive', updated_at=NOW()
     WHERE id=$1 AND deleted_at IS NULL RETURNING id`,
    [id]
  );
  if (!user) throw notFound("User not found");
}

async function verifyPassword(user, password) {
  return bcrypt.compare(password, user.password_hash);
}

module.exports = { isFirstUser, findByEmail, findById, listAll, createUser, updateUser, softDeleteUser, verifyPassword };
