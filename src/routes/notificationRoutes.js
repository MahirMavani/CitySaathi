const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, notificationController.listNotifications);
router.patch('/:id/read', authenticateToken, notificationController.markAsRead);
router.post('/read-all', authenticateToken, notificationController.markAllAsRead);

module.exports = router;
