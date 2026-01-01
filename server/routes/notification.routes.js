/**
 * Notification Routes
 */

const express = require('express');
const router = express.Router();
const {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getPreferences,
  updatePreference,
  acknowledgeNotification,
} = require('../controllers/notification.controller');
const authMiddleware = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authMiddleware);

// Get user notifications
router.get('/', getUserNotifications);

// Get unread count
router.get('/unread', getUnreadCount);

// Mark notification as read
router.put('/:notificationId/read', markAsRead);

// Mark all as read
router.put('/read-all', markAllAsRead);

// Acknowledge notification
router.post('/:notificationId/ack', acknowledgeNotification);

// Get preferences
router.get('/preferences', getPreferences);

// Update preference
router.put('/preferences', updatePreference);

module.exports = router;

