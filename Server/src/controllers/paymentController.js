const Payment = require("../models/Payment");
const Member = require("../models/Member");
const ContributionSetting = require("../models/ContributionSetting");
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
      return res.status(400).json({
        message:
          "member_id, payment_type, period_year, payment_date and a valid method are required",
      });
    }
    if (payment_type === "monthly" && !(month >= 1 && month <= 12)) {
      return res.status(400).json({
        message: "period_month (1-12) is required for monthly payments",
      });
    }

    const member = await Member.findById(member_id);
    if (!member) return res.status(404).json({ message: "Member not found" });
    if (member.status !== "active")
      return res.status(400).json({ message: "Member is not active" });

    const setting = await ContributionSetting.findByYear(year);
    if (!setting) {
      return res.status(400).json({
        message: `The admin has not set contribution amounts for ${year}`,
      });
    }
    const expected =
      payment_type === "monthly"
        ? setting.monthly_amount
        : setting.yearly_amount;
    if (Number(amount) !== Number(expected)) {
      return res.status(400).json({
        message: `Amount must be ${expected} for a ${payment_type} payment`,
      });
    }

    const dup = await Payment.findDuplicate({
      member_id,
      year,
      type: payment_type,
      month,
    });
    if (dup) {
      return res
        .status(409)
        .json({ message: "A payment already exists for this period" });
    }

    const id = await Payment.create({
      member_id,
      payment_type,
      period_year: year,
      period_month: month,
      amount,
      payment_date,
      method,
      reference_no,
      note,
      recorded_by: req.user.id,
    });
    await logAction(req.user.id, "PAYMENT_RECORDED", "payment", id);
    res.status(201).json({ id, status: "pending" });
  } catch (err) {
    next(err);
  }
};

// GET /api/payments?status=pending&member_id=1&year=2026
exports.listPayments = async (req, res, next) => {
  try {
    res.json({ payments: await Payment.list(req.query) });
  } catch (err) {
    next(err);
  }
};

// GET /api/payments/mine  (a member sees ONLY their own)
exports.myPayments = async (req, res, next) => {
  try {
    if (!req.user.member_id) return res.json({ payments: [] });
    res.json({ payments: await Payment.listForMember(req.user.member_id) });
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

    const p = await Payment.findById(id);
    if (!p) return res.status(404).json({ message: "Payment not found" });
    if (p.status !== "pending") {
      return res.status(400).json({ message: `Already ${p.status}` });
    }
    if (
      p.recorded_by === req.user.id &&
      process.env.ALLOW_SELF_APPROVAL !== "true"
    ) {
      return res.status(403).json({
        message: "Another finance member must review a payment you recorded",
      });
    }

    const done = await Payment.review(id, {
      status: newStatus,
      reviewer_id: req.user.id,
      reason,
    });
    if (!done)
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
exports.unpaid = async (req, res, next) => {
  try {
    const year = Number(req.query.year);
    const month = Number(req.query.month);
    if (!year || !(month >= 1 && month <= 12)) {
      return res
        .status(400)
        .json({ message: "year and month (1-12) are required" });
    }
    const members = await Payment.unpaid(year, month);
    res.json({ year, month, count: members.length, members });
  } catch (err) {
    next(err);
  }
};
