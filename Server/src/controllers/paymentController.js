const Payment = require("../models/Payment");
const Member = require("../models/Member");
const ContributionSetting = require("../models/ContributionSetting");
const { logAction } = require("../utils/audit");

const HOSTS = (process.env.RECEIPT_HOSTS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// Only https links (and only the allowed hosts, if RECEIPT_HOSTS is set)
const cleanUrl = (raw) => {
  try {
    const u = new URL(String(raw).trim());
    if (u.protocol !== "https:") return null;
    if (HOSTS.length && !HOSTS.includes(u.hostname.toLowerCase())) return null;
    return u.href;
  } catch {
    return null;
  }
};

// Returns [errorCode, message] or [null, dataToSave]
const prepare = async (b, memberId, methods) => {
  const type = b.payment_type;
  const year = Number(b.period_year);
  const month = type === "monthly" ? Number(b.period_month) : null;

  if (
    !["monthly", "yearly"].includes(type) ||
    !year ||
    !b.payment_date ||
    !methods.includes(b.method)
  )
    return [400, "Payment type, year, date and a valid method are required"];
  if (type === "monthly" && !(month >= 1 && month <= 12))
    return [400, "Choose the month you are paying for"];
  if (new Date(b.payment_date) > new Date())
    return [400, "Payment date cannot be in the future"];

  const receipt_url = b.receipt_url ? cleanUrl(b.receipt_url) : null;
  if (b.receipt_url && !receipt_url)
    return [400, "The receipt link is not valid"];

  const member = await Member.findById(memberId);
  if (!member) return [404, "Member not found"];
  if (member.status !== "active") return [400, "Member is not active"];

  const setting = await ContributionSetting.findByYear(year);
  if (!setting)
    return [400, `Contribution amounts for ${year} have not been set yet`];

  if (await Payment.findDuplicate({ member_id: memberId, year, type, month }))
    return [409, "A payment already exists for this period"];
  if (receipt_url && (await Payment.findByReceiptUrl(receipt_url)))
    return [409, "This receipt link was already used"];

  const amount =
    type === "monthly" ? setting.monthly_amount : setting.yearly_amount;
  return [
    null,
    {
      member_id: memberId,
      payment_type: type,
      period_year: year,
      period_month: month,
      amount,
      payment_date: b.payment_date,
      method: b.method,
      receipt_url,
      note: b.note,
    },
  ];
};

// source "member": member reports their own payment (link required)
// source "finance": finance records a payment for a member (cash needs no link)
const record = (source, methods) => async (req, res, next) => {
  try {
    const memberId =
      source === "member" ? req.user.member_id : req.body.member_id;
    if (!memberId)
      return res
        .status(400)
        .json({
          message:
            source === "member"
              ? "Your account is not linked to a member record"
              : "member_id is required",
        });
    if (source === "member" && !req.body.receipt_url)
      return res.status(400).json({ message: "Paste your receipt link" });

    const [code, data] = await prepare(req.body, memberId, methods);
    if (code) return res.status(code).json({ message: data });

    const id = await Payment.create({
      ...data,
      source,
      recorded_by: req.user.id,
    });
    await logAction(
      req.user.id,
      source === "member" ? "PAYMENT_SUBMITTED" : "PAYMENT_RECORDED",
      "payment",
      id,
    );
    res.status(201).json({ id, status: "pending", amount: data.amount });
  } catch (err) {
    next(err);
  }
};
exports.createPayment = record("finance", ["cash", "cbe", "telebirr", "other"]);
exports.submitPayment = record("member", ["cbe", "telebirr", "other"]);

// GET /api/payments?status=pending&type=yearly&year=2026&member_id=1
exports.listPayments = async (req, res, next) => {
  try {
    res.json({ payments: await Payment.list(req.query) });
  } catch (err) {
    next(err);
  }
};

// GET /api/payments/mine  (own payments only)
exports.myPayments = async (req, res, next) => {
  try {
    if (!req.user.member_id) return res.json({ payments: [] });
    res.json({ payments: await Payment.listForMember(req.user.member_id) });
  } catch (err) {
    next(err);
  }
};

// GET /api/payments/my-status?year=2026
exports.myStatus = async (req, res, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const setting = await ContributionSetting.findByYear(year);
    if (!setting) return res.json({ year, configured: false });

    const rows = req.user.member_id
      ? await Payment.coverage(req.user.member_id, year)
      : [];
    const yearly = rows.find((r) => r.payment_type === "yearly");
   const months = Array.from({ length: 12 }, (_, i) => {
     const hit = rows.find(
       (r) => r.payment_type === "monthly" && r.period_month === i + 1,
     );
     return { month: i + 1, status: hit ? hit.status : null };
   });
    res.json({
      year,
      configured: true,
      monthly_amount: setting.monthly_amount,
      yearly_amount: setting.yearly_amount,
      yearly: yearly ? yearly.status : null,
      months,
    });
  } catch (err) {
    next(err);
  }
};

const review = (newStatus) => async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const reason = req.body.reason;
    if (newStatus === "rejected" && !reason)
      return res
        .status(400)
        .json({ message: "A reason is required to reject" });

    const p = await Payment.findById(id);
    if (!p) return res.status(404).json({ message: "Payment not found" });
    if (p.status !== "pending")
      return res.status(400).json({ message: `Already ${p.status}` });
    if (
      p.recorded_by === req.user.id &&
      process.env.ALLOW_SELF_APPROVAL !== "true"
    )
      return res
        .status(403)
        .json({
          message: "Another finance member must review a payment you recorded",
        });

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

// GET /api/payments/unpaid?year=2026&month=11   (leave out month for the yearly report)
exports.unpaid = async (req, res, next) => {
  try {
    const year = Number(req.query.year);
    const month = Number(req.query.month) || null;
    if (!year || (month && (month < 1 || month > 12)))
      return res
        .status(400)
        .json({
          message: "A valid year (and optional month 1-12) is required",
        });
    const members = month
      ? await Payment.unpaid(year, month)
      : await Payment.unpaidYearly(year);
    res.json({ year, month, count: members.length, members });
  } catch (err) {
    next(err);
  }
};
