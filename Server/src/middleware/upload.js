const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const dir = path.resolve(__dirname, "../../uploads/gallery");
fs.mkdirSync(dir, { recursive: true });

const EXT = [".jpg", ".jpeg", ".png", ".webp"];
const MIME = ["image/jpeg", "image/png", "image/webp"];

exports.galleryDir = dir;

exports.galleryUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) =>
      cb(
        null,
        crypto.randomBytes(12).toString("hex") +
          path.extname(file.originalname).toLowerCase(),
      ),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    if (
      EXT.includes(path.extname(file.originalname).toLowerCase()) &&
      MIME.includes(file.mimetype)
    )
      return cb(null, true);
    const err = new Error("Only JPG, PNG or WebP photos are allowed");
    err.code = "BAD_FILE";
    cb(err);
  },
}).array("photos", 10);
