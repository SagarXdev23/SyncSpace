/**
 * Project controller.
 * Every project belongs to exactly one workspace; all access is gated on
 * workspace membership (see middleware/workspaceAuth.js).
 *
 * Note on GET /api/projects/:param — the spec defines both
 * GET /api/projects/:workspaceId (list) and GET /api/projects/:id (detail)
 * on the same path shape. The handler resolves it: if :param matches a
 * project, the project detail is returned; otherwise :param is treated as a
 * workspace id and the project list is returned.
 */
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Comment = require('../models/Comment');
const cacheService = require('../services/cacheService');
const activityService = require('../services/activityService');
const workspaceService = require('../services/workspaceService');
const Workspace = require('../models/Workspace');
const { getIo } = require('../sockets/socketHandler');

function invalidateProjectCache(project) {
  return Promise.all([
    cacheService.del(cacheService.keys.projects(project.workspace.toString())),
    cacheService.delPattern(`tasks:${project._id}:*`),
  ]);
}

function populatedProject(id) {
  return Project.findById(id)
    .populate('createdBy', 'name email avatar')
    .populate('workspace', 'name')
    .lean();
}

const createProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  const project = await Project.create({
    workspace: req.workspace._id,
    name: name.trim(),
    description: (description || '').trim(),
    createdBy: req.user._id,
  });

  await cacheService.del(cacheService.keys.projects(req.workspace._id.toString()));
  await activityService.log(req.workspace._id, req.user._id, 'project.created', 'project', project._id);

  const io = getIo();
  if (io) {
    io.to(`workspace:${req.workspace._id}`).emit('project:created', { workspaceId: req.workspace._id, project: project.toObject() });
  }

  const populated = await populatedProject(project._id);
  res.status(201).json({ success: true, data: populated });
});

/** GET /api/projects/:param — project detail when :param is a project id, else project list for a workspace id. */
/**
 * GET /api/projects — all projects across the user's workspaces,
 * most recently updated first. Used by the dashboard "Recent Projects".
 */
const listAllProjects = asyncHandler(async (req, res) => {
  const wsIds = await Workspace.find({ 'members.user': req.user._id }).distinct('_id');
  const projects = wsIds.length
    ? await Project.find({ workspace: { $in: wsIds } })
        .populate('workspace', 'name')
        .populate('createdBy', 'name avatar')
        .sort({ updatedAt: -1 })
        .limit(50)
        .lean()
    : [];
  res.json({ success: true, data: projects });
});

const getProjectOrList = asyncHandler(async (req, res) => {  const { param } = req.params;
  if (!mongoose.isValidObjectId(param)) {
    throw new ApiError('Invalid id', 400);
  }

  const project = await Project.findById(param);
  if (project) {
    await workspaceService.assertMember(project.workspace, req.user._id);
    const populated = await populatedProject(project._id);
    return res.json({ success: true, data: populated });
  }

  const { workspace } = await workspaceService.assertMember(param, req.user._id);
  const cacheKey = cacheService.keys.projects(workspace._id.toString());
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    return res.json({ success: true, data: cached, cached: true });
  }

  const projects = await Project.find({ workspace: workspace._id })
    .populate('createdBy', 'name avatar')
    .sort({ createdAt: -1 })
    .lean();
  // Attach task counts so list views (overview, cards) don't need N+1 fetches.
  const counts = await Task.aggregate([
    { $match: { project: { $in: projects.map((pr) => pr._id) } } },
    { $group: { _id: '$project', n: { $sum: 1 } } },
  ]);
  const byProject = new Map(counts.map((c) => [c._id.toString(), c.n]));
  projects.forEach((pr) => {
    pr.taskCount = byProject.get(pr._id.toString()) || 0;
  });
  await cacheService.set(cacheKey, projects, 120);
  res.json({ success: true, data: projects });
});

const updateProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (name !== undefined) req.project.name = name.trim();
  if (description !== undefined) req.project.description = description.trim();
  await req.project.save();

  await invalidateProjectCache(req.project);
  const populated = await populatedProject(req.project._id);

  const io = getIo();
  if (io) {
    io.to(`workspace:${req.workspace._id}`).emit('project:updated', { workspaceId: req.workspace._id, project: populated });
  }

  res.json({ success: true, data: populated });
});

const deleteProject = asyncHandler(async (req, res) => {
  const projectId = req.project._id;

  const tasks = await Task.find({ project: projectId }).select('_id');
  const taskIds = tasks.map((t) => t._id);
  await Promise.all([
    taskIds.length ? Comment.deleteMany({ task: { $in: taskIds } }) : Promise.resolve(),
    Task.deleteMany({ project: projectId }),
    Project.deleteOne({ _id: projectId }),
  ]);

  await invalidateProjectCache(req.project);

  const io = getIo();
  if (io) {
    io.to(`workspace:${req.workspace._id}`).emit('project:deleted', {
      workspaceId: req.workspace._id,
      projectId: projectId.toString(),
    });
  }

  res.json({ success: true, message: 'Project deleted' });
});

module.exports = { createProject, getProjectOrList, listAllProjects, updateProject, deleteProject };
