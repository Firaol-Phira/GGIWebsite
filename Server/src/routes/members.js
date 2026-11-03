const router = require("express").Router();
const { protect, authorizeRoles } = require("../middleware/auth");
const c = require("../controllers/memberController");

router.use(protect);

router.get("/", authorizeRoles("admin", "finance"), c.listMembers);
router.post("/", authorizeRoles("admin"), c.createMember);
router.patch("/:id", authorizeRoles("admin"), c.updateMember);

module.exports = router;
