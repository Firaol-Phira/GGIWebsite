const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const { protect, authorizeRoles } = require("../middleware/auth");
const c = require("../controllers/contactController");

// Public form: max 5 messages per hour per IP, so spam can't flood the inbox
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: "Too many messages. Please try again later." },
});

router.post("/", limiter, c.submit);

// Admin only
router.get("/", protect, authorizeRoles("admin"), c.list);
router.patch("/:id/read", protect, authorizeRoles("admin"), c.read);
router.patch("/:id/replied", protect, authorizeRoles("admin"), c.replied);
router.delete("/:id", protect, authorizeRoles("admin"), c.remove);

module.exports = router;
