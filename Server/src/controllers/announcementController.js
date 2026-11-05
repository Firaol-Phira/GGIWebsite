const Announcement = require("../models/Announcement");
const { logAction } = require("../utils/audit");

const CATEGORIES = [
  "general",
  "monthly_rate",
  "yearly_rate",
  "committee_meeting",
  "general_meeting",
];

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

// Returns [error] or [null, cleanData]
const clean = (b) => {
  const title = (b.title || "").trim();
  const content = (b.content || "").trim();
  if (!title || !content) return ["title and content are required"];
  const category = CATEGORIES.includes(b.category) ? b.category : "general";
  const meeting_link = (b.meeting_link || "").trim() || null;
  if (meeting_link) {
    try {
      if (new URL(meeting_link).protocol !== "https:")
        return ["The meeting link must start with https://"];
    } catch {
      return ["The meeting link is not valid"];
    }
  }
  return [
    null,
    { title, content, category, meeting_link, is_pinned: !!b.is_pinned },
  ];
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
    const [err, data] = clean(req.body);
    if (err) return res.status(400).json({ message: err });
    const id = await Announcement.create({
      ...data,
      slug: makeSlug(data.title),
      author_id: req.user.id,
    });
    await logAction(req.user.id, "ANNOUNCEMENT_CREATED", "announcement", id);
    res.status(201).json({ id, status: "draft" });
  } catch (e) {
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [err, data] = clean(req.body);
    if (err) return res.status(400).json({ message: err });
    if (!(await Announcement.update(id, data)))
      return res.status(404).json({ message: "Announcement not found" });
    await logAction(req.user.id, "ANNOUNCEMENT_UPDATED", "announcement", id);
    res.json({ message: "Updated" });
  } catch (e) {
    next(e);
  }
};

const setStatus = (status) => async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!(await Announcement.setStatus(id, status)))
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
    if (!(await Announcement.remove(id)))
      return res.status(404).json({ message: "Announcement not found" });
    await logAction(req.user.id, "ANNOUNCEMENT_DELETED", "announcement", id);
    res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
};
