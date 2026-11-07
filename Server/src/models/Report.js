const pool = require("../config/db");

const AMOUNTS = `SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) AS total,
                 SUM(status = 'approved') AS count,
                 SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS pending`;

// Monthly payments grouped by the month they pay for
exports.monthly = async (year, db = pool) => {
  const [rows] = await db.query(
    `SELECT period_month AS k, ${AMOUNTS} FROM payments
     WHERE payment_type = 'monthly' AND period_year = ? AND status IN ('approved','pending')
     GROUP BY period_month`,
    [year],
  );
  return rows;
};

// Yearly payments grouped by quarter
exports.quarterly = async (year, db = pool) => {
  const [rows] = await db.query(
    `SELECT period_quarter AS k, ${AMOUNTS} FROM payments
     WHERE payment_type = 'yearly' AND period_year = ? AND status IN ('approved','pending')
     GROUP BY period_quarter`,
    [year],
  );
  return rows;
};

// Other / penalty grouped by the month they were paid
exports.otherByMonth = async (year, db = pool) => {
  const [rows] = await db.query(
    `SELECT MONTH(payment_date) AS k, ${AMOUNTS} FROM payments
     WHERE payment_type = 'other' AND period_year = ? AND status IN ('approved','pending')
     GROUP BY MONTH(payment_date)`,
    [year],
  );
  return rows;
};

exports.otherItems = async (year, db = pool) => {
  const [rows] = await db.query(
    `SELECT p.id, m.full_name AS member_name, p.reason, p.amount, p.payment_date, p.method, p.reference_no
     FROM payments p JOIN members m ON m.id = p.member_id
     WHERE p.payment_type = 'other' AND p.status = 'approved' AND p.period_year = ?
     ORDER BY p.payment_date DESC, p.id DESC LIMIT 300`,
    [year],
  );
  return rows;
};

// Everything ever approved, across all years
exports.allTime = async (db = pool) => {
  const [rows] = await db.query(
    `SELECT payment_type AS type, SUM(amount) AS total, COUNT(*) AS count
     FROM payments WHERE status = 'approved' GROUP BY payment_type`,
  );
  return rows;
};
