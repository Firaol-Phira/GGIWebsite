const router = require("express").Router();
const { protect, authorizeRoles } = require("../middleware/auth");
const c = require("../controllers/userController");

router.use(protect, authorizeRoles("admin")); // every route here is admin only

router.get("/", c.listUsers);
router.post("/", c.createUser);
router.patch("/:id/role", c.updateRole);
router.patch("/:id/status", c.updateStatus);
router.post("/:id/reset-password", c.resetPassword);

module.exports = router;
