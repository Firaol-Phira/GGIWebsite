const pool = require("../config/db");

exports.list = async ({ q, status } = {}, db = pool) => {
  const where = [];
  const params = [];
  if (status) {
    where.push("m.status = ?");
    params.push(status);
  }
  if (q) {
    where.push("(m.full_name LIKE ? OR m.phone LIKE ? OR m.email LIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const [rows] = await db.query(
    `SELECT m.*, u.id AS user_id, u.role, u.is_active AS login_active
     FROM members m LEFT JOIN users u ON u.member_id = m.id
     ${where.length ? "WHERE " + where.join(" AND ") : ""}
     ORDER BY m.full_name`,
    params,
  );
  return rows;
};

exports.findById = async (id, db = pool) => {
  const [rows] = await db.query(
    "SELECT id, full_name, status FROM members WHERE id = ?",
    [id],
  );
  return rows[0];
};

exports.create = async ({ full_name, phone, email, joined_at }, db = pool) => {
  const [r] = await db.query(
    "INSERT INTO members (full_name, phone, email, joined_at) VALUES (?, ?, ?, ?)",
    [full_name, phone || null, email || null, joined_at || null],
  );
  return r.insertId;
};

// Returns true if the member existed
exports.update = async (
  id,
  { full_name, phone, email, joined_at, status },
  db = pool,
) => {
  const [r] = await db.query(
    `UPDATE members SET
       full_name = COALESCE(?, full_name),
       phone = COALESCE(?, phone),
       email = COALESCE(?, email),
       joined_at = COALESCE(?, joined_at),
       status = COALESCE(?, status)
     WHERE id = ?`,
    [
      full_name ?? null,
      phone ?? null,
      email ?? null,
      joined_at ?? null,
      status ?? null,
      id,
    ],
  );
  return r.affectedRows > 0;
};
