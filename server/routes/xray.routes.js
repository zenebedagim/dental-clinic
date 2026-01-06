const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  uploadXrayResult,
  getXrayRequests,
  sendToDentist,
  getXrayImages,
  deleteXrayImage,
} = require("../controllers/xray.controller");
const authMiddleware = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");
const validate = require("../middleware/validate.middleware");
const {
  validateUploadXrayResult,
  validateSendToDentist,
  validateBranchIdQuery,
} = require("../validators/xray.validator");

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

router.post(
  "/",
  authMiddleware,
  checkRole("XRAY"),
  upload.array("images", 10), // Allow up to 10 images
  validateUploadXrayResult,
  validate,
  uploadXrayResult
);
router.get(
  "/",
  authMiddleware,
  checkRole("ADMIN", "XRAY"),
  validateBranchIdQuery,
  validate,
  getXrayRequests
);
router.put(
  "/:id/send",
  authMiddleware,
  checkRole("XRAY"),
  validateSendToDentist,
  validate,
  sendToDentist
);

router.get(
  "/:xrayId/images",
  authMiddleware,
  checkRole("ADMIN", "XRAY", "DENTIST"),
  getXrayImages
);

router.delete(
  "/images/:imageId",
  authMiddleware,
  checkRole("XRAY"),
  deleteXrayImage
);

module.exports = router;
