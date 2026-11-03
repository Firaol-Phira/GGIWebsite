const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const { login, me } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

// Max 10 login attempts per 15 minutes per IP (stops password guessing)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many attempts. Try again later." },
});

router.post("/login", loginLimiter, login);
router.get("/me", protect, me);

module.exports = router;
