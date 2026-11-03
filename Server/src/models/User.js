const pool = require("../config/db");

exports.findByEmail = async (email, db = pool) => {
  const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
  return rows[0];
};

// Used by the protect middleware
exports.findAuthById = async (id, db = pool) => {
  const [rows] = await db.query(
    `SELECT id, member_id, full_name, email, role, is_active, must_change_password
     FROM users WHERE id = ?`,
    [id],
  );
  return rows[0];
};

exports.findRoleById = async (id, db = pool) => {
  const [rows] = await db.query(
    "SELECT id, role, is_active FROM users WHERE id = ?",
    [id],
  );
  return rows[0];
};

exports.getPasswordHash = async (id, db = pool) => {
  const [rows] = await db.query(
    "SELECT password_hash FROM users WHERE id = ?",
    [id],
  );
  return rows[0]?.password_hash;
};

exports.listAll = async (db = pool) => {
  const [rows] = await db.query(
    `SELECT id, member_id, full_name, email, role, is_active,
            must_change_password, last_login_at, created_at
     FROM users ORDER BY created_at DESC`,
  );
  return rows;
};

exports.create = async (
  { member_id, full_name, email, password_hash, role, created_by },
  db = pool,
) => {
  const [r] = await db.query(
    `INSERT INTO users (member_id, full_name, email, password_hash, role, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [member_id, full_name, email, password_hash, role, created_by],
  );
  return r.insertId;
};

exports.touchLastLogin = (id, db = pool) =>
  db.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [id]);

exports.setPassword = (id, hash, mustChange, db = pool) =>
  db.query(
    "UPDATE users SET password_hash = ?, must_change_password = ? WHERE id = ?",
    [hash, mustChange ? 1 : 0, id],
  );

exports.setRole = (id, role, db = pool) =>
  db.query("UPDATE users SET role = ? WHERE id = ?", [role, id]);

exports.setActive = (id, active, db = pool) =>
  db.query("UPDATE users SET is_active = ? WHERE id = ?", [active ? 1 : 0, id]);

exports.countActiveAdmins = async (db = pool) => {
  const [r] = await db.query(
    "SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND is_active = 1",
  );
  return r[0].n;
};
