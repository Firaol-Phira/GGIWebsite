const router = require("express").Router();
const { protect, authorizeRoles } = require("../middleware/auth");
const { galleryUpload } = require("../middleware/upload");
const c = require("../controllers/galleryController");

router.get("/", c.list); // public

router.post("/", protect, authorizeRoles("secretary"), galleryUpload, c.upload);
router.patch("/:id", protect, authorizeRoles("secretary"), c.update);
router.delete("/:id", protect, authorizeRoles("secretary"), c.remove);

module.exports = router;
