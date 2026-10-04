/**
 * Workspace chat message controller (REST surface).
 * Messages are persisted in MongoDB and broadcast over Socket.io;
 * the socket `chat:message` event offers the same flow in real time.
 */
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const Message = require('../models/Message');
const { getIo } = require('../sockets/socketHandler');

const listMessages = asyncHandler(async (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const { before } = req.query;

  const filter = { workspace: req.workspace._id };
  if (before) {
    // Cursor pagination: fetch messages older than the given message id.
    const exists = await Message.exists({ _id: before, workspace: req.workspace._id });
    if (!exists) throw new ApiError('Invalid pagination cursor', 400);
    filter._id = { $lt: before };
  }

  const docs = await Message.find(filter)
    .populate('sender', 'name avatar')
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = docs.length > limit;
  const messages = docs.slice(0, limit).reverse(); // chronological for the client

  res.json({ success: true, data: messages, pagination: { limit, hasMore } });
});

const createMessage = asyncHandler(async (req, res) => {
  const { content } = req.body;

  const message = await Message.create({
    workspace: req.workspace._id,
    sender: req.user._id,
    content: content.trim(),
  });
  await message.populate('sender', 'name avatar');

  const io = getIo();
  if (io) {
    io.to(`workspace:${req.workspace._id}`).emit('message:new', message.toObject());
  }

  res.status(201).json({ success: true, data: message.toObject() });
});

module.exports = { listMessages, createMessage };
