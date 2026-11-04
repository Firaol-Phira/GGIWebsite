const pool = require("../config/db");
const DUE_DAY = Number(process.env.DUE_DAY) || 15;
const ON_TIME = `(p.payment_date <= STR_TO_DATE(CONCAT(p.period_year,'-',COALESCE(p.period_month,1),'-',${DUE_DAY}),'%Y-%m-%d')) AS on_time`;

exports.create = async (p, db = pool) => {
  const [r] = await db.query(
    `INSERT INTO payments (member_id, payment_type, period_year, period_month, amount,
       payment_date, method, receipt_url, note, source, recorded_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [
      p.member_id,
      p.payment_type,
      p.period_year,
      p.period_month,
      p.amount,
      p.payment_date,
      p.method,
      p.receipt_url || null,
      p.note || null,
      p.source || "finance",
      p.recorded_by,
    ],
  );
  return r.insertId;
};

// A yearly payment blocks every month, and any monthly payment blocks yearly
exports.findDuplicate = async ({ member_id, year, type, month }, db = pool) => {
  const [rows] = await db.query(
    `SELECT id FROM payments
    
     WHERE member_id = ? AND period_year = ? AND payment_type = ?
       AND (? IS NULL OR period_month = ?) AND status IN ('pending','approved')`,
    [member_id, year, type, month, month],
  );
  return rows[0];
};
exports.findByReceiptUrl = async (url, db = pool) => {
  const [rows] = await db.query(
    "SELECT id FROM payments WHERE receipt_url = ? AND status IN ('pending','approved')",
    [url],
  );
  return rows[0];
};

exports.coverage = async (memberId, year, db = pool) => {
  const [rows] = await db.query(
    `SELECT payment_type, period_month, status FROM payments
     WHERE member_id = ? AND period_year = ? AND status IN ('pending','approved')`,
    [memberId, year],
  );
  return rows;
};

exports.list = async ({ status, member_id, year, type } = {}, db = pool) => {
  const where = [],
    params = [];
  for (const [col, val] of [
    ["p.status", status],
    ["p.member_id", member_id],
    ["p.period_year", year],
    ["p.payment_type", type],
  ]) {
    if (val) {
      where.push(`${col} = ?`);
      params.push(val);
    }
  }
  const [rows] = await db.query(
    `SELECT p.*, ${ON_TIME}, m.full_name AS member_name,
            r.full_name AS recorded_by_name, v.full_name AS reviewed_by_name
     FROM payments p
     JOIN members m ON m.id = p.member_id
     JOIN users r ON r.id = p.recorded_by
     LEFT JOIN users v ON v.id = p.reviewed_by
     ${where.length ? "WHERE " + where.join(" AND ") : ""}
     ORDER BY p.created_at DESC`,
    params,
  );
  return rows;
};

exports.listForMember = async (memberId, db = pool) => {
  const [rows] = await db.query(
    `SELECT p.id, p.payment_type, p.period_year, p.period_month, p.amount, p.payment_date,
            p.method, p.receipt_url, p.status, p.reject_reason, ${ON_TIME}
     FROM payments p WHERE p.member_id = ?
     ORDER BY p.period_year DESC, p.period_month DESC`,
    [memberId],
  );
  return rows;
};

exports.findById = async (id, db = pool) => {
  const [rows] = await db.query(
    "SELECT recorded_by, status FROM payments WHERE id = ?",
    [id],
  );
  return rows[0];
};

// true only if it was still pending (stops two people reviewing at once)
exports.review = async (id, { status, reviewer_id, reason }, db = pool) => {
  const [r] = await db.query(
    `UPDATE payments SET status = ?, reviewed_by = ?, reviewed_at = NOW(), reject_reason = ?
     WHERE id = ? AND status = 'pending'`,
    [status, reviewer_id, status === "rejected" ? reason : null, id],
  );
  return r.affectedRows > 0;
};

// Active members with no approved payment covering this month
exports.unpaid = async (year, month, db = pool) => {
  const [rows] = await db.query(
    `SELECT m.id, m.full_name, m.phone FROM members m
     WHERE m.status = 'active' AND NOT EXISTS (
       SELECT 1 FROM payments p
       WHERE p.member_id = m.id AND p.status = 'approved' AND p.period_year = ?
         AND p.payment_type = 'monthly' AND p.period_month = ?)
     ORDER BY m.full_name`,
    [year, month],
  );
  return rows;
};

// Active members with no approved yearly payment
exports.unpaidYearly = async (year, db = pool) => {
  const [rows] = await db.query(
    `SELECT m.id, m.full_name, m.phone FROM members m
     WHERE m.status = 'active' AND NOT EXISTS (
       SELECT 1 FROM payments p
       WHERE p.member_id = m.id AND p.status = 'approved'
         AND p.period_year = ? AND p.payment_type = 'yearly')
     ORDER BY m.full_name`,
    [year],
  );
  return rows;
};
