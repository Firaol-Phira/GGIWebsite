const pool = require("../config/db");
const { logAction } = require("../utils/audit");

// GET /api/settings/contributions
exports.listContributions = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM contribution_settings ORDER BY year DESC",
    );
    res.json({ settings: rows });
  } catch (err) {
    next(err);
  }
};

// PUT /api/settings/contributions/:year   body: { monthly_amount, yearly_amount }
exports.setContribution = async (req, res, next) => {
  try {
    const year = Number(req.params.year);
    const monthly = Number(req.body.monthly_amount);
    const yearly = Number(req.body.yearly_amount);
    if (!year || !(monthly > 0) || !(yearly > 0)) {
      return res
        .status(400)
        .json({
          message: "Valid year, monthly_amount and yearly_amount are required",
        });
    }

    await pool.query(
      `INSERT INTO contribution_settings (year, monthly_amount, yearly_amount, updated_by)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE monthly_amount = VALUES(monthly_amount),
         yearly_amount = VALUES(yearly_amount), updated_by = VALUES(updated_by)`,
      [year, monthly, yearly, req.user.id],
    );
    await logAction(
      req.user.id,
      "SETTINGS_UPDATED",
      "contribution_settings",
      year,
      `monthly=${monthly}, yearly=${yearly}`,
    );
    res.json({ message: "Saved" });
  } catch (err) {
    next(err);
  }
};
