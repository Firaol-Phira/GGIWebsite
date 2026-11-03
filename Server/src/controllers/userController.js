const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const pool = require("../config/db");
const User = require("../models/User");
const Member = require("../models/Member");
const { logAction } = require("../utils/audit");

const ROLES = ["admin", "secretary", "finance", "member"];
const tempPassword = () => crypto.randomBytes(6).toString("base64url");

// GET /api/users
exports.listUsers = async (req, res, next) => {
  try {
    res.json({ users: await User.listAll() });
  } catch (err) {
    next(err);
  }
};

// POST /api/users -> member record (unless member_id given) + login, in one transaction
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
      const m = await Member.findById(memberId, conn);
      if (!m) {
        await conn.rollback();
        return res.status(404).json({ message: "Member not found" });
      }
      name = m.full_name;
    } else {
      if (!full_name) {
        await conn.rollback();
        return res.status(400).json({ message: "full_name is required" });
      }
      memberId = await Member.create(
        { full_name, phone, email, joined_at },
        conn,
      );
    }

    const temp = tempPassword();
    const hash = await bcrypt.hash(temp, 12);
    const userId = await User.create(
      {
        member_id: memberId,
        full_name: name,
        email,
        password_hash: hash,
        role,
        created_by: req.user.id,
      },
      conn,
    );

    await logAction(
      req.user.id,
      "USER_CREATED",
      "user",
      userId,
      `role=${role}`,
      conn,
    );
    await conn.commit();

    // The temporary password is shown ONLY this once
    res.status(201).json({
      user: { id: userId, member_id: memberId, full_name: name, email, role },
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

    const target = await User.findRoleById(id);
    if (!target) return res.status(404).json({ message: "User not found" });

    if (
      target.role === "admin" &&
      role !== "admin" &&
      target.is_active &&
      (await User.countActiveAdmins()) <= 1
    ) {
      return res.status(400).json({ message: "Cannot remove the last admin" });
    }

    await User.setRole(id, role);
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

    const target = await User.findRoleById(id);
    if (!target) return res.status(404).json({ message: "User not found" });

    if (
      !active &&
      target.role === "admin" &&
      target.is_active &&
      (await User.countActiveAdmins()) <= 1
    ) {
      return res
        .status(400)
        .json({ message: "Cannot deactivate the last admin" });
    }

    await User.setActive(id, active);
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

// POST /api/users/:id/reset-password
exports.resetPassword = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const target = await User.findRoleById(id);
    if (!target) return res.status(404).json({ message: "User not found" });

    const temp = tempPassword();
    const hash = await bcrypt.hash(temp, 12);
    await User.setPassword(id, hash, true);
    await logAction(req.user.id, "PASSWORD_RESET", "user", id);
    res.json({ temporary_password: temp });
  } catch (err) {
    next(err);
  }
};
