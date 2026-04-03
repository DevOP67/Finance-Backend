const { query, queryOne } = require("../db");
const { notFound, forbidden } = require("../middleware/errorHandler");

const COLUMNS = "r.id,r.amount,r.type,r.category,r.date,r.notes,r.created_by,r.created_at,r.updated_at,r.deleted_at,u.name AS created_by_name";

function buildWhere(q) {
  const conds = ["r.deleted_at IS NULL"];
  const vals  = [];
  let i = 1;
  if (q.type)      { conds.push(`r.type=$${i++}`);      vals.push(q.type); }
  if (q.category)  { conds.push(`r.category=$${i++}`);  vals.push(q.category); }
  if (q.from)      { conds.push(`r.date>=$${i++}`);     vals.push(q.from); }
  if (q.to)        { conds.push(`r.date<=$${i++}`);     vals.push(q.to); }
  if (q.minAmount) { conds.push(`r.amount>=$${i++}`);   vals.push(q.minAmount); }
  if (q.maxAmount) { conds.push(`r.amount<=$${i++}`);   vals.push(q.maxAmount); }
  if (q.search) {
    conds.push(`(r.notes ILIKE $${i} OR r.category ILIKE $${i} OR CAST(r.type AS TEXT) ILIKE $${i})`);
    vals.push(`%${q.search}%`); i++;
  }
  return { where: conds.join(" AND "), vals, nextIdx: i };
}

async function listRecords(filters) {
  const page   = Math.max(1, parseInt(filters.page)  || 1);
  const limit  = Math.min(100, parseInt(filters.limit) || 20);
  const offset = (page - 1) * limit;

  const { where, vals, nextIdx } = buildWhere(filters);

  const countRes = await query(`SELECT COUNT(*) FROM records r WHERE ${where}`, vals);
  const total    = parseInt(countRes.rows[0].count);

  const pageVals = [...vals, limit, offset];
  const { rows } = await query(
    `SELECT ${COLUMNS} FROM records r
     JOIN users u ON u.id=r.created_by
     WHERE ${where}
     ORDER BY r.date DESC, r.created_at DESC
     LIMIT $${nextIdx} OFFSET $${nextIdx + 1}`,
    pageVals
  );
  return { records: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

async function getRecordById(id) {
  const record = await queryOne(
    `SELECT ${COLUMNS} FROM records r JOIN users u ON u.id=r.created_by WHERE r.id=$1 AND r.deleted_at IS NULL`,
    [id]
  );
  if (!record) throw notFound("Record not found");
  return record;
}

async function createRecord({ amount, type, category, date, notes }, userId) {
  return queryOne(
    `INSERT INTO records (amount,type,category,date,notes,created_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [amount, type, category, date, notes || null, userId]
  );
}

async function updateRecord(id, fields, user) {
  const existing = await queryOne("SELECT * FROM records WHERE id=$1 AND deleted_at IS NULL", [id]);
  if (!existing) throw notFound("Record not found");
  if (user.role === "analyst" && existing.created_by !== user.id)
    throw forbidden("Analysts can only edit their own records");

  const allowed = ["amount", "type", "category", "date", "notes"];
  const sets = [], vals = [];
  let i = 1;
  for (const k of allowed) {
    if (fields[k] !== undefined) { sets.push(`${k}=$${i++}`); vals.push(fields[k]); }
  }
  if (!sets.length) throw new (require("../middleware/errorHandler").AppError)("No updatable fields", 400, "BAD_REQUEST");
  sets.push("updated_at=NOW()");
  vals.push(id);

  return queryOne(
    `UPDATE records SET ${sets.join(",")} WHERE id=$${i} AND deleted_at IS NULL RETURNING *`,
    vals
  );
}

async function softDeleteRecord(id) {
  // Preserve deleted record in audit log with deleted_at timestamp
  const record = await queryOne(
    `UPDATE records SET deleted_at=NOW(), updated_at=NOW()
     WHERE id=$1 AND deleted_at IS NULL
     RETURNING id, amount, type, category, date, deleted_at`,
    [id]
  );
  if (!record) throw notFound("Record not found");
  return record; // return snapshot for audit logging
}

module.exports = { listRecords, getRecordById, createRecord, updateRecord, softDeleteRecord };
