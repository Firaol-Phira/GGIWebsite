const Announcement = require("../models/Announcement");
const { logAction } = require("../utils/audit");

// Amharic titles give an empty slug, so a unique suffix is always added
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
exports.listPublished = async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 9, 50);
    const [announcements, total] = await Promise.all([
      Announcement.listPublished(limit, (page - 1) * limit),
      Announcement.countPublished(),
    ]);
    res.json({ announcements, page, limit, total });
  } catch (err) {
    next(err);
  }
};

exports.getPublished = async (req, res, next) => {
  try {
    const a = await Announcement.findPublishedBySlug(req.params.slug);
    if (!a) return res.status(404).json({ message: "Announcement not found" });
    res.json({ announcement: a });
  } catch (err) {
    next(err);
  }
};

// ---------- SECRETARY / ADMIN ----------
exports.listAll = async (req, res, next) => {
  try {
    res.json({ announcements: await Announcement.listAll(req.query.status) });
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const a = await Announcement.findById(req.params.id);
    if (!a) return res.status(404).json({ message: "Announcement not found" });
    res.json({ announcement: a });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res
        .status(400)
        .json({ message: "title and content are required" });
    }
    const id = await Announcement.create({
      title,
      slug: makeSlug(title),
      content,
      author_id: req.user.id,
    });
    await logAction(req.user.id, "ANNOUNCEMENT_CREATED", "announcement", id);
    res.status(201).json({ id, status: "draft" });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const found = await Announcement.update(id, req.body);
    if (!found)
      return res.status(404).json({ message: "Announcement not found" });
    await logAction(req.user.id, "ANNOUNCEMENT_UPDATED", "announcement", id);
    res.json({ message: "Updated" });
  } catch (err) {
    next(err);
  }
};

const setStatus = (status) => async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const found = await Announcement.setStatus(id, status);
    if (!found)
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

exports.remove = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const found = await Announcement.remove(id);
    if (!found)
      return res.status(404).json({ message: "Announcement not found" });
    await logAction(req.user.id, "ANNOUNCEMENT_DELETED", "announcement", id);
    res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
};
