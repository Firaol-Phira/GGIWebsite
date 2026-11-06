const Payment = require("../models/Payment");
const Member = require("../models/Member");
const ContributionSetting = require("../models/ContributionSetting");
const { logAction } = require("../utils/audit");

const HOSTS = (process.env.RECEIPT_HOSTS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const TYPES = ["monthly", "yearly", "other"];

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

// Reference: uppercase, no spaces, 6-40 letters/digits/-/_
const cleanRef = (raw) =>
  String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
const REF_OK = /^[A-Z0-9_-]{6,40}$/;

// A quarterly installment is 25% of the yearly amount
const quarterAmount = (yearly) => Math.round(Number(yearly) * 25) / 100;
const pad = (n) => String(n).padStart(2, "0");

// Returns [errorCode, message] or [null, dataToSave]
const prepare = async (b, memberId, methods, source) => {
  const type = b.payment_type;
  const other = type === "other";

  if (!TYPES.includes(type) || !b.payment_date || !methods.includes(b.method))
    return [400, "Payment type, date and a valid method are required"];
  if (new Date(b.payment_date) > new Date())
    return [400, "Payment date cannot be in the future"];

  // Other / penalty has no period: the year comes from the payment date
  const year = other
    ? Number(String(b.payment_date).slice(0, 4))
    : Number(b.period_year);
  const month = type === "monthly" ? Number(b.period_month) : null;
  const quarter = type === "yearly" ? Number(b.period_quarter) : null;

  if (!year) return [400, "A valid year is required"];
  if (type === "monthly" && !(month >= 1 && month <= 12))
    return [400, "Choose the month you are paying for"];
  if (type === "yearly" && !(quarter >= 1 && quarter <= 4))
    return [400, "Choose the quarter you are paying for"];

  let amount,
    reason = null;
  if (other) {
    reason = String(b.reason || "").trim();
    if (reason.length < 3 || reason.length > 255)
      return [400, "Write the reason (3 to 255 characters)"];
    amount = Math.round(Number(b.amount) * 100) / 100;
    if (!(amount > 0) || amount > 10000000)
      return [400, "Enter a valid amount"];
  }

  // Reference number: required for members and for non-cash finance entries
  const reference_no = cleanRef(b.reference_no);
  const needsRef = source === "member" || b.method !== "cash";
  if (needsRef && !REF_OK.test(reference_no))
    return [
      400,
      "Enter the transaction reference number from your receipt (6-40 letters or digits)",
    ];
  if (reference_no && !REF_OK.test(reference_no))
    return [400, "The reference number is not valid"];

  const receipt_url = b.receipt_url ? cleanUrl(b.receipt_url) : null;
  if (b.receipt_url && !receipt_url)
    return [400, "The receipt link is not valid"];

  const member = await Member.findById(memberId);
  if (!member) return [404, "Member not found"];
  if (member.status !== "active") return [400, "Member is not active"];

  if (!other) {
    const setting = await ContributionSetting.findByYear(year);
    if (!setting)
      return [400, `Contribution amounts for ${year} have not been set yet`];
    if (
      await Payment.findDuplicate({
        member_id: memberId,
        year,
        type,
        month,
        quarter,
      })
    )
      return [409, "A payment already exists for this period"];
    amount =
      type === "monthly"
        ? setting.monthly_amount
        : quarterAmount(setting.yearly_amount);
  }

  if (reference_no && (await Payment.findByReference(b.method, reference_no)))
    return [409, "This reference number was already used"];
  if (receipt_url && (await Payment.findByReceiptUrl(receipt_url)))
    return [409, "This receipt link was already used"];

  return [
    null,
    {
      member_id: memberId,
      payment_type: type,
      period_year: year,
      period_month: month,
      period_quarter: quarter,
      amount,
      payment_date: b.payment_date,
      method: b.method,
      reference_no: reference_no || null,
      receipt_url,
      note: b.note,
      reason,
    },
  ];
};

// source "member": member reports their own payment (link required)
// source "finance": finance records a payment for a member (cash needs no link or reference)
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

    const [code, data] = await prepare(req.body, memberId, methods, source);
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

// GET /api/payments?status=pending&type=other&year=2026&member_id=1
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

// GET /api/payments/my-status?year=2026  (includes the deadline of every period)
exports.myStatus = async (req, res, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const setting = await ContributionSetting.findByYear(year);
    if (!setting) return res.json({ year, configured: false });

    const day = setting.monthly_due_day || 15;
    const rows = req.user.member_id
      ? await Payment.coverage(req.user.member_id, year)
      : [];
    const months = Array.from({ length: 12 }, (_, i) => {
      const hit = rows.find(
        (r) => r.payment_type === "monthly" && r.period_month === i + 1,
      );
      return {
        month: i + 1,
        status: hit ? hit.status : null,
        due: `${year}-${pad(i + 1)}-${pad(day)}`,
      };
    });
    const quarters = [1, 2, 3, 4].map((q) => {
      const hit = rows.find(
        (r) => r.payment_type === "yearly" && r.period_quarter === q,
      );
      return {
        quarter: q,
        status: hit ? hit.status : null,
        due: setting[`q${q}_due`] || null,
      };
    });
    res.json({
      year,
      configured: true,
      monthly_amount: setting.monthly_amount,
      yearly_amount: setting.yearly_amount,
      monthly_due_day: day,
      quarter_amount: quarterAmount(setting.yearly_amount),
      months,
      quarters,
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

// GET /api/payments/unpaid?year=2026&month=11   or   ?year=2026&quarter=2
exports.unpaid = async (req, res, next) => {
  try {
    const year = Number(req.query.year);
    const month = Number(req.query.month) || null;
    const quarter = Number(req.query.quarter) || null;
    if (
      !year ||
      (!month && !quarter) ||
      (month && (month < 1 || month > 12)) ||
      (quarter && (quarter < 1 || quarter > 4))
    )
      return res
        .status(400)
        .json({
          message: "A year and a month (1-12) or quarter (1-4) are required",
        });
    const members = quarter
      ? await Payment.unpaidYearly(year, quarter)
      : await Payment.unpaid(year, month);
    res.json({ year, month, quarter, count: members.length, members });
  } catch (err) {
    next(err);
  }
};
