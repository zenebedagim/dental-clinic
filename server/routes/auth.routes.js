const express = require('express');
const router = express.Router();
const { login, register } = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');
const checkRole = require('../middleware/role.middleware');

router.post('/login', login);
router.post('/register', authMiddleware, checkRole('ADMIN'), register);

module.exports = router;

