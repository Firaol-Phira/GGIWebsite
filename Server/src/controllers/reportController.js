const Report = require("../models/Report");

const n = (v) => Math.round(Number(v || 0) * 100) / 100;

// Turns grouped rows into a fixed list (12 months or 4 quarters) with zeros filled in
const fill = (rows, size) => {
  const list = Array.from({ length: size }, (_, i) => ({
    key: i + 1,
    total: 0,
    count: 0,
    pending: 0,
  }));
  for (const r of rows) {
    const item = list[Number(r.k) - 1];
    if (item) {
      item.total = n(r.total);
      item.count = Number(r.count || 0);
      item.pending = n(r.pending);
    }
  }
  const sum = (f) => n(list.reduce((s, x) => s + x[f], 0));
  return {
    rows: list,
    total: sum("total"),
    count: list.reduce((s, x) => s + x.count, 0),
    pending: sum("pending"),
  };
};

// GET /api/payments/report?year=2026
exports.report = async (req, res, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const [m, q, o, items, all] = await Promise.all([
      Report.monthly(year),
      Report.quarterly(year),
      Report.otherByMonth(year),
      Report.otherItems(year),
      Report.allTime(),
    ]);

    const monthly = fill(m, 12);
    const quarterly = fill(q, 4);
    const other = { ...fill(o, 12), items };

    const at = (t) => n(all.find((r) => r.type === t)?.total);
    const allTime = {
      monthly: at("monthly"),
      yearly: at("yearly"),
      other: at("other"),
    };
    allTime.grand = n(allTime.monthly + allTime.yearly + allTime.other);

    res.json({
      year,
      monthly,
      quarterly,
      other,
      summary: {
        monthly: monthly.total,
        quarterly: quarterly.total,
        other: other.total,
        grand: n(monthly.total + quarterly.total + other.total),
        pending: n(monthly.pending + quarterly.pending + other.pending),
      },
      allTime,
    });
  } catch (err) {
    next(err);
  }
};
