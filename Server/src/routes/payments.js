const router = require("express").Router();
const { protect, authorizeRoles } = require("../middleware/auth");
const c = require("../controllers/paymentController");
const s = require("../controllers/statementController");
const r = require("../controllers/reportController");

router.use(protect);

// Any logged-in user (members see only their own data)
router.get("/mine", c.myPayments);
router.get("/my-status", c.myStatus);
router.post("/submit", c.submitPayment);

// Finance and admin
router.get("/unpaid", authorizeRoles("admin", "finance"), c.unpaid);
router.get("/report", authorizeRoles("admin", "finance"), r.report);
router.get("/", authorizeRoles("admin", "finance"), c.listPayments);
router.post("/", authorizeRoles("finance"), c.createPayment);

// Statement matching (finance only)
router.post("/match", authorizeRoles("finance"), s.match);
router.post("/approve-matched", authorizeRoles("finance"), s.approveMatched);

// "/:id" routes stay last
router.patch("/:id/approve", authorizeRoles("finance"), c.approvePayment);
router.patch("/:id/reject", authorizeRoles("finance"), c.rejectPayment);

module.exports = router;
