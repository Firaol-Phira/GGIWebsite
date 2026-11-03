const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const pool = require("../config/db");
const { logAction } = require("../utils/audit");

const ROLES = ["admin", "secretary", "finance", "member"];
const tempPassword = () => crypto.randomBytes(6).toString("base64url"); // 8 random chars

const countActiveAdmins = async () => {
  const [r] = await pool.query(
    "SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND is_active = 1",
  );
  return r[0].n;
};

// GET /api/users
exports.listUsers = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, member_id, full_name, email, role, is_active,
              must_change_password, last_login_at, created_at
       FROM users ORDER BY created_at DESC`,
    );
    res.json({ users: rows });
  } catch (err) {
    next(err);
  }
};

// POST /api/users  -> creates member record (unless member_id given) + login
exports.createUser = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { full_name, email, phone, joined_at, member_id } = req.body;
    const role = req.body.role || "member";

    if (!email || !ROLES.includes(role)) {
      return res
        .status(400)
        .json({ message: "Valid email and role are required" });
    }

    await conn.beginTransaction();

    let memberId = member_id || null;
    let name = full_name;

    if (memberId) {
      const [m] = await conn.query(
        "SELECT id, full_name FROM members WHERE id = ?",
        [memberId],
      );
      if (!m.length) {
        await conn.rollback();
        return res.status(404).json({ message: "Member not found" });
      }
      name = m[0].full_name;
    } else {
      if (!full_name) {
        await conn.rollback();
        return res.status(400).json({ message: "full_name is required" });
      }
      const [r] = await conn.query(
        "INSERT INTO members (full_name, phone, email, joined_at) VALUES (?, ?, ?, ?)",
        [full_name, phone || null, email, joined_at || null],
      );
      memberId = r.insertId;
    }

    const temp = tempPassword();
    const hash = await bcrypt.hash(temp, 12);
    const [u] = await conn.query(
      `INSERT INTO users (member_id, full_name, email, password_hash, role, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [memberId, name, email, hash, role, req.user.id],
    );

    await logAction(
      req.user.id,
      "USER_CREATED",
      "user",
      u.insertId,
      `role=${role}`,
      conn,
    );
    await conn.commit();

    // The temporary password is shown ONLY this once
    res.status(201).json({
      user: {
        id: u.insertId,
        member_id: memberId,
        full_name: name,
        email,
        role,
      },
      temporary_password: temp,
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// PATCH /api/users/:id/role
exports.updateRole = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { role } = req.body;
    if (!ROLES.includes(role))
      return res.status(400).json({ message: "Invalid role" });

    const [rows] = await pool.query(
      "SELECT id, role, is_active FROM users WHERE id = ?",
      [id],
    );
    const target = rows[0];
    if (!target) return res.status(404).json({ message: "User not found" });

    if (
      target.role === "admin" &&
      role !== "admin" &&
      target.is_active &&
      (await countActiveAdmins()) <= 1
    ) {
      return res.status(400).json({ message: "Cannot remove the last admin" });
    }

    await pool.query("UPDATE users SET role = ? WHERE id = ?", [role, id]);
    await logAction(
      req.user.id,
      "ROLE_CHANGED",
      "user",
      id,
      `${target.role} -> ${role}`,
    );
    res.json({ message: "Role updated" });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/users/:id/status   body: { "is_active": true/false }
exports.updateStatus = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const active = !!req.body.is_active;

    if (id === req.user.id && !active) {
      return res
        .status(400)
        .json({ message: "You cannot deactivate yourself" });
    }

    const [rows] = await pool.query(
      "SELECT id, role, is_active FROM users WHERE id = ?",
      [id],
    );
    const target = rows[0];
    if (!target) return res.status(404).json({ message: "User not found" });

    if (
      !active &&
      target.role === "admin" &&
      target.is_active &&
      (await countActiveAdmins()) <= 1
    ) {
      return res
        .status(400)
        .json({ message: "Cannot deactivate the last admin" });
    }

    await pool.query("UPDATE users SET is_active = ? WHERE id = ?", [
      active ? 1 : 0,
      id,
    ]);
    await logAction(
      req.user.id,
      active ? "USER_ACTIVATED" : "USER_DEACTIVATED",
      "user",
      id,
    );
    res.json({ message: active ? "User activated" : "User deactivated" });
  } catch (err) {
    next(err);
  }
};

// POST /api/users/:id/reset-password  -> new temporary password
exports.resetPassword = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [rows] = await pool.query("SELECT id FROM users WHERE id = ?", [id]);
    if (!rows.length)
      return res.status(404).json({ message: "User not found" });

    const temp = tempPassword();
    const hash = await bcrypt.hash(temp, 12);
    await pool.query(
      "UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?",
      [hash, id],
    );
    await logAction(req.user.id, "PASSWORD_RESET", "user", id);
    res.json({ temporary_password: temp });
  } catch (err) {
    next(err);
  }
};
