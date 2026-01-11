const express = require("express");
const router = express.Router();
const { searchPatientHistory, getPatientHistory } = require("../controllers/history.controller");
const authMiddleware = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { validatePatientHistorySearch } = require("../validators/history.validator");

router.get(
  "/patient",
  authMiddleware,
  validatePatientHistorySearch,
  validate,
  searchPatientHistory
);

router.get(
  "/patient/:patientId",
  authMiddleware,
  validate,
  getPatientHistory
);

module.exports = router;

