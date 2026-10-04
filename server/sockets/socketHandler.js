/**
 * Socket.io real-time layer.
 *
 * - Handshake auth via JWT access token (socket.handshake.auth.token).
 * - Personal room `user:<userId>` for notifications.
 * - Workspace rooms `workspace:<workspaceId>` (membership verified in DB before join).
 * - Chat: `chat:message` → persist to MongoDB → broadcast `message:new`.
 * - Typing indicators: `typing:start` / `typing:stop` → `typing:update`.
 * - Presence: in-memory per-workspace online map + client heartbeat; stale
 *   entries are pruned and `presence:update` is emitted on changes.
 *
 * Task/comment/file events are emitted from the REST controllers through the
 * shared io accessor below (getIo), keeping MongoDB the source of truth.
 */
const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/generateToken');
const User = require('../models/User');
const Message = require('../models/Message');
const workspaceService = require('../services/workspaceService');

let io = null;

function getIo() {
  return io;
}

function roomFor(workspaceId) {
  return `workspace:${workspaceId.toString()}`;
}

// workspaceId -> Map(userId -> { userId, name, lastSeen })
const presence = new Map();
const PRESENCE_STALE_MS = 60 * 1000;

function broadcastPresence(workspaceId) {
  if (!io) return;
  const online = [...(presence.get(workspaceId) || new Map()).values()];
  io.to(roomFor(workspaceId)).emit('presence:update', { workspaceId, online });
}

function trackPresence(workspaceId, userId, name) {
  if (!presence.has(workspaceId)) presence.set(workspaceId, new Map());
  presence.get(workspaceId).set(userId, { userId, name, lastSeen: Date.now() });
  broadcastPresence(workspaceId);
}

function untrackPresence(workspaceId, userId) {
  const map = presence.get(workspaceId);
  if (map && map.delete(userId)) broadcastPresence(workspaceId);
}

// Prune entries whose heartbeat went stale (safety net for missed disconnects).
setInterval(() => {
  const now = Date.now();
  for (const [workspaceId, map] of presence) {
    let changed = false;
    for (const [userId, entry] of map) {
      if (now - entry.lastSeen > PRESENCE_STALE_MS) {
        map.delete(userId);
        changed = true;
      }
    }
    if (changed) broadcastPresence(workspaceId);
  }
}, 30 * 1000).unref();

function initSocket(server) {
  const clientOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : true;
  io = new Server(server, {
    cors: { origin: clientOrigins, credentials: true },
  });

  // Authenticate the handshake — reject sockets without a valid access token.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));
      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.sub).select('name avatar');
      if (!user) return next(new Error('User not found'));
      socket.user = { id: user._id.toString(), name: user.name, avatar: user.avatar };
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const { id: userId, name } = socket.user;
    socket.join(`user:${userId}`);
    socket.data.workspaces = new Set();

    socket.on('join-workspace', async ({ workspaceId } = {}, ack) => {
      try {
        if (!workspaceId) {
          if (ack) ack({ ok: false, error: 'workspaceId is required' });
          return;
        }
        const allowed = await workspaceService.isMember(workspaceId, userId);
        if (!allowed) {
          if (ack) ack({ ok: false, error: 'Not a member of this workspace' });
          return;
        }
        socket.join(roomFor(workspaceId));
        socket.data.workspaces.add(workspaceId.toString());
        trackPresence(workspaceId.toString(), userId, name);
        if (ack) ack({ ok: true });
      } catch (err) {
        if (ack) ack({ ok: false, error: err.message });
      }
    });

    socket.on('leave-workspace', ({ workspaceId } = {}) => {
      if (!workspaceId) return;
      socket.leave(roomFor(workspaceId));
      socket.data.workspaces.delete(workspaceId.toString());
      untrackPresence(workspaceId.toString(), userId);
    });

    // Explicit heartbeat — also refreshes on join.
    socket.on('presence:heartbeat', ({ workspaceId } = {}) => {
      if (workspaceId && socket.data.workspaces.has(workspaceId.toString())) {
        trackPresence(workspaceId.toString(), userId, name);
      }
    });

    // Real-time chat: persist → MongoDB → broadcast to the room.
    socket.on('chat:message', async ({ workspaceId, content } = {}, ack) => {
      try {
        const text = (content || '').trim().slice(0, 2000);
        if (!text) {
          if (ack) ack({ ok: false, error: 'Message content is required' });
          return;
        }
        if (!workspaceId || !(await workspaceService.isMember(workspaceId, userId))) {
          if (ack) ack({ ok: false, error: 'Not a member of this workspace' });
          return;
        }
        const message = await Message.create({ workspace: workspaceId, sender: userId, content: text });
        await message.populate('sender', 'name avatar');
        const payload = message.toObject();
        io.to(roomFor(workspaceId)).emit('message:new', payload);
        if (ack) ack({ ok: true, message: payload });
      } catch (err) {
        if (ack) ack({ ok: false, error: err.message });
      }
    });

    socket.on('typing:start', ({ workspaceId } = {}) => {
      if (!workspaceId) return;
      socket.to(roomFor(workspaceId)).emit('typing:update', { workspaceId, userId, name, typing: true });
    });

    socket.on('typing:stop', ({ workspaceId } = {}) => {
      if (!workspaceId) return;
      socket.to(roomFor(workspaceId)).emit('typing:update', { workspaceId, userId, name, typing: false });
    });

    socket.on('disconnect', () => {
      for (const workspaceId of socket.data.workspaces) {
        untrackPresence(workspaceId, userId);
      }
    });
  });

  return io;
}

module.exports = { initSocket, getIo };
