/**
 * Workspace service: shared membership helpers used by controllers and the
 * socket layer (both need "is this user in this workspace?" checks).
 */
const ApiError = require('../utils/ApiError');
const Workspace = require('../models/Workspace');

function getMemberRole(workspace, userId) {
  const membership = workspace.members.find((m) => m.user.toString() === userId.toString());
  return membership ? membership.role : null;
}

/**
 * Loads a workspace and asserts the user is a member.
 * Returns { workspace, role }. Throws 404 / 403 ApiErrors otherwise.
 */
async function assertMember(workspaceId, userId) {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) throw new ApiError('Workspace not found', 404);
  const role = getMemberRole(workspace, userId);
  if (!role) throw new ApiError('You are not a member of this workspace', 403);
  return { workspace, role };
}

/** Fast membership probe for the socket handshake/join flow. */
async function isMember(workspaceId, userId) {
  const exists = await Workspace.exists({ _id: workspaceId, 'members.user': userId });
  return Boolean(exists);
}

module.exports = { getMemberRole, assertMember, isMember };
