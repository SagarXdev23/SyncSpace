/**
 * Workspace controller.
 * Creator becomes OWNER. Member changes follow the role rules:
 * - add member: ADMIN+ ; never adds a second OWNER
 * - change role: OWNER/ADMIN; ADMIN cannot touch OWNER; last OWNER cannot be demoted
 * - remove member: OWNER/ADMIN; OWNER can never be removed; an OWNER cannot remove themselves
 */
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const Workspace = require('../models/Workspace');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Message = require('../models/Message');
const Comment = require('../models/Comment');
const File = require('../models/File');
const Activity = require('../models/Activity');
const User = require('../models/User');
const cacheService = require('../services/cacheService');
const activityService = require('../services/activityService');
const notificationService = require('../services/notificationService');
const { getIo } = require('../sockets/socketHandler');
const stream = require('stream');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

/** Upload an in-memory image buffer to Cloudinary, return the secure URL. */
function uploadLogoBuffer(buffer, filename) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'syncspace/logos',
        resource_type: 'image',
        use_filename: true,
        unique_filename: true,
      },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    );
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    bufferStream.pipe(uploadStream);
    bufferStream.on('error', reject);
  });
}

/** If req.file holds a logo image, upload it and return the URL (or ''). */
async function maybeUploadLogo(req) {
  if (!req.file) return undefined;
  if (!isCloudinaryConfigured()) {
    throw new ApiError('Logo uploads are not configured on this server', 503);
  }
  if (!req.file.mimetype.startsWith('image/')) {
    throw new ApiError('Logo must be an image file', 400);
  }
  return uploadLogoBuffer(req.file.buffer, req.file.originalname);
}

const VALID_ROLES = ['OWNER', 'ADMIN', 'MEMBER'];

async function invalidateWorkspaceCache(workspace) {
  const memberIds = workspace.members.map((m) => m.user.toString());
  await cacheService.del(cacheService.keys.workspace(workspace._id.toString()));
  await cacheService.del(...memberIds.map((id) => cacheService.keys.workspaceList(id)));
  await cacheService.del(cacheService.keys.projects(workspace._id.toString()));
  await cacheService.del(cacheService.keys.files(workspace._id.toString()));
}

function populatedWorkspace(id) {
  return Workspace.findById(id)
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar')
    .lean();
}

const createWorkspace = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const logo = await maybeUploadLogo(req);

  const workspace = await Workspace.create({
    name: name.trim(),
    description: (description || '').trim(),
    ...(logo ? { logo } : {}),
    owner: req.user._id,
    members: [{ user: req.user._id, role: 'OWNER' }],
  });

  await cacheService.del(cacheService.keys.workspaceList(req.user._id.toString()));
  await activityService.log(workspace._id, req.user._id, 'workspace.created', 'workspace', workspace._id);

  const populated = await populatedWorkspace(workspace._id);
  res.status(201).json({ success: true, data: populated });
});

const listWorkspaces = asyncHandler(async (req, res) => {
  const cacheKey = cacheService.keys.workspaceList(req.user._id.toString());
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    return res.json({ success: true, data: cached, cached: true });
  }

  const workspaces = await Workspace.find({ 'members.user': req.user._id })
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar')
    .sort({ updatedAt: -1 })
    .lean();

  await cacheService.set(cacheKey, workspaces, 120);
  res.json({ success: true, data: workspaces });
});

const getWorkspace = asyncHandler(async (req, res) => {
  const cacheKey = cacheService.keys.workspace(req.workspace._id.toString());
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    return res.json({ success: true, data: cached, cached: true });
  }

  const workspace = await populatedWorkspace(req.workspace._id);
  await cacheService.set(cacheKey, workspace, 300);
  res.json({ success: true, data: workspace });
});

const updateWorkspace = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (name !== undefined) req.workspace.name = name.trim();
  if (description !== undefined) req.workspace.description = description.trim();
  const logo = await maybeUploadLogo(req);
  if (logo) req.workspace.logo = logo;
  await req.workspace.save();

  await invalidateWorkspaceCache(req.workspace);
  const populated = await populatedWorkspace(req.workspace._id);
  res.json({ success: true, data: populated });
});

const deleteWorkspace = asyncHandler(async (req, res) => {
  const workspaceId = req.workspace._id;

  // Cascade: projects → tasks → comments, plus messages, files, activity.
  const projects = await Project.find({ workspace: workspaceId }).select('_id');
  const projectIds = projects.map((p) => p._id);
  const tasks = projectIds.length ? await Task.find({ project: { $in: projectIds } }).select('_id') : [];
  const taskIds = tasks.map((t) => t._id);

  await Promise.all([
    taskIds.length ? Comment.deleteMany({ task: { $in: taskIds } }) : Promise.resolve(),
    projectIds.length ? Task.deleteMany({ project: { $in: projectIds } }) : Promise.resolve(),
    Project.deleteMany({ workspace: workspaceId }),
    Message.deleteMany({ workspace: workspaceId }),
    File.deleteMany({ workspace: workspaceId }),
    Activity.deleteMany({ workspace: workspaceId }),
    Workspace.deleteOne({ _id: workspaceId }),
  ]);

  await invalidateWorkspaceCache(req.workspace);

  const io = getIo();
  if (io) io.to(`workspace:${workspaceId}`).emit('workspace:deleted', { workspaceId: workspaceId.toString() });

  res.json({ success: true, message: 'Workspace deleted' });
});

const addMember = asyncHandler(async (req, res) => {
  const { email, role = 'MEMBER' } = req.body;

  if (role === 'OWNER') {
    throw new ApiError('A workspace can only have one OWNER', 400);
  }
  if (!['ADMIN', 'MEMBER'].includes(role)) {
    throw new ApiError('Role must be ADMIN or MEMBER', 400);
  }

  const userToAdd = await User.findOne({ email: email.toLowerCase().trim() }).select('name email avatar');
  if (!userToAdd) {
    throw new ApiError('No user found with this email', 404);
  }

  const alreadyMember = req.workspace.members.some((m) => m.user.toString() === userToAdd._id.toString());
  if (alreadyMember) {
    throw new ApiError('User is already a member of this workspace', 409);
  }

  req.workspace.members.push({ user: userToAdd._id, role });
  await req.workspace.save();
  await invalidateWorkspaceCache(req.workspace);

  await activityService.log(req.workspace._id, req.user._id, 'member.added', 'member', userToAdd._id);
  await notificationService.create({
    user: userToAdd._id,
    type: 'workspace.invite',
    message: `${req.user.name} added you to workspace "${req.workspace.name}" as ${role}`,
    relatedEntity: { kind: 'workspace', id: req.workspace._id },
  });

  const io = getIo();
  if (io) {
    io.to(`workspace:${req.workspace._id}`).emit('member:added', {
      workspaceId: req.workspace._id,
      member: { user: userToAdd.toObject(), role },
    });
  }

  const populated = await populatedWorkspace(req.workspace._id);
  res.status(201).json({ success: true, data: populated });
});

const updateMemberRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!VALID_ROLES.includes(role)) {
    throw new ApiError('Role must be OWNER, ADMIN or MEMBER', 400);
  }

  const member = req.workspace.members.find((m) => m.user.toString() === userId);
  if (!member) {
    throw new ApiError('User is not a member of this workspace', 404);
  }

  // ADMINs can never change the OWNER's role.
  if (member.role === 'OWNER' && req.memberRole !== 'OWNER') {
    throw new ApiError('Only the OWNER can change the owner\'s role', 403);
  }
  // Only the OWNER may grant the OWNER role.
  if (role === 'OWNER' && req.memberRole !== 'OWNER') {
    throw new ApiError('Only the OWNER can transfer ownership', 403);
  }
  // The last OWNER cannot be demoted (a workspace must always have one).
  if (member.role === 'OWNER' && role !== 'OWNER') {
    const ownerCount = req.workspace.members.filter((m) => m.role === 'OWNER').length;
    if (ownerCount <= 1) {
      throw new ApiError('Cannot demote the last OWNER of the workspace', 400);
    }
  }

  member.role = role;
  // Ownership transfer also moves the `owner` pointer.
  if (role === 'OWNER') req.workspace.owner = member.user;
  await req.workspace.save();
  await invalidateWorkspaceCache(req.workspace);

  await activityService.log(req.workspace._id, req.user._id, 'member.role_changed', 'member', member.user);

  const io = getIo();
  if (io) {
    io.to(`workspace:${req.workspace._id}`).emit('member:role-changed', {
      workspaceId: req.workspace._id,
      userId,
      role,
    });
  }

  const populated = await populatedWorkspace(req.workspace._id);
  res.json({ success: true, data: populated });
});

const removeMember = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const index = req.workspace.members.findIndex((m) => m.user.toString() === userId);
  if (index === -1) {
    throw new ApiError('User is not a member of this workspace', 404);
  }
  const member = req.workspace.members[index];

  if (member.role === 'OWNER') {
    throw new ApiError('The OWNER cannot be removed from the workspace', 400);
  }
  // An OWNER removing themselves would orphan the workspace.
  if (userId === req.user._id.toString() && req.memberRole === 'OWNER') {
    throw new ApiError('Transfer ownership before leaving the workspace', 400);
  }

  req.workspace.members.splice(index, 1);
  await req.workspace.save();
  await invalidateWorkspaceCache(req.workspace);

  await activityService.log(req.workspace._id, req.user._id, 'member.removed', 'member', member.user);
  await notificationService.create({
    user: member.user,
    type: 'workspace.removed',
    message: `You were removed from workspace "${req.workspace.name}"`,
    relatedEntity: { kind: 'workspace', id: req.workspace._id },
  });

  const io = getIo();
  if (io) {
    io.to(`workspace:${req.workspace._id}`).emit('member:removed', {
      workspaceId: req.workspace._id,
      userId,
    });
  }

  const populated = await populatedWorkspace(req.workspace._id);
  res.json({ success: true, data: populated });
});

const getActivity = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Activity.find({ workspace: req.workspace._id })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Activity.countDocuments({ workspace: req.workspace._id }),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

module.exports = {
  createWorkspace,
  listWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  addMember,
  updateMemberRole,
  removeMember,
  getActivity,
};
