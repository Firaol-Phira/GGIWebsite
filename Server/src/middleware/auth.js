const jwt = require("jsonwebtoken");
const pool = require("../config/db");

// Checks the token and loads the user
exports.protect = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Please log in" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.query(
      `SELECT id, member_id, full_name, email, role, is_active, must_change_password
       FROM users WHERE id = ?`,
      [payload.id],
    );
    const user = rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({ message: "Account not available" });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Allows only certain roles, e.g. authorizeRoles('admin')
exports.authorizeRoles =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission" });
    }
    next();
  };
