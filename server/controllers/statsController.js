/**
 * Stats controller — dashboard aggregates for the logged-in user.
 * GET /api/stats -> { workspaces, projects, tasks, members }
 * GET /api/stats/admin -> { totalUsers, activeProjects, totalTasks, filesStored }
 */
const asyncHandler = require('../utils/asyncHandler');
const Workspace = require('../models/Workspace');
const Project = require('../models/Project');
const Task = require('../models/Task');
const File = require('../models/File');
const User = require('../models/User');

async function userWorkspaceIds(userId) {
  const list = await Workspace.find({ 'members.user': userId }).select('_id members').lean();
  return list;
}

const getStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const workspaces = await userWorkspaceIds(userId);
  const wsIds = workspaces.map((w) => w._id);

  const [projectCount, taskCount] = await Promise.all([
    wsIds.length ? Project.countDocuments({ workspace: { $in: wsIds } }) : 0,
    wsIds.length
      ? Task.countDocuments({
          project: {
            $in: await Project.find({ workspace: { $in: wsIds } }).distinct('_id'),
          },
        })
      : 0,
  ]);

  // Unique members across the user's workspaces.
  const memberIds = new Set();
  for (const w of workspaces) {
    for (const m of w.members || []) memberIds.add(String(m.user));
  }

  res.json({
    success: true,
    data: {
      workspaces: workspaces.length,
      projects: projectCount,
      tasks: taskCount,
      members: memberIds.size,
    },
  });
});

/**
 * Admin dashboard aggregates — global counts across the system.
 * GET /api/stats/admin -> { totalUsers, activeProjects, totalTasks, filesStored }
 */
const getAdminStats = asyncHandler(async (req, res) => {
  const [totalUsers, activeProjects, totalTasks, filesAgg] = await Promise.all([
    User.countDocuments({}),
    Project.countDocuments({ status: { $ne: 'archived' } }),
    Task.countDocuments({}),
    File.aggregate([{ $group: { _id: null, total: { $sum: '$size' } } }]),
  ]);

  res.json({
    success: true,
    data: {
      totalUsers,
      activeProjects,
      totalTasks,
      filesStored: filesAgg[0]?.total || 0,
    },
  });
});

module.exports = { getStats, getAdminStats, userWorkspaceIds };
