const pool = require("../config/db");

exports.list = async (db = pool) => {
  const [rows] = await db.query(
    "SELECT id, image_path, caption, created_at FROM gallery_items ORDER BY created_at DESC, id DESC",
  );
  return rows;
};

exports.findById = async (id, db = pool) => {
  const [rows] = await db.query("SELECT * FROM gallery_items WHERE id = ?", [
    id,
  ]);
  return rows[0];
};

exports.create = async ({ image_path, caption, uploaded_by }, db = pool) => {
  const [r] = await db.query(
    "INSERT INTO gallery_items (image_path, caption, uploaded_by) VALUES (?,?,?)",
    [image_path, caption, uploaded_by],
  );
  return r.insertId;
};

exports.updateCaption = async (id, caption, db = pool) => {
  const [r] = await db.query(
    "UPDATE gallery_items SET caption = ? WHERE id = ?",
    [caption, id],
  );
  return r.affectedRows > 0;
};

exports.remove = async (id, db = pool) => {
  const [r] = await db.query("DELETE FROM gallery_items WHERE id = ?", [id]);
  return r.affectedRows > 0;
};
