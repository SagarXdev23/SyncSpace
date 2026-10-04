/**
 * Task controller (Kanban: TODO / IN_PROGRESS / COMPLETED).
 * The backend is the source of truth for task status; every mutation is
 * persisted to MongoDB and then broadcast to the workspace Socket.io room.
 *
 * GET /api/tasks/:param — same dual resolution as projects: a task id returns
 * the task detail, otherwise :param is treated as a project id (supports
 * ?status=TODO|IN_PROGRESS|COMPLETED filtering).
 */
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Comment = require('../models/Comment');
const User = require('../models/User');
const cacheService = require('../services/cacheService');
const activityService = require('../services/activityService');
const notificationService = require('../services/notificationService');
const workspaceService = require('../services/workspaceService');
const { getIo } = require('../sockets/socketHandler');

const VALID_STATUSES = ['TODO', 'IN_PROGRESS', 'COMPLETED'];
const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

function invalidateTaskCache(projectId) {
  return cacheService.delPattern(`tasks:${projectId}:*`);
}

function populatedTask(id) {
  return Task.findById(id)
    .populate('assignedTo', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .populate('project', 'name workspace')
    .lean();
}

function roomFor(workspaceId) {
  return `workspace:${workspaceId}`;
}

/** Assignee must be a member of the workspace. Returns the user doc or throws 400. */
async function resolveAssignee(workspace, assignedTo) {
  if (!assignedTo) return null;
  const isMember = workspace.members.some((m) => m.user.toString() === assignedTo.toString());
  if (!isMember) {
    throw new ApiError('Assignee must be a member of the workspace', 400);
  }
  const user = await User.findById(assignedTo).select('name email');
  if (!user) throw new ApiError('Assignee not found', 400);
  return user;
}

async function notifyAssignee({ task, assignee, assignerName, workspaceId, workspaceName }) {
  await notificationService.create({
    user: assignee._id,
    type: 'task.assigned',
    message: `${assignerName} assigned you to task "${task.title}" in ${workspaceName}`,
    relatedEntity: { kind: 'task', id: task._id },
  });
  const io = getIo();
  if (io) {
    io.to(roomFor(workspaceId)).emit('task:assigned', {
      workspaceId,
      taskId: task._id,
      assignedTo: assignee._id,
    });
  }
}

const createTask = asyncHandler(async (req, res) => {
  const { title, description, status, priority, assignedTo, dueDate } = req.body;

  const assignee = await resolveAssignee(req.workspace, assignedTo);

  const task = await Task.create({
    project: req.project._id,
    title: title.trim(),
    description: (description || '').trim(),
    status: status || 'TODO',
    priority: priority || 'MEDIUM',
    assignedTo: assignee ? assignee._id : null,
    dueDate: dueDate || null,
    createdBy: req.user._id,
  });

  await invalidateTaskCache(req.project._id);
  await activityService.log(req.workspace._id, req.user._id, 'task.created', 'task', task._id);

  const io = getIo();
  const populated = await populatedTask(task._id);
  if (io) {
    io.to(roomFor(req.workspace._id)).emit('task:created', { workspaceId: req.workspace._id, task: populated });
  }

  if (assignee && assignee._id.toString() !== req.user._id.toString()) {
    await notifyAssignee({
      task,
      assignee,
      assignerName: req.user.name,
      workspaceId: req.workspace._id,
      workspaceName: req.workspace.name,
    });
    await activityService.log(req.workspace._id, req.user._id, 'task.assigned', 'task', task._id);
  }

  res.status(201).json({ success: true, data: populated });
});

const listTasks = asyncHandler(async (req, res) => {
  const { status } = req.query;
  if (status && !VALID_STATUSES.includes(status)) {
    throw new ApiError('Invalid status filter — use TODO, IN_PROGRESS or COMPLETED', 400);
  }

  const cacheKey = cacheService.keys.tasks(req.project._id.toString(), status || null);
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    return res.json({ success: true, data: cached, cached: true });
  }

  const filter = { project: req.project._id };
  if (status) filter.status = status;

  const tasks = await Task.find(filter)
    .populate('assignedTo', 'name email avatar')
    .populate('createdBy', 'name avatar')
    .sort({ createdAt: -1 })
    .lean();

  await cacheService.set(cacheKey, tasks, 60);
  res.json({ success: true, data: tasks });
});

/** GET /api/tasks/:param — task detail when :param is a task id, else task list for a project id. */
const getTaskOrList = asyncHandler(async (req, res) => {
  const { param } = req.params;
  if (!mongoose.isValidObjectId(param)) {
    throw new ApiError('Invalid id', 400);
  }

  const task = await Task.findById(param);
  if (task) {
    const project = await Project.findById(task.project);
    if (!project) throw new ApiError('Project not found', 404);
    await workspaceService.assertMember(project.workspace, req.user._id);
    const populated = await populatedTask(task._id);
    return res.json({ success: true, data: populated });
  }

  const project = await Project.findById(param);
  if (!project) throw new ApiError('Project not found', 404);
  const { workspace } = await workspaceService.assertMember(project.workspace, req.user._id);

  const { status } = req.query;
  if (status && !VALID_STATUSES.includes(status)) {
    throw new ApiError('Invalid status filter — use TODO, IN_PROGRESS or COMPLETED', 400);
  }
  const cacheKey = cacheService.keys.tasks(project._id.toString(), status || null);
  const cached = await cacheService.get(cacheKey);
  if (cached) return res.json({ success: true, data: cached, cached: true });

  const filter = { project: project._id };
  if (status) filter.status = status;
  const tasks = await Task.find(filter)
    .populate('assignedTo', 'name email avatar')
    .populate('createdBy', 'name avatar')
    .sort({ createdAt: -1 })
    .lean();
  await cacheService.set(cacheKey, tasks, 60);
  res.json({ success: true, data: tasks, workspaceId: workspace._id });
});

const updateTask = asyncHandler(async (req, res) => {
  const { title, description, status, priority, assignedTo, dueDate } = req.body;
  const task = req.task;

  const oldStatus = task.status;
  const oldAssignee = task.assignedTo ? task.assignedTo.toString() : null;

  if (title !== undefined) task.title = title.trim();
  if (description !== undefined) task.description = description.trim();
  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) throw new ApiError('Invalid status', 400);
    task.status = status;
  }
  if (priority !== undefined) {
    if (!VALID_PRIORITIES.includes(priority)) throw new ApiError('Invalid priority', 400);
    task.priority = priority;
  }
  if (assignedTo !== undefined) {
    if (assignedTo === null || assignedTo === '') {
      task.assignedTo = null;
    } else {
      const assignee = await resolveAssignee(req.workspace, assignedTo);
      task.assignedTo = assignee._id;
    }
  }
  if (dueDate !== undefined) task.dueDate = dueDate || null;

  await task.save();
  await invalidateTaskCache(req.project._id);

  const io = getIo();
  const populated = await populatedTask(task._id);
  const newAssignee = task.assignedTo ? task.assignedTo.toString() : null;

  if (io) {
    io.to(roomFor(req.workspace._id)).emit('task:updated', { workspaceId: req.workspace._id, task: populated });
  }

  if (status !== undefined && status !== oldStatus) {
    if (io) {
      io.to(roomFor(req.workspace._id)).emit('task:status-changed', {
        workspaceId: req.workspace._id,
        taskId: task._id,
        oldStatus,
        newStatus: status,
        task: populated,
      });
    }
    if (status === 'COMPLETED') {
      await activityService.log(req.workspace._id, req.user._id, 'task.completed', 'task', task._id);
    }
  }

  if (newAssignee !== oldAssignee && newAssignee) {
    const assignee = await User.findById(newAssignee).select('name email');
    if (assignee && newAssignee !== req.user._id.toString()) {
      await notifyAssignee({
        task,
        assignee,
        assignerName: req.user.name,
        workspaceId: req.workspace._id,
        workspaceName: req.workspace.name,
      });
    }
    await activityService.log(req.workspace._id, req.user._id, 'task.assigned', 'task', task._id);
  }

  res.json({ success: true, data: populated });
});

const deleteTask = asyncHandler(async (req, res) => {
  const isCreator = req.task.createdBy.toString() === req.user._id.toString();
  if (!['OWNER', 'ADMIN'].includes(req.memberRole) && !isCreator) {
    throw new ApiError('Only the task creator or workspace admins can delete this task', 403);
  }

  const taskId = req.task._id;
  await Promise.all([
    Comment.deleteMany({ task: taskId }),
    Task.deleteOne({ _id: taskId }),
  ]);
  await invalidateTaskCache(req.project._id);

  const io = getIo();
  if (io) {
    io.to(roomFor(req.workspace._id)).emit('task:deleted', {
      workspaceId: req.workspace._id,
      taskId: taskId.toString(),
      projectId: req.project._id,
    });
  }

  res.json({ success: true, message: 'Task deleted' });
});

module.exports = { createTask, listTasks, getTaskOrList, updateTask, deleteTask, VALID_STATUSES, VALID_PRIORITIES };
