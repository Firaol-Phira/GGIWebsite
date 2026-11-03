const pool = require("../config/db");

exports.create = async (p, db = pool) => {
  const [r] = await db.query(
    `INSERT INTO payments (member_id, payment_type, period_year, period_month, amount,
       payment_date, method, reference_no, note, recorded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      p.member_id,
      p.payment_type,
      p.period_year,
      p.period_month,
      p.amount,
      p.payment_date,
      p.method,
      p.reference_no || null,
      p.note || null,
      p.recorded_by,
    ],
  );
  return r.insertId;
};

// Is there already a pending/approved payment covering this period?
exports.findDuplicate = async ({ member_id, year, type, month }, db = pool) => {
  let sql = `SELECT id FROM payments WHERE member_id = ? AND period_year = ?
             AND status IN ('pending','approved')`;
  const params = [member_id, year];
  if (type === "monthly") {
    sql += " AND (payment_type = 'yearly' OR period_month = ?)";
    params.push(month);
  }
  const [rows] = await db.query(sql, params);
  return rows[0];
};

exports.list = async ({ status, member_id, year } = {}, db = pool) => {
  const where = [];
  const params = [];
  if (status) {
    where.push("p.status = ?");
    params.push(status);
  }
  if (member_id) {
    where.push("p.member_id = ?");
    params.push(member_id);
  }
  if (year) {
    where.push("p.period_year = ?");
    params.push(year);
  }

  const [rows] = await db.query(
    `SELECT p.*, m.full_name AS member_name,
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
    `SELECT id, payment_type, period_year, period_month, amount, payment_date,
            method, reference_no, status, reject_reason
     FROM payments WHERE member_id = ? ORDER BY period_year DESC, period_month DESC`,
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

// Returns true only if it was still pending (stops two people reviewing at once)
exports.review = async (id, { status, reviewer_id, reason }, db = pool) => {
  const [r] = await db.query(
    `UPDATE payments SET status = ?, reviewed_by = ?, reviewed_at = NOW(), reject_reason = ?
     WHERE id = ? AND status = 'pending'`,
    [status, reviewer_id, status === "rejected" ? reason : null, id],
  );
  return r.affectedRows > 0;
};

// Active members with no APPROVED payment covering that month
exports.unpaid = async (year, month, db = pool) => {
  const [rows] = await db.query(
    `SELECT m.id, m.full_name, m.phone
     FROM members m
     WHERE m.status = 'active'
       AND NOT EXISTS (
         SELECT 1 FROM payments p
         WHERE p.member_id = m.id AND p.status = 'approved' AND p.period_year = ?
           AND (p.payment_type = 'yearly' OR p.period_month = ?)
       )
     ORDER BY m.full_name`,
    [year, month],
  );
  return rows;
};
