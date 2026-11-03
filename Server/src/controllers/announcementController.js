const pool = require("../config/db");
const { logAction } = require("../utils/audit");

// Builds a URL-friendly slug. Amharic titles give an empty slug, so a unique suffix is always added.
const makeSlug = (title) => {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "news"}-${Date.now().toString(36)}`;
};

// ---------- PUBLIC (no login) ----------

// GET /api/announcements?page=1&limit=9
exports.listPublished = async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 9, 50);
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT id, title, slug, cover_image, published_at,
              LEFT(content, 200) AS excerpt
       FROM announcements WHERE status = 'published'
       ORDER BY published_at DESC LIMIT ? OFFSET ?`,
      [limit, offset],
    );
    const [[{ total }]] = await pool.query(
      "SELECT COUNT(*) AS total FROM announcements WHERE status = 'published'",
    );
    res.json({ announcements: rows, page, limit, total });
  } catch (err) {
    next(err);
  }
};

// GET /api/announcements/:slug
exports.getPublished = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.title, a.slug, a.content, a.cover_image, a.published_at,
              u.full_name AS author
       FROM announcements a JOIN users u ON u.id = a.author_id
       WHERE a.slug = ? AND a.status = 'published'`,
      [req.params.slug],
    );
    if (!rows.length)
      return res.status(404).json({ message: "Announcement not found" });
    res.json({ announcement: rows[0] });
  } catch (err) {
    next(err);
  }
};

// ---------- SECRETARY / ADMIN ----------

// GET /api/announcements/manage/all?status=draft
exports.listAll = async (req, res, next) => {
  try {
    const { status } = req.query;
    const [rows] = await pool.query(
      `SELECT a.id, a.title, a.slug, a.status, a.cover_image, a.published_at,
              a.created_at, u.full_name AS author
       FROM announcements a JOIN users u ON u.id = a.author_id
       ${status ? "WHERE a.status = ?" : ""}
       ORDER BY a.created_at DESC`,
      status ? [status] : [],
    );
    res.json({ announcements: rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/announcements/manage/:id  (full record for the edit form)
exports.getOne = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM announcements WHERE id = ?",
      [req.params.id],
    );
    if (!rows.length)
      return res.status(404).json({ message: "Announcement not found" });
    res.json({ announcement: rows[0] });
  } catch (err) {
    next(err);
  }
};

// POST /api/announcements   (saved as draft)
exports.create = async (req, res, next) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res
        .status(400)
        .json({ message: "title and content are required" });
    }
    const [r] = await pool.query(
      "INSERT INTO announcements (title, slug, content, author_id) VALUES (?, ?, ?, ?)",
      [title, makeSlug(title), content, req.user.id],
    );
    await logAction(
      req.user.id,
      "ANNOUNCEMENT_CREATED",
      "announcement",
      r.insertId,
    );
    res.status(201).json({ id: r.insertId, status: "draft" });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/announcements/:id
exports.update = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { title, content } = req.body;
    const [r] = await pool.query(
      `UPDATE announcements SET title = COALESCE(?, title), content = COALESCE(?, content)
       WHERE id = ?`,
      [title ?? null, content ?? null, id],
    );
    if (!r.affectedRows)
      return res.status(404).json({ message: "Announcement not found" });
    await logAction(req.user.id, "ANNOUNCEMENT_UPDATED", "announcement", id);
    res.json({ message: "Updated" });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/announcements/:id/publish   and   /unpublish
const setStatus = (status) => async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [r] = await pool.query(
      `UPDATE announcements SET status = ?,
         published_at = IF(? = 'published', COALESCE(published_at, NOW()), published_at)
       WHERE id = ?`,
      [status, status, id],
    );
    if (!r.affectedRows)
      return res.status(404).json({ message: "Announcement not found" });
    await logAction(
      req.user.id,
      status === "published"
        ? "ANNOUNCEMENT_PUBLISHED"
        : "ANNOUNCEMENT_UNPUBLISHED",
      "announcement",
      id,
    );
    res.json({ message: `Announcement ${status}` });
  } catch (err) {
    next(err);
  }
};
exports.publish = setStatus("published");
exports.unpublish = setStatus("draft");

// DELETE /api/announcements/:id
exports.remove = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [r] = await pool.query("DELETE FROM announcements WHERE id = ?", [
      id,
    ]);
    if (!r.affectedRows)
      return res.status(404).json({ message: "Announcement not found" });
    await logAction(req.user.id, "ANNOUNCEMENT_DELETED", "announcement", id);
    res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
};
