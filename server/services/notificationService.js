/**
 * Notification service — persists the notification in MongoDB and pushes it
 * in real time to the recipient's personal socket room (`user:<userId>`).
 */
const Notification = require('../models/Notification');
const { getIo } = require('../sockets/socketHandler');

async function create({ user, type, message, relatedEntity }) {
  const userId = user.toString();
  const notification = await Notification.create({
    user: userId,
    type,
    message,
    ...(relatedEntity ? { relatedEntity } : {}),
  });

  try {
    const io = getIo();
    if (io) {
      io.to(`user:${userId}`).emit('notification:new', notification.toObject());
    }
  } catch (err) {
    console.warn(`[notifications] realtime emit failed: ${err.message}`);
  }

  return notification;
}

module.exports = { create };
