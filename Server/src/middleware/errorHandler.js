module.exports = (err, req, res, next) => {
  if (err.type === "entity.parse.failed")
    return res.status(400).json({ message: "Invalid JSON in request body" });
  if (err.code === "LIMIT_FILE_SIZE")
    return res.status(400).json({ message: "Each photo must be under 5 MB" });
  if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE")
    return res
      .status(400)
      .json({ message: "You can upload up to 10 photos at a time" });
  if (err.code === "BAD_FILE")
    return res.status(400).json({ message: err.message });
  if (err.code === "ER_DUP_ENTRY")
    return res.status(409).json({ message: "That email already exists" });
  console.error(err);
  res.status(500).json({ message: "Server error" });
};
