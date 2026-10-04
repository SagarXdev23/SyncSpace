import { io } from 'socket.io-client';
import { getToken } from './api';

/**
 * Singleton Socket.io client.
 *
 * Contract with backend (same host as the REST API, path /socket.io):
 *  - Handshake auth: { token }
 *  - Client emits:
 *      'join-workspace'  { workspaceId }
 *      'leave-workspace' { workspaceId }
 *      'chat:message'    { workspaceId, content }
 *      'typing:start'    { workspaceId }
 *      'typing:stop'     { workspaceId }
 *  - Server emits:
 *      'message:new', 'typing:update' { userId, name, isTyping },
 *      'presence:update' { onlineUserIds },
 *      'task:created' | 'task:updated' | 'task:deleted' | 'task:assigned' | 'task:status-changed',
 *      'comment:added', 'notification:new'
 */

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      path: '/socket.io',
      autoConnect: false,
      // Re-send the freshest token on every (re)connect.
      auth: (cb) => cb({ token: getToken() }),
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket) socket.disconnect();
}

/** Drop the singleton (e.g. after logout) so the next login re-authenticates. */
export function resetSocket() {
  disconnectSocket();
  if (socket) {
    socket.removeAllListeners();
    socket = null;
  }
}
