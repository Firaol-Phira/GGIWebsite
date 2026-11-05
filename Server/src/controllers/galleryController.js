const fs = require("fs");
const path = require("path");
const Gallery = require("../models/GalleryItem");
const { galleryDir } = require("../middleware/upload");
const { logAction } = require("../utils/audit");

const dropFile = (name) =>
  fs.unlink(path.join(galleryDir, path.basename(name)), () => {});
const cleanCaption = (c) =>
  String(c || "")
    .trim()
    .slice(0, 200) || null;

// PUBLIC: GET /api/gallery
exports.list = async (req, res, next) => {
  try {
    res.json({ items: await Gallery.list() });
  } catch (err) {
    next(err);
  }
};

// SECRETARY: POST /api/gallery  (multipart: photos[], caption)
exports.upload = async (req, res, next) => {
  const files = req.files || [];
  try {
    if (!files.length)
      return res.status(400).json({ message: "Choose at least one photo" });
    const caption = cleanCaption(req.body.caption);
    for (const f of files) {
      const id = await Gallery.create({
        image_path: f.filename,
        caption,
        uploaded_by: req.user.id,
      });
      await logAction(req.user.id, "GALLERY_UPLOADED", "gallery_item", id);
    }
    res.status(201).json({ message: `${files.length} photo(s) uploaded` });
  } catch (err) {
    files.forEach((f) => dropFile(f.filename)); // don't keep files if saving failed
    next(err);
  }
};

// SECRETARY: PATCH /api/gallery/:id  { caption }
exports.update = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!(await Gallery.updateCaption(id, cleanCaption(req.body.caption))))
      return res.status(404).json({ message: "Photo not found" });
    await logAction(req.user.id, "GALLERY_UPDATED", "gallery_item", id);
    res.json({ message: "Caption updated" });
  } catch (err) {
    next(err);
  }
};

// SECRETARY: DELETE /api/gallery/:id
exports.remove = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const item = await Gallery.findById(id);
    if (!item) return res.status(404).json({ message: "Photo not found" });
    await Gallery.remove(id);
    dropFile(item.image_path);
    await logAction(req.user.id, "GALLERY_DELETED", "gallery_item", id);
    res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
};
