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

exports.upsert = (
  { year, monthly_amount, yearly_amount, updated_by },
  db = pool,
) =>
  db.query(
    `INSERT INTO contribution_settings (year, monthly_amount, yearly_amount, updated_by)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE monthly_amount = VALUES(monthly_amount),
       yearly_amount = VALUES(yearly_amount), updated_by = VALUES(updated_by)`,
    [year, monthly_amount, yearly_amount, updated_by],
  );
