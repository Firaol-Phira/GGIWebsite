require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("../src/config/db");

(async () => {
  try {
    const email = process.env.ADMIN_EMAIL;
    const [exists] = await pool.query("SELECT id FROM users WHERE email = ?", [
      email,
    ]);
    if (exists.length) {
      console.log("Admin already exists:", email);
      process.exit(0);
    }

    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
    await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, must_change_password)
       VALUES (?, ?, ?, 'admin', 0)`,
      [process.env.ADMIN_NAME, email, hash],
    );
    console.log("Admin created:", email);
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
})();
