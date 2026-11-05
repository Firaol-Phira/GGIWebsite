const router = require("express").Router();
const { protect, authorizeRoles } = require("../middleware/auth");
const { projectUpload } = require("../middleware/upload");
const c = require("../controllers/projectController");

router.get("/", c.list); // public

// Secretary (admin can view). These come before "/:id"
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

router.post("/", protect, authorizeRoles("secretary"), projectUpload, c.create);
router.patch(
  "/:id",
  protect,
  authorizeRoles("secretary"),
  projectUpload,
  c.update,
);
router.patch("/:id/publish", protect, authorizeRoles("secretary"), c.publish);
router.patch(
  "/:id/unpublish",
  protect,
  authorizeRoles("secretary"),
  c.unpublish,
);
router.delete("/:id", protect, authorizeRoles("secretary"), c.remove);

module.exports = router;
