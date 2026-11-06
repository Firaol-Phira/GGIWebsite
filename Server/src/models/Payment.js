const pool = require("../config/db");

// Monthly: deadline day of the month. Yearly: the due date finance set for that quarter.
// Other / penalty: no deadline (NULL), so timing is empty.
const DUE = `CASE p.payment_type
  WHEN 'monthly' THEN STR_TO_DATE(CONCAT(p.period_year,'-',p.period_month,'-',COALESCE(cs.monthly_due_day,15)),'%Y-%m-%d')
  WHEN 'yearly' THEN CASE p.period_quarter WHEN 1 THEN cs.q1_due WHEN 2 THEN cs.q2_due
       WHEN 3 THEN cs.q3_due ELSE cs.q4_due END
  ELSE NULL END`;
const TIMING = `(p.payment_date <= ${DUE}) AS on_time, ${DUE} AS due_date`;

exports.create = async (p, db = pool) => {
  const [r] = await db.query(
    `INSERT INTO payments (member_id, payment_type, period_year, period_month, period_quarter,
       amount, payment_date, method, reference_no, receipt_url, note, reason, source, recorded_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      p.member_id,
      p.payment_type,
      p.period_year,
      p.period_month,
      p.period_quarter,
      p.amount,
      p.payment_date,
      p.method,
      p.reference_no || null,
      p.receipt_url || null,
      p.note || null,
      p.reason || null,
      p.source || "finance",
      p.recorded_by,
    ],
  );
  return r.insertId;
};

// One monthly payment per month, one yearly installment per quarter
exports.findDuplicate = async (
  { member_id, year, type, month, quarter },
  db = pool,
) => {
  const [rows] = await db.query(
    `SELECT id FROM payments
     WHERE member_id = ? AND period_year = ? AND payment_type = ?
       AND COALESCE(period_month,0) = COALESCE(?,0)
       AND COALESCE(period_quarter,0) = COALESCE(?,0)
       AND status IN ('pending','approved')`,
    [member_id, year, type, month, quarter],
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

// The same transfer reference can't pay twice
exports.findByReference = async (method, reference_no, db = pool) => {
  const [rows] = await db.query(
    "SELECT id FROM payments WHERE method = ? AND reference_no = ? AND status IN ('pending','approved')",
    [method, reference_no],
  );
  return rows[0];
};

exports.coverage = async (memberId, year, db = pool) => {
  const [rows] = await db.query(
    `SELECT payment_type, period_month, period_quarter, status FROM payments
     WHERE member_id = ? AND period_year = ? AND payment_type IN ('monthly','yearly')
       AND status IN ('pending','approved')`,
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
    `SELECT p.*, ${TIMING}, m.full_name AS member_name,
            r.full_name AS recorded_by_name, v.full_name AS reviewed_by_name
     FROM payments p
     LEFT JOIN contribution_settings cs ON cs.year = p.period_year
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
    `SELECT p.id, p.payment_type, p.period_year, p.period_month, p.period_quarter, p.amount,
            p.payment_date, p.method, p.reference_no, p.receipt_url, p.reason, p.status,
            p.reject_reason, ${TIMING}
     FROM payments p
     LEFT JOIN contribution_settings cs ON cs.year = p.period_year
     WHERE p.member_id = ?
     ORDER BY p.period_year DESC, p.period_quarter DESC, p.period_month DESC, p.created_at DESC`,
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

// Active members with no approved MONTHLY payment for this month
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

// Active members with no approved YEARLY installment for this quarter
exports.unpaidYearly = async (year, quarter, db = pool) => {
  const [rows] = await db.query(
    `SELECT m.id, m.full_name, m.phone FROM members m
     WHERE m.status = 'active' AND NOT EXISTS (
       SELECT 1 FROM payments p
       WHERE p.member_id = m.id AND p.status = 'approved' AND p.period_year = ?
         AND p.payment_type = 'yearly' AND p.period_quarter = ?)
     ORDER BY m.full_name`,
    [year, quarter],
  );
  return rows;
};
