const pool = require("../config/db");
const { logAction } = require("../utils/audit");

const METHODS = ["cash", "cbe", "telebirr", "other"];

// POST /api/payments  (finance records a payment for a member)
exports.createPayment = async (req, res, next) => {
  try {
    const {
      member_id,
      payment_type,
      period_year,
      period_month,
      amount,
      payment_date,
      method,
      reference_no,
      note,
    } = req.body;

    const year = Number(period_year);
    const month = payment_type === "monthly" ? Number(period_month) : null;

    if (
      !member_id ||
      !year ||
      !payment_date ||
      !METHODS.includes(method) ||
      !["monthly", "yearly"].includes(payment_type)
    ) {
      return res
        .status(400)
        .json({
          message:
            "member_id, payment_type, period_year, payment_date and a valid method are required",
        });
    }
    if (payment_type === "monthly" && !(month >= 1 && month <= 12)) {
      return res
        .status(400)
        .json({
          message: "period_month (1-12) is required for monthly payments",
        });
    }

    const [m] = await pool.query(
      "SELECT id, status FROM members WHERE id = ?",
      [member_id],
    );
    if (!m.length) return res.status(404).json({ message: "Member not found" });
    if (m[0].status !== "active")
      return res.status(400).json({ message: "Member is not active" });

    // The amount must match the fixed amount for that year
    const [s] = await pool.query(
      "SELECT * FROM contribution_settings WHERE year = ?",
      [year],
    );
    if (!s.length) {
      return res
        .status(400)
        .json({
          message: `The admin has not set contribution amounts for ${year}`,
        });
    }
    const expected =
      payment_type === "monthly" ? s[0].monthly_amount : s[0].yearly_amount;
    if (Number(amount) !== Number(expected)) {
      return res
        .status(400)
        .json({
          message: `Amount must be ${expected} for a ${payment_type} payment`,
        });
    }

    // Block duplicates for the same period
    let dupSql = `SELECT id FROM payments WHERE member_id = ? AND period_year = ?
                  AND status IN ('pending','approved')`;
    const dupParams = [member_id, year];
    if (payment_type === "monthly") {
      dupSql += " AND (payment_type = 'yearly' OR period_month = ?)";
      dupParams.push(month);
    }
    const [dup] = await pool.query(dupSql, dupParams);
    if (dup.length) {
      return res
        .status(409)
        .json({ message: "A payment already exists for this period" });
    }

    const [r] = await pool.query(
      `INSERT INTO payments (member_id, payment_type, period_year, period_month, amount,
         payment_date, method, reference_no, note, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        member_id,
        payment_type,
        year,
        month,
        amount,
        payment_date,
        method,
        reference_no || null,
        note || null,
        req.user.id,
      ],
    );
    await logAction(req.user.id, "PAYMENT_RECORDED", "payment", r.insertId);
    res.status(201).json({ id: r.insertId, status: "pending" });
  } catch (err) {
    next(err);
  }
};

// GET /api/payments?status=pending&member_id=1&year=2026
exports.listPayments = async (req, res, next) => {
  try {
    const { status, member_id, year } = req.query;
    const where = [];
    const params = [];
    if (status) {
      where.push("p.status = ?");
      params.push(status);
    }
    if (member_id) {
      where.push("p.member_id = ?");
      params.push(member_id);
    }
    if (year) {
      where.push("p.period_year = ?");
      params.push(year);
    }

    const [rows] = await pool.query(
      `SELECT p.*, m.full_name AS member_name,
              r.full_name AS recorded_by_name, v.full_name AS reviewed_by_name
       FROM payments p
       JOIN members m ON m.id = p.member_id
       JOIN users r ON r.id = p.recorded_by
       LEFT JOIN users v ON v.id = p.reviewed_by
       ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY p.created_at DESC`,
      params,
    );
    res.json({ payments: rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/payments/mine  (a member sees ONLY their own)
exports.myPayments = async (req, res, next) => {
  try {
    if (!req.user.member_id) return res.json({ payments: [] });
    const [rows] = await pool.query(
      `SELECT id, payment_type, period_year, period_month, amount, payment_date,
              method, reference_no, status, reject_reason
       FROM payments WHERE member_id = ? ORDER BY period_year DESC, period_month DESC`,
      [req.user.member_id],
    );
    res.json({ payments: rows });
  } catch (err) {
    next(err);
  }
};

// Shared by approve and reject
const review = (newStatus) => async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const reason = req.body.reason;

    if (newStatus === "rejected" && !reason) {
      return res
        .status(400)
        .json({ message: "A reason is required to reject" });
    }

    const [rows] = await pool.query(
      "SELECT recorded_by, status FROM payments WHERE id = ?",
      [id],
    );
    const p = rows[0];
    if (!p) return res.status(404).json({ message: "Payment not found" });
    if (p.status !== "pending") {
      return res.status(400).json({ message: `Already ${p.status}` });
    }
    if (
      p.recorded_by === req.user.id &&
      process.env.ALLOW_SELF_APPROVAL !== "true"
    ) {
      return res
        .status(403)
        .json({
          message: "Another finance member must review a payment you recorded",
        });
    }

    // "AND status = 'pending'" stops two people reviewing the same payment at once
    const [r] = await pool.query(
      `UPDATE payments SET status = ?, reviewed_by = ?, reviewed_at = NOW(), reject_reason = ?
       WHERE id = ? AND status = 'pending'`,
      [newStatus, req.user.id, newStatus === "rejected" ? reason : null, id],
    );
    if (!r.affectedRows)
      return res
        .status(409)
        .json({ message: "Payment was just reviewed by someone else" });

    await logAction(
      req.user.id,
      newStatus === "approved" ? "PAYMENT_APPROVED" : "PAYMENT_REJECTED",
      "payment",
      id,
      reason || null,
    );
    res.json({ message: `Payment ${newStatus}` });
  } catch (err) {
    next(err);
  }
};
exports.approvePayment = review("approved");
exports.rejectPayment = review("rejected");

// GET /api/payments/unpaid?year=2026&month=11
// Active members with no APPROVED payment covering that month
exports.unpaid = async (req, res, next) => {
  try {
    const year = Number(req.query.year);
    const month = Number(req.query.month);
    if (!year || !(month >= 1 && month <= 12)) {
      return res
        .status(400)
        .json({ message: "year and month (1-12) are required" });
    }
    const [rows] = await pool.query(
      `SELECT m.id, m.full_name, m.phone
       FROM members m
       WHERE m.status = 'active'
         AND NOT EXISTS (
           SELECT 1 FROM payments p
           WHERE p.member_id = m.id AND p.status = 'approved' AND p.period_year = ?
             AND (p.payment_type = 'yearly' OR p.period_month = ?)
         )
       ORDER BY m.full_name`,
      [year, month],
    );
    res.json({ year, month, count: rows.length, members: rows });
  } catch (err) {
    next(err);
  }
};
