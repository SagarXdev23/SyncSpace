/** Shared constants: roles, task enums, socket event names. */

export const ROLES = ['OWNER', 'ADMIN', 'MEMBER'];

export const TASK_STATUSES = [
  { id: 'TODO', label: 'To Do' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'COMPLETED', label: 'Completed' },
];

export const PRIORITIES = [
  { id: 'LOW', label: 'Low' },
  { id: 'MEDIUM', label: 'Medium' },
  { id: 'HIGH', label: 'High' },
];

// Returns the role of a user inside a workspace (members: [{user, role}] or [{userId, role}]).
export function getMyRole(workspace, userId) {
  if (!workspace || !userId) return null;
  if (String(workspace.owner) === String(userId)) return 'OWNER';
  const m = (workspace.members || []).find((x) => {
    const id = x.user?._id || x.user || x.userId;
    return String(id) === String(userId);
  });
  return m?.role || null;
}

// Normalise a member entry to { id, name, email, role } regardless of populate shape.
export function normalizeMember(member) {
  const u = member.user || {};
  return {
    id: String(u._id || u || member.userId || ''),
    name: u.name || member.name || 'Unknown',
    email: u.email || member.email || '',
    avatar: u.avatar || member.avatar || '',
    role: member.role || 'MEMBER',
  };
}

export const SOCKET_EVENTS = {
  JOIN_WORKSPACE: 'join-workspace',
  LEAVE_WORKSPACE: 'leave-workspace',
  CHAT_MESSAGE: 'chat:message',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  MESSAGE_NEW: 'message:new',
  TYPING_UPDATE: 'typing:update',
  PRESENCE_UPDATE: 'presence:update',
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_DELETED: 'task:deleted',
  TASK_ASSIGNED: 'task:assigned',
  TASK_STATUS_CHANGED: 'task:status-changed',
  COMMENT_ADDED: 'comment:added',
  NOTIFICATION_NEW: 'notification:new',
};
