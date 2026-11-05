const pool = require("../config/db");

exports.listPublished = async (limit, offset, db = pool) => {
  const [rows] = await db.query(
    `SELECT a.id, a.title, a.slug, a.content, a.category, a.meeting_link, a.is_pinned,
            a.published_at, u.full_name AS author
     FROM announcements a JOIN users u ON u.id = a.author_id
     WHERE a.status = 'published'
     ORDER BY a.is_pinned DESC, a.published_at DESC LIMIT ? OFFSET ?`,
    [limit, offset],
  );
  return rows;
};

exports.countPublished = async (db = pool) => {
  const [[row]] = await db.query(
    "SELECT COUNT(*) AS total FROM announcements WHERE status = 'published'",
  );
  return row.total;
};

exports.findPublishedBySlug = async (slug, db = pool) => {
  const [rows] = await db.query(
    `SELECT a.id, a.title, a.slug, a.content, a.category, a.meeting_link, a.is_pinned,
            a.published_at, u.full_name AS author
     FROM announcements a JOIN users u ON u.id = a.author_id
     WHERE a.slug = ? AND a.status = 'published'`,
    [slug],
  );
  return rows[0];
};

exports.listAll = async (status, db = pool) => {
  const [rows] = await db.query(
    `SELECT a.id, a.title, a.slug, a.status, a.category, a.is_pinned, a.published_at,
            a.created_at, u.full_name AS author
     FROM announcements a JOIN users u ON u.id = a.author_id
     ${status ? "WHERE a.status = ?" : ""}
     ORDER BY a.created_at DESC`,
    status ? [status] : [],
  );
  return rows;
};

exports.findById = async (id, db = pool) => {
  const [rows] = await db.query("SELECT * FROM announcements WHERE id = ?", [
    id,
  ]);
  return rows[0];
};

exports.create = async (a, db = pool) => {
  const [r] = await db.query(
    `INSERT INTO announcements (title, slug, content, category, meeting_link, is_pinned, author_id)
     VALUES (?,?,?,?,?,?,?)`,
    [
      a.title,
      a.slug,
      a.content,
      a.category,
      a.meeting_link,
      a.is_pinned ? 1 : 0,
      a.author_id,
    ],
  );
  return r.insertId;
};

exports.update = async (id, a, db = pool) => {
  const [r] = await db.query(
    `UPDATE announcements
     SET title = ?, content = ?, category = ?, meeting_link = ?, is_pinned = ?
     WHERE id = ?`,
    [a.title, a.content, a.category, a.meeting_link, a.is_pinned ? 1 : 0, id],
  );
  return r.affectedRows > 0;
};

exports.setStatus = async (id, status, db = pool) => {
  const [r] = await db.query(
    `UPDATE announcements SET status = ?,
       published_at = IF(? = 'published', COALESCE(published_at, NOW()), published_at)
     WHERE id = ?`,
    [status, status, id],
  );
  return r.affectedRows > 0;
};

exports.remove = async (id, db = pool) => {
  const [r] = await db.query("DELETE FROM announcements WHERE id = ?", [id]);
  return r.affectedRows > 0;
};
