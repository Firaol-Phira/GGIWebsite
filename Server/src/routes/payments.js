const router = require("express").Router();
const { protect, authorizeRoles } = require("../middleware/auth");
const c = require("../controllers/paymentController");

router.use(protect);

// A member sees only their own payments
router.get(
  "/mine",
  authorizeRoles("member", "secretary", "finance", "admin"),
  c.myPayments,
);

// Finance (and admin, read only)
router.get("/unpaid", authorizeRoles("admin", "finance"), c.unpaid);
router.get("/", authorizeRoles("admin", "finance"), c.listPayments);
router.post("/", authorizeRoles("finance"), c.createPayment);
router.patch("/:id/approve", authorizeRoles("finance"), c.approvePayment);
router.patch("/:id/reject", authorizeRoles("finance"), c.rejectPayment);

module.exports = router;
