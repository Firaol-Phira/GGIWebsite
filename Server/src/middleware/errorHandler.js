module.exports = (err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON in request body" });
  }
  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ message: "That email already exists" });
  }
  console.error(err);
  res.status(500).json({ message: "Server error" });
};
