const express = require('express');
const router = express.Router();
const {
  createOrUpdateTreatment,
  updateTreatmentStatus,
  getDentistTreatments,
} = require('../controllers/treatment.controller');
const authMiddleware = require('../middleware/auth.middleware');
const checkRole = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const {
  validateCreateOrUpdateTreatment,
  validateUpdateTreatmentStatus,
  validateBranchIdQuery,
} = require('../validators/treatment.validator');

router.post(
  '/',
  authMiddleware,
  checkRole('DENTIST'),
  validateCreateOrUpdateTreatment,
  validate,
  createOrUpdateTreatment
);
router.put(
  '/:id',
  authMiddleware,
  checkRole('DENTIST'),
  validateUpdateTreatmentStatus,
  validate,
  updateTreatmentStatus
);
router.get(
  '/dentist',
  authMiddleware,
  checkRole('DENTIST'),
  validateBranchIdQuery,
  validate,
  getDentistTreatments
);

module.exports = router;

