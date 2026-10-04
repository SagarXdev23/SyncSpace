/**
 * Workspace authorization middleware ("what are you allowed to do?").
 *
 * Every workspace-scoped endpoint must verify the requesting user belongs to
 * the workspace. These middlewares load the workspace (404 when missing),
 * verify membership (403 when not a member) and attach:
 *   req.workspace  — the Workspace document
 *   req.memberRole  — 'OWNER' | 'ADMIN' | 'MEMBER'
 *
 * requireRole('ADMIN') gates routes to specific roles afterwards.
 */
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const Workspace = require('../models/Workspace');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Comment = require('../models/Comment');
const File = require('../models/File');

function checkMembership(workspace, userId) {
  const membership = workspace.members.find((m) => m.user.toString() === userId.toString());
  if (!membership) {
    throw new ApiError('You are not a member of this workspace', 403);
  }
  return membership.role;
}

function resolveWorkspaceId(req) {
  return req.params.workspaceId || req.params.id || req.body.workspaceId || req.query.workspaceId;
}

/** Load workspace from id/workspaceId in params/body/query + verify membership. */
const loadWorkspace = asyncHandler(async (req, res, next) => {
  const workspaceId = resolveWorkspaceId(req);
  if (!workspaceId || !mongoose.isValidObjectId(workspaceId)) {
    throw new ApiError('Invalid workspace id', 400);
  }
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    throw new ApiError('Workspace not found', 404);
  }
  req.workspace = workspace;
  req.memberRole = checkMembership(workspace, req.user._id);
  next();
});

/** Load project (from params.id / params.projectId / body.projectId), then its workspace + membership. */
const loadProjectWorkspace = asyncHandler(async (req, res, next) => {
  const projectId = req.params.projectId || req.params.id || req.body.projectId;
  if (!projectId || !mongoose.isValidObjectId(projectId)) {
    throw new ApiError('Invalid project id', 400);
  }
  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError('Project not found', 404);
  }
  const workspace = await Workspace.findById(project.workspace);
  if (!workspace) {
    throw new ApiError('Workspace not found', 404);
  }
  req.project = project;
  req.workspace = workspace;
  req.memberRole = checkMembership(workspace, req.user._id);
  next();
});

/** Load task (from params.id / params.taskId / body.taskId), then its project → workspace + membership. */
const loadTaskWorkspace = asyncHandler(async (req, res, next) => {
  const taskId = req.params.taskId || req.params.id || req.body.taskId;
  if (!taskId || !mongoose.isValidObjectId(taskId)) {
    throw new ApiError('Invalid task id', 400);
  }
  const task = await Task.findById(taskId);
  if (!task) {
    throw new ApiError('Task not found', 404);
  }
  const project = await Project.findById(task.project);
  if (!project) {
    throw new ApiError('Project not found', 404);
  }
  const workspace = await Workspace.findById(project.workspace);
  if (!workspace) {
    throw new ApiError('Workspace not found', 404);
  }
  req.task = task;
  req.project = project;
  req.workspace = workspace;
  req.memberRole = checkMembership(workspace, req.user._id);
  next();
});

/** Load comment (from params.id), then its task → project → workspace + membership. */
const loadCommentWorkspace = asyncHandler(async (req, res, next) => {
  const commentId = req.params.id;
  if (!commentId || !mongoose.isValidObjectId(commentId)) {
    throw new ApiError('Invalid comment id', 400);
  }
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError('Comment not found', 404);
  }
  const task = await Task.findById(comment.task);
  if (!task) {
    throw new ApiError('Task not found', 404);
  }
  const project = await Project.findById(task.project);
  if (!project) {
    throw new ApiError('Project not found', 404);
  }
  const workspace = await Workspace.findById(project.workspace);
  if (!workspace) {
    throw new ApiError('Workspace not found', 404);
  }
  req.comment = comment;
  req.task = task;
  req.project = project;
  req.workspace = workspace;
  req.memberRole = checkMembership(workspace, req.user._id);
  next();
});

/** Load file (from params.id), then its workspace + membership. */
const loadFileWorkspace = asyncHandler(async (req, res, next) => {
  const fileId = req.params.id;
  if (!fileId || !mongoose.isValidObjectId(fileId)) {
    throw new ApiError('Invalid file id', 400);
  }
  const file = await File.findById(fileId);
  if (!file) {
    throw new ApiError('File not found', 404);
  }
  const workspace = await Workspace.findById(file.workspace);
  if (!workspace) {
    throw new ApiError('Workspace not found', 404);
  }
  req.fileDoc = file;
  req.workspace = workspace;
  req.memberRole = checkMembership(workspace, req.user._id);
  next();
});

/** Role gate — use after one of the loaders above. */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.memberRole) {
      return next(new ApiError('Workspace membership not loaded', 500));
    }
    if (!roles.includes(req.memberRole)) {
      return next(new ApiError('Insufficient permissions for this action', 403));
    }
    next();
  };
}

module.exports = {
  loadWorkspace,
  loadProjectWorkspace,
  loadTaskWorkspace,
  loadCommentWorkspace,
  loadFileWorkspace,
  requireRole,
};
