const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const dir = path.resolve(__dirname, "../../uploads/receipts");
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

const ALLOWED = [".jpg", ".jpeg", ".png", ".pdf"];

exports.receiptUpload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED.includes(path.extname(file.originalname).toLowerCase()))
      return cb(null, true);
    const err = new Error("Receipt must be a JPG, PNG or PDF");
    err.code = "BAD_FILE";
    cb(err);
  },
}).single("receipt");
