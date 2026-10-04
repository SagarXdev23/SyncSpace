/**
 * Notification controller — the current user's own notifications.
 * Creation + real-time delivery live in services/notificationService.js.
 */
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const Notification = require('../models/Notification');

const listNotifications = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };
  if (req.query.unread === 'true') filter.read = false;

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });
  res.json({ success: true, data: notifications, unreadCount });
});

const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({ _id: req.params.id, user: req.user._id });
  if (!notification) {
    throw new ApiError('Notification not found', 404);
  }
  notification.read = true;
  await notification.save();
  res.json({ success: true, data: notification.toObject() });
});

const markAllRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { user: req.user._id, read: false },
    { $set: { read: true } }
  );
  res.json({ success: true, message: 'All notifications marked as read', modifiedCount: result.modifiedCount });
});

module.exports = { listNotifications, markRead, markAllRead };
