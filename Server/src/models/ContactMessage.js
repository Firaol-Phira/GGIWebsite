const pool = require("../config/db");

exports.create = async (m, db = pool) => {
  const [r] = await db.query(
    "INSERT INTO contact_messages (name, email, subject, user_type, message) VALUES (?,?,?,?,?)",
    [m.name, m.email, m.subject, m.user_type, m.message],
  );
  return r.insertId;
};

// status: "new" (unread), "replied", or anything else for all
exports.list = async (status, db = pool) => {
  const where =
    status === "new"
      ? "WHERE m.is_read = 0"
      : status === "replied"
        ? "WHERE m.replied_at IS NOT NULL"
        : "";
  const [rows] = await db.query(
    `SELECT m.*, u.full_name AS replied_by_name
     FROM contact_messages m LEFT JOIN users u ON u.id = m.replied_by
     ${where} ORDER BY m.created_at DESC`,
  );
  return rows;
};

exports.countUnread = async (db = pool) => {
  const [[r]] = await db.query(
    "SELECT COUNT(*) AS n FROM contact_messages WHERE is_read = 0",
  );
  return r.n;
};

exports.markRead = async (id, db = pool) => {
  const [r] = await db.query(
    "UPDATE contact_messages SET is_read = 1 WHERE id = ?",
    [id],
  );
  return r.affectedRows > 0;
};

exports.markReplied = async (id, userId, db = pool) => {
  const [r] = await db.query(
    "UPDATE contact_messages SET is_read = 1, replied_at = NOW(), replied_by = ? WHERE id = ?",
    [userId, id],
  );
  return r.affectedRows > 0;
};

exports.remove = async (id, db = pool) => {
  const [r] = await db.query("DELETE FROM contact_messages WHERE id = ?", [id]);
  return r.affectedRows > 0;
};
