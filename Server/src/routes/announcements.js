const router = require("express").Router();
const { protect, authorizeRoles } = require("../middleware/auth");
const c = require("../controllers/announcementController");

// Public: anyone can read published news
router.get("/", c.listPublished);

// Secretary (and admin read-only): must come BEFORE '/:slug'
router.get(
  "/manage/all",
  protect,
  authorizeRoles("secretary", "admin"),
  c.listAll,
);
router.get(
  "/manage/:id",
  protect,
  authorizeRoles("secretary", "admin"),
  c.getOne,
);

router.get("/:slug", c.getPublished);

router.post("/", protect, authorizeRoles("secretary"), c.create);
router.patch("/:id", protect, authorizeRoles("secretary"), c.update);
router.patch("/:id/publish", protect, authorizeRoles("secretary"), c.publish);
router.patch(
  "/:id/unpublish",
  protect,
  authorizeRoles("secretary"),
  c.unpublish,
);
router.delete("/:id", protect, authorizeRoles("secretary"), c.remove);

module.exports = router;
