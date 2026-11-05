const fs = require("fs");
const path = require("path");
const Project = require("../models/Project");
const { projectDir } = require("../middleware/upload");
const { logAction } = require("../utils/audit");

const STATUSES = ["planned", "ongoing", "completed"];
const dropFile = (name) =>
  name && fs.unlink(path.join(projectDir, path.basename(name)), () => {});
const yes = (v) => v === true || v === "true" || v === "1" || v === 1;

// Returns [error] or [null, cleanData]
const clean = (b) => {
  const title = String(b.title || "").trim();
  if (!title || title.length > 150)
    return ["Title is required (max 150 characters)"];
  const summary =
    String(b.summary || "")
      .trim()
      .slice(0, 300) || null;
  const description = String(b.description || "").trim() || null;
  const status = STATUSES.includes(b.status) ? b.status : "planned";
  return [
    null,
    { title, summary, description, status, is_published: yes(b.is_published) },
  ];
};

// PUBLIC: GET /api/projects
exports.list = async (req, res, next) => {
  try {
    res.json({ projects: await Project.listPublished() });
  } catch (err) {
    next(err);
  }
};

// SECRETARY (admin read-only): GET /api/projects/manage/all
exports.listAll = async (req, res, next) => {
  try {
    res.json({ projects: await Project.listAll() });
  } catch (err) {
    next(err);
  }
};

// SECRETARY: GET /api/projects/manage/:id  (full record for the edit form)
exports.getOne = async (req, res, next) => {
  try {
    const p = await Project.findById(Number(req.params.id));
    if (!p) return res.status(404).json({ message: "Project not found" });
    res.json({ project: p });
  } catch (err) {
    next(err);
  }
};

// SECRETARY: POST /api/projects  (multipart: image optional)
exports.create = async (req, res, next) => {
  try {
    const [err, data] = clean(req.body);
    if (err) {
      dropFile(req.file?.filename);
      return res.status(400).json({ message: err });
    }
    const id = await Project.create({
      ...data,
      image_path: req.file ? req.file.filename : null,
      created_by: req.user.id,
    });
    await logAction(req.user.id, "PROJECT_CREATED", "project", id);
    res.status(201).json({ id });
  } catch (e) {
    dropFile(req.file?.filename);
    next(e);
  }
};

// SECRETARY: PATCH /api/projects/:id  (multipart: new image optional)
exports.update = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [err, data] = clean(req.body);
    if (err) {
      dropFile(req.file?.filename);
      return res.status(400).json({ message: err });
    }

    const old = await Project.findById(id);
    if (!old) {
      dropFile(req.file?.filename);
      return res.status(404).json({ message: "Project not found" });
    }

    await Project.update(id, {
      ...data,
      image_path: req.file ? req.file.filename : null,
    });
    if (req.file) dropFile(old.image_path); // remove the replaced image
    await logAction(req.user.id, "PROJECT_UPDATED", "project", id);
    res.json({ message: "Project updated" });
  } catch (e) {
    dropFile(req.file?.filename);
    next(e);
  }
};

const setPublished = (published) => async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!(await Project.setPublished(id, published)))
      return res.status(404).json({ message: "Project not found" });
    await logAction(
      req.user.id,
      published ? "PROJECT_PUBLISHED" : "PROJECT_UNPUBLISHED",
      "project",
      id,
    );
    res.json({ message: published ? "Published" : "Moved back to draft" });
  } catch (err) {
    next(err);
  }
};
exports.publish = setPublished(true);
exports.unpublish = setPublished(false);

// SECRETARY: DELETE /api/projects/:id
exports.remove = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const p = await Project.findById(id);
    if (!p) return res.status(404).json({ message: "Project not found" });
    await Project.remove(id);
    dropFile(p.image_path);
    await logAction(req.user.id, "PROJECT_DELETED", "project", id);
    res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
};
