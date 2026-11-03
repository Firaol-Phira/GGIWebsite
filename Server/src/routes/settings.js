const ContributionSetting = require("../models/ContributionSetting");
const { logAction } = require("../utils/audit");
const express = require("express");
const router = express.Router();
// GET /api/settings/contributions
exports.listContributions = async (req, res, next) => {
  try {
    res.json({ settings: await ContributionSetting.list() });
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
      return res.status(400).json({
        message: "Valid year, monthly_amount and yearly_amount are required",
      });
    }

    await ContributionSetting.upsert({
      year,
      monthly_amount: monthly,
      yearly_amount: yearly,
      updated_by: req.user.id,
    });
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
module.exports = router;