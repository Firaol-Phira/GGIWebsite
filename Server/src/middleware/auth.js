const jwt = require("jsonwebtoken");
const pool = require("../config/db");

// Routes a user with a temporary password may still use
const ALLOWED_WHEN_PASSWORD_TEMP = [
  "/api/auth/me",
  "/api/auth/change-password",
];

// Checks the token and loads the user
exports.protect = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Please log in" });

  // 1. Verify the token
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  // 2. Load the user (a database problem here is a server error, not a 401)
  try {
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

    // 3. Temporary password: block everything except the allowed routes
    const path = req.originalUrl.split("?")[0];
    if (
      user.must_change_password &&
      !ALLOWED_WHEN_PASSWORD_TEMP.includes(path)
    ) {
      return res.status(403).json({
        message: "You must change your password first",
        code: "PASSWORD_CHANGE_REQUIRED",
      });
    }

    next();
  } catch (err) {
    next(err);
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
