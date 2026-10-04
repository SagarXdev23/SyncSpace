/**
 * Workspace activity feed writer.
 * Fire-and-forget: a failed activity write must never fail the user request.
 */
const Activity = require('../models/Activity');

async function log(workspaceId, userId, action, entityKind = null, entityId = null) {
  try {
    await Activity.create({
      workspace: workspaceId,
      user: userId,
      action,
      ...(entityKind ? { entity: { kind: entityKind, id: entityId } } : {}),
    });
  } catch (err) {
    console.warn(`[activity] log failed (${action}): ${err.message}`);
  }
}

module.exports = { log };
