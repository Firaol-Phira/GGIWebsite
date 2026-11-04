const router = require("express").Router();
const { protect, authorizeRoles } = require("../middleware/auth");
const c = require("../controllers/settingsController");

router.use(protect);
router.get(
  "/contributions",
  authorizeRoles("admin", "finance"),
  c.listContributions,
);
router.put(
  "/contributions/:year",
  authorizeRoles("admin", "finance"),
  c.setContribution,
);

module.exports = router;
