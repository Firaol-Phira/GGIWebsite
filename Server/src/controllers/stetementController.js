const Payment = require("../models/Payment");
const { logAction } = require("../utils/audit");

const norm = (s) =>
  String(s || "")
    .toUpperCase()
    .replace(/\s+/g, "");
const num = (v) => Number(String(v || "").replace(/[^0-9.-]/g, ""));
const METHODS = ["cbe", "telebirr", "other"];

// Compare pending payments of one bank with the statement rows
const compare = async (rows, method) => {
  const stmt = (Array.isArray(rows) ? rows : [])
    .slice(0, 5000)
    .map((r) => ({ ref: norm(r.reference), amount: num(r.amount) }))
    .filter((r) => r.ref.length >= 6);

  const pending = (await Payment.list({ status: "pending" })).filter(
    (p) => p.method === method,
  );

  return pending.map((p) => {
    const base = {
      id: p.id,
      member_name: p.member_name,
      payment_type: p.payment_type,
      period_year: p.period_year,
      period_month: p.period_month,
      period_quarter: p.period_quarter,
      reason: p.reason,
      amount: p.amount,
      reference_no: p.reference_no,
      recorded_by: p.recorded_by,
      statement_amount: null,
    };
    if (!p.reference_no) return { ...base, result: "noref" };

    const hits = stmt.filter((s) => s.ref.includes(p.reference_no));
    if (!hits.length) return { ...base, result: "missing" };

    const exact = hits.find(
      (s) => Math.abs(s.amount - Number(p.amount)) < 0.01,
    );
    return exact
      ? { ...base, result: "matched", statement_amount: exact.amount }
      : { ...base, result: "differs", statement_amount: hits[0].amount };
  });
};

// POST /api/payments/match   body: { method, rows: [{reference, amount}] }
exports.match = async (req, res, next) => {
  try {
    if (!METHODS.includes(req.body.method))
      return res
        .status(400)
        .json({ message: "Choose the bank of the statement" });
    const results = await compare(req.body.rows, req.body.method);
    res.json({ results });
  } catch (err) {
    next(err);
  }
};

// POST /api/payments/approve-matched   (recomputes on the server, approves matched only)
exports.approveMatched = async (req, res, next) => {
  try {
    if (!METHODS.includes(req.body.method))
      return res
        .status(400)
        .json({ message: "Choose the bank of the statement" });
    const results = await compare(req.body.rows, req.body.method);
    const matched = results.filter((r) => r.result === "matched");

    let approved = 0,
      skipped = 0;
    for (const r of matched) {
      if (
        r.recorded_by === req.user.id &&
        process.env.ALLOW_SELF_APPROVAL !== "true"
      ) {
        skipped++;
        continue;
      }
      if (
        await Payment.review(r.id, {
          status: "approved",
          reviewer_id: req.user.id,
        })
      ) {
        approved++;
        await logAction(
          req.user.id,
          "PAYMENT_APPROVED",
          "payment",
          r.id,
          "matched with bank statement",
        );
      }
    }
    await logAction(
      req.user.id,
      "STATEMENT_APPROVED",
      "payment",
      null,
      `${approved} approved, ${skipped} skipped`,
    );
    res.json({ approved, skipped });
  } catch (err) {
    next(err);
  }
};
