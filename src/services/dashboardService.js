const { query } = require("../db");

function dateFilter(q) {
  const conds = ["deleted_at IS NULL"];
  const vals  = [];
  let i = 1;
  if (q.from) { conds.push(`date>=$${i++}`); vals.push(q.from); }
  if (q.to)   { conds.push(`date<=$${i++}`); vals.push(q.to); }
  return { where: conds.join(" AND "), vals, nextIdx: i };
}

async function getSummary(q) {
  const { where, vals } = dateFilter(q);
  const { rows } = await query(
    `SELECT
       COALESCE(SUM(amount) FILTER (WHERE type='income'),  0) AS total_income,
       COALESCE(SUM(amount) FILTER (WHERE type='expense'), 0) AS total_expenses,
       COUNT(*)                                               AS record_count,
       COUNT(*) FILTER (WHERE type='income')                  AS income_count,
       COUNT(*) FILTER (WHERE type='expense')                 AS expense_count,
       MAX(amount)                                            AS largest_transaction,
       AVG(amount)                                            AS avg_transaction
     FROM records WHERE ${where}`,
    vals
  );
  const r = rows[0];
  const income   = parseFloat(r.total_income);
  const expenses = parseFloat(r.total_expenses);
  return {
    totalIncome:        income,
    totalExpenses:      expenses,
    netBalance:         parseFloat((income - expenses).toFixed(2)),
    savingsRate:        income > 0 ? parseFloat(((income - expenses) / income * 100).toFixed(2)) : 0,
    recordCount:        parseInt(r.record_count),
    incomeCount:        parseInt(r.income_count),
    expenseCount:       parseInt(r.expense_count),
    largestTransaction: parseFloat(r.largest_transaction) || 0,
    avgTransaction:     parseFloat(parseFloat(r.avg_transaction || 0).toFixed(2)),
    period: { from: q.from || null, to: q.to || null },
  };
}

async function getByCategory(q) {
  const { where, vals } = dateFilter(q);
  const { rows } = await query(
    `SELECT
       category,
       COALESCE(SUM(amount) FILTER (WHERE type='income'),  0) AS income,
       COALESCE(SUM(amount) FILTER (WHERE type='expense'), 0) AS expense,
       COUNT(*)                                               AS count
     FROM records WHERE ${where}
     GROUP BY category
     ORDER BY (SUM(amount) FILTER (WHERE type='income') + SUM(amount) FILTER (WHERE type='expense')) DESC`,
    vals
  );
  return rows.map((r) => ({
    category: r.category,
    income:   parseFloat(r.income),
    expense:  parseFloat(r.expense),
    net:      parseFloat((parseFloat(r.income) - parseFloat(r.expense)).toFixed(2)),
    count:    parseInt(r.count),
  }));
}

async function getTrends(q) {
  const trunc = q.period === "weekly" ? "week" : "month";
  const { where, vals } = dateFilter(q);
  const { rows } = await query(
    `SELECT
       TO_CHAR(DATE_TRUNC('${trunc}', date), 'YYYY-MM-DD') AS period,
       COALESCE(SUM(amount) FILTER (WHERE type='income'),  0) AS income,
       COALESCE(SUM(amount) FILTER (WHERE type='expense'), 0) AS expense,
       COUNT(*)                                               AS count
     FROM records WHERE ${where}
     GROUP BY DATE_TRUNC('${trunc}', date)
     ORDER BY DATE_TRUNC('${trunc}', date)`,
    vals
  );
  return rows.map((r) => ({
    period:  r.period,
    income:  parseFloat(r.income),
    expense: parseFloat(r.expense),
    net:     parseFloat((parseFloat(r.income) - parseFloat(r.expense)).toFixed(2)),
    count:   parseInt(r.count),
  }));
}

async function getRecent(limit = 10) {
  const n = Math.min(parseInt(limit) || 10, 50);
  const { rows } = await query(
    `SELECT r.id,r.amount,r.type,r.category,r.date,r.notes,r.created_at,u.name AS created_by_name
     FROM records r JOIN users u ON u.id=r.created_by
     WHERE r.deleted_at IS NULL
     ORDER BY r.created_at DESC LIMIT $1`,
    [n]
  );
  return rows;
}

// NEW: top spending categories
async function getTopExpenses(q) {
  const { where, vals } = dateFilter(q);
  const { rows } = await query(
    `SELECT category, SUM(amount) AS total, COUNT(*) AS count
     FROM records WHERE ${where} AND type='expense'
     GROUP BY category ORDER BY total DESC LIMIT 5`,
    vals
  );
  return rows.map((r) => ({ category: r.category, total: parseFloat(r.total), count: parseInt(r.count) }));
}

module.exports = { getSummary, getByCategory, getTrends, getRecent, getTopExpenses };
