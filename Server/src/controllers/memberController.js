const pool = require("../config/db");
const { logAction } = require("../utils/audit");

// GET /api/members?q=abebe&status=active
exports.listMembers = async (req, res, next) => {
  try {
    const { q, status } = req.query;
    const where = [];
    const params = [];
    if (status) {
      where.push("m.status = ?");
      params.push(status);
    }
    if (q) {
      where.push("(m.full_name LIKE ? OR m.phone LIKE ? OR m.email LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    const [rows] = await pool.query(
      `SELECT m.*, u.id AS user_id, u.role, u.is_active AS login_active
       FROM members m LEFT JOIN users u ON u.member_id = m.id
       ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY m.full_name`,
      params,
    );
    res.json({ members: rows });
  } catch (err) {
    next(err);
  }
};

// POST /api/members   (member record without a login)
exports.createMember = async (req, res, next) => {
  try {
    const { full_name, phone, email, joined_at } = req.body;
    if (!full_name)
      return res.status(400).json({ message: "full_name is required" });

    const [r] = await pool.query(
      "INSERT INTO members (full_name, phone, email, joined_at) VALUES (?, ?, ?, ?)",
      [full_name, phone || null, email || null, joined_at || null],
    );
    await logAction(req.user.id, "MEMBER_CREATED", "member", r.insertId);
    res.status(201).json({ id: r.insertId });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/members/:id
exports.updateMember = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { full_name, phone, email, joined_at, status } = req.body;

    const [r] = await pool.query(
      `UPDATE members SET
         full_name = COALESCE(?, full_name),
         phone = COALESCE(?, phone),
         email = COALESCE(?, email),
         joined_at = COALESCE(?, joined_at),
         status = COALESCE(?, status)
       WHERE id = ?`,
      [
        full_name ?? null,
        phone ?? null,
        email ?? null,
        joined_at ?? null,
        status ?? null,
        id,
      ],
    );
    if (!r.affectedRows)
      return res.status(404).json({ message: "Member not found" });

    await logAction(req.user.id, "MEMBER_UPDATED", "member", id);
    res.json({ message: "Member updated" });
  } catch (err) {
    next(err);
  }
};
