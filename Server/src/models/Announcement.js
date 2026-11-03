const pool = require("../config/db");

exports.listPublished = async (limit, offset, db = pool) => {
  const [rows] = await db.query(
    `SELECT id, title, slug, cover_image, published_at, LEFT(content, 200) AS excerpt
     FROM announcements WHERE status = 'published'
     ORDER BY published_at DESC LIMIT ? OFFSET ?`,
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
    `SELECT a.id, a.title, a.slug, a.content, a.cover_image, a.published_at,
            u.full_name AS author
     FROM announcements a JOIN users u ON u.id = a.author_id
     WHERE a.slug = ? AND a.status = 'published'`,
    [slug],
  );
  return rows[0];
};

exports.listAll = async (status, db = pool) => {
  const [rows] = await db.query(
    `SELECT a.id, a.title, a.slug, a.status, a.cover_image, a.published_at,
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

exports.create = async ({ title, slug, content, author_id }, db = pool) => {
  const [r] = await db.query(
    "INSERT INTO announcements (title, slug, content, author_id) VALUES (?, ?, ?, ?)",
    [title, slug, content, author_id],
  );
  return r.insertId;
};

exports.update = async (id, { title, content }, db = pool) => {
  const [r] = await db.query(
    `UPDATE announcements SET title = COALESCE(?, title), content = COALESCE(?, content)
     WHERE id = ?`,
    [title ?? null, content ?? null, id],
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
