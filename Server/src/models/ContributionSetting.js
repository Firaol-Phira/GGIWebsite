const pool = require("../config/db");

exports.list = async (db = pool) => {
  const [rows] = await db.query(
    "SELECT * FROM contribution_settings ORDER BY year DESC",
  );
  return rows;
};

exports.findByYear = async (year, db = pool) => {
  const [rows] = await db.query(
    "SELECT * FROM contribution_settings WHERE year = ?",
    [year],
  );
  return rows[0];
};

exports.upsert = (s, db = pool) =>
  db.query(
    `INSERT INTO contribution_settings
       (year, monthly_amount, yearly_amount, q1_due, q2_due, q3_due, q4_due, updated_by)
     VALUES (?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE monthly_amount = VALUES(monthly_amount),
       yearly_amount = VALUES(yearly_amount), q1_due = VALUES(q1_due), q2_due = VALUES(q2_due),
       q3_due = VALUES(q3_due), q4_due = VALUES(q4_due), updated_by = VALUES(updated_by)`,
    [
      s.year,
      s.monthly_amount,
      s.yearly_amount,
      s.q1_due,
      s.q2_due,
      s.q3_due,
      s.q4_due,
      s.updated_by,
    ],
  );
