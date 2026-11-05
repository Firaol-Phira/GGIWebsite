const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const EXT = [".jpg", ".jpeg", ".png", ".webp"];
const MIME = ["image/jpeg", "image/png", "image/webp"];

const folder = (name) => {
  const dir = path.resolve(__dirname, "../../uploads", name);
  fs.mkdirSync(dir, { recursive: true });
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) =>
      cb(
        null,
        crypto.randomBytes(12).toString("hex") +
          path.extname(file.originalname).toLowerCase(),
      ),
  });
  return { dir, storage };
};

const fileFilter = (req, file, cb) => {
  if (
    EXT.includes(path.extname(file.originalname).toLowerCase()) &&
    MIME.includes(file.mimetype)
  )
    return cb(null, true);
  const err = new Error("Only JPG, PNG or WebP photos are allowed");
  err.code = "BAD_FILE";
  cb(err);
};

const gallery = folder("gallery");
const projects = folder("projects");

exports.galleryDir = gallery.dir;
exports.projectDir = projects.dir;

exports.galleryUpload = multer({
  storage: gallery.storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
}).array("photos", 10);

exports.projectUpload = multer({
  storage: projects.storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
}).single("image");
