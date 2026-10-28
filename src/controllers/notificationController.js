/**
 * CitySaathi Notification Controller
 * Manages in-app notifications, read states, and citizen alert queues.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Get notifications for the authenticated user
async function listNotifications(req, res) {
  try {
    const userId = req.user.id;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      include: {
        complaint: {
          select: {
            id: true,
            complaintCode: true,
            title: true,
            status: true,
            category: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false }
    });

    return res.json({
      success: true,
      unreadCount,
      total: notifications.length,
      notifications
    });
  } catch (err) {
    console.error('List notifications error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications.'
    });
  }
}

// 2. Mark a single notification as read
async function markAsRead(req, res) {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user.id;

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found.'
      });
    }

    if (notification.userId !== userId && req.user.role !== 'AUTHORITY') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to this notification.'
      });
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });

    return res.json({
      success: true,
      notification: updated
    });
  } catch (err) {
    console.error('Mark read error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read.'
    });
  }
}

// 3. Mark all notifications as read for current user
async function markAllAsRead(req, res) {
  try {
    const userId = req.user.id;

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });

    return res.json({
      success: true,
      message: 'All notifications marked as read.'
    });
  } catch (err) {
    console.error('Mark all read error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to mark notifications as read.'
    });
  }
}

module.exports = {
  listNotifications,
  markAsRead,
  markAllAsRead
};
