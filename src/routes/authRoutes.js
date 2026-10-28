const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/demo-login', authController.demoLogin);
router.get('/profile', authenticateToken, authController.getProfile);

module.exports = router;
