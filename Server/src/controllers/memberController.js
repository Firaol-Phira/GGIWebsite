const Member = require("../models/Member");
const { logAction } = require("../utils/audit");

// GET /api/members?q=abebe&status=active
exports.listMembers = async (req, res, next) => {
  try {
    res.json({ members: await Member.list(req.query) });
  } catch (err) {
    next(err);
  }
};

// POST /api/members   (member record without a login)
exports.createMember = async (req, res, next) => {
  try {
    if (!req.body.full_name)
      return res.status(400).json({ message: "full_name is required" });

    const id = await Member.create(req.body);
    await logAction(req.user.id, "MEMBER_CREATED", "member", id);
    res.status(201).json({ id });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/members/:id
exports.updateMember = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const found = await Member.update(id, req.body);
    if (!found) return res.status(404).json({ message: "Member not found" });

    await logAction(req.user.id, "MEMBER_UPDATED", "member", id);
    res.json({ message: "Member updated" });
  } catch (err) {
    next(err);
  }
};
