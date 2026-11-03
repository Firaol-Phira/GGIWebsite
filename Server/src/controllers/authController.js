const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    const user = rows[0];

    // Same message for both cases, so attackers can't tell which emails exist
    const ok = user && (await bcrypt.compare(password, user.password_hash));
    if (!ok)
      return res.status(401).json({ message: "Invalid email or password" });

    if (!user.is_active) {
      return res
        .status(403)
        .json({ message: "This account is disabled. Contact the admin." });
    }

    await pool.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [
      user.id,
    ]);

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" },
    );

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        must_change_password: !!user.must_change_password,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.me = (req, res) => {
  res.json({ user: req.user });
};
exports.changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ message: "Both passwords are required" });
    }
    if (new_password.length < 8) {
      return res
        .status(400)
        .json({ message: "New password must be at least 8 characters" });
    }

    const [rows] = await pool.query(
      "SELECT password_hash FROM users WHERE id = ?",
      [req.user.id],
    );
    const ok = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!ok)
      return res.status(401).json({ message: "Current password is wrong" });

    const hash = await bcrypt.hash(new_password, 12);
    await pool.query(
      "UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?",
      [hash, req.user.id],
    );
    res.json({ message: "Password changed" });
  } catch (err) {
    next(err);
  }
};