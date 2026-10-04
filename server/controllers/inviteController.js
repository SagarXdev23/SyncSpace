/**
 * Invite controller — invitation links for adding members.
 * POST /api/invites        -> create a workspace invite { workspaceId, role, expiresInDays, maxUses }
 * GET  /api/invites        -> list invites created by user
 * GET  /api/invites/:token -> preview a public invite
 * POST /api/invites/accept -> accept an invite (authenticated)
 */
const asyncHandler = require('../utils/asyncHandler');
const Invite = require('../models/Invite');
const Workspace = require('../models/Workspace');
const ApiError = require('../utils/ApiError');
const cacheService = require('../services/cacheService');
const activityService = require('../services/activityService');
const notificationService = require('../services/notificationService');

const createInvite = asyncHandler(async (req, res) => {
  const { role = 'MEMBER', expiresInDays = 7, maxUses = null } = req.body;

  const expiresAt =
    Number(expiresInDays) > 0
      ? new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000)
      : null;

  const invite = await Invite.create({
    token: Invite.generateToken(),
    workspace: req.workspace._id,
    role,
    expiresAt,
    maxUses: maxUses ? Number(maxUses) : null,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    data: {
      token: invite.token,
      role: invite.role,
      expiresAt: invite.expiresAt,
      maxUses: invite.maxUses,
      workspace: { _id: req.workspace._id, name: req.workspace.name },
    },
  });
});

const listInvites = asyncHandler(async (req, res) => {
  const invites = await Invite.find({ createdBy: req.user._id })
    .populate('workspace', 'name')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  res.json({ success: true, data: invites });
});

const getInvite = asyncHandler(async (req, res) => {
  const invite = await Invite.findOne({ token: req.params.token })
    .populate('workspace', 'name');
  if (!invite) throw new ApiError('Invite link not found', 404);
  if (!invite.workspace) throw new ApiError('The invited workspace no longer exists', 410);
  if (invite.expiresAt && invite.expiresAt <= new Date()) {
    throw new ApiError('This invite link has expired', 410);
  }
  if (invite.maxUses !== null && invite.usedCount >= invite.maxUses) {
    throw new ApiError('This invite link has reached its usage limit', 410);
  }

  res.json({
    success: true,
    data: {
      workspace: invite.workspace,
      role: invite.role,
      expiresAt: invite.expiresAt,
    },
  });
});

const acceptInvite = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const invite = await Invite.findOne({ token }).populate('workspace', 'name');
  if (!invite) throw new ApiError('Invite link not found', 404);
  if (!invite.workspace) throw new ApiError('The invited workspace no longer exists', 410);

  const workspaceId = invite.workspace._id;
  const existingWorkspace = await Workspace.findOne({
    _id: workspaceId,
    'members.user': req.user._id,
  }).select('_id name');
  if (existingWorkspace) {
    return res.json({
      success: true,
      data: { workspace: existingWorkspace, alreadyMember: true },
    });
  }

  const now = new Date();
  const consumed = await Invite.findOneAndUpdate(
    {
      _id: invite._id,
      $and: [
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
        { $or: [{ maxUses: null }, { $expr: { $lt: ['$usedCount', '$maxUses'] } }] },
      ],
    },
    { $inc: { usedCount: 1 } },
    { new: true },
  );
  if (!consumed) throw new ApiError('This invite link is expired or has reached its usage limit', 410);

  let added;
  let usageReleased = false;
  try {
    added = await Workspace.updateOne(
      { _id: workspaceId, 'members.user': { $ne: req.user._id } },
      { $push: { members: { user: req.user._id, role: consumed.role } } },
    );
    if (added.modifiedCount !== 1) {
      await Invite.updateOne({ _id: consumed._id }, { $inc: { usedCount: -1 } });
      usageReleased = true;
      const workspace = await Workspace.findById(workspaceId).select('_id name');
      if (!workspace) throw new ApiError('The invited workspace no longer exists', 410);
      return res.json({ success: true, data: { workspace, alreadyMember: true } });
    }
  } catch (err) {
    if (!usageReleased) {
      await Invite.updateOne({ _id: consumed._id }, { $inc: { usedCount: -1 } });
    }
    throw err;
  }

  await Promise.all([
    cacheService.del(
      cacheService.keys.workspace(workspaceId.toString()),
      cacheService.keys.workspaceList(req.user._id.toString()),
    ),
    activityService.log(workspaceId, req.user._id, 'member.added', 'member', req.user._id),
    notificationService.create({
      user: req.user._id,
      type: 'workspace.invite',
      message: `You joined workspace "${invite.workspace.name}" as ${consumed.role}`,
      relatedEntity: { kind: 'workspace', id: workspaceId },
    }),
  ]);

  const workspace = await Workspace.findById(workspaceId).select('_id name');
  res.json({ success: true, data: { workspace, alreadyMember: false } });
});

module.exports = { createInvite, listInvites, getInvite, acceptInvite };
