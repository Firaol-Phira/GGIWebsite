const pool = require("../config/db");

// Public: published only. Ongoing first, then planned, then completed.
exports.listPublished = async (db = pool) => {
  const [rows] = await db.query(
    `SELECT id, title, summary, description, image_path, status, created_at
     FROM projects WHERE is_published = 1
     ORDER BY FIELD(status,'ongoing','planned','completed'), created_at DESC`,
  );
  return rows;
};

exports.listAll = async (db = pool) => {
  const [rows] = await db.query(
    "SELECT id, title, summary, image_path, status, is_published, created_at FROM projects ORDER BY created_at DESC",
  );
  return rows;
};

exports.findById = async (id, db = pool) => {
  const [rows] = await db.query("SELECT * FROM projects WHERE id = ?", [id]);
  return rows[0];
};

exports.create = async (p, db = pool) => {
  const [r] = await db.query(
    `INSERT INTO projects (title, summary, description, image_path, status, is_published, created_by)
     VALUES (?,?,?,?,?,?,?)`,
    [
      p.title,
      p.summary,
      p.description,
      p.image_path,
      p.status,
      p.is_published ? 1 : 0,
      p.created_by,
    ],
  );
  return r.insertId;
};

// image_path stays unchanged when no new image is given
exports.update = async (id, p, db = pool) => {
  const [r] = await db.query(
    `UPDATE projects SET title = ?, summary = ?, description = ?, status = ?,
       is_published = ?, image_path = COALESCE(?, image_path)
     WHERE id = ?`,
    [
      p.title,
      p.summary,
      p.description,
      p.status,
      p.is_published ? 1 : 0,
      p.image_path || null,
      id,
    ],
  );
  return r.affectedRows > 0;
};

exports.setPublished = async (id, published, db = pool) => {
  const [r] = await db.query(
    "UPDATE projects SET is_published = ? WHERE id = ?",
    [published ? 1 : 0, id],
  );
  return r.affectedRows > 0;
};

exports.remove = async (id, db = pool) => {
  const [r] = await db.query("DELETE FROM projects WHERE id = ?", [id]);
  return r.affectedRows > 0;
};
