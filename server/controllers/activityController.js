/**
 * Activity controller — cross-workspace recent activity for the dashboard.
 * GET /api/activity/recent?limit=10
 */
const asyncHandler = require('../utils/asyncHandler');
const Activity = require('../models/Activity');
const { userWorkspaceIds } = require('./statsController');

const getRecent = asyncHandler(async (req, res) => {
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const workspaces = await userWorkspaceIds(req.user._id);
  const wsIds = workspaces.map((w) => w._id);

  const items = wsIds.length
    ? await Activity.find({ workspace: { $in: wsIds } })
        .populate('user', 'name avatar')
        .populate('workspace', 'name')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()
    : [];

  res.json({ success: true, data: items });
});

module.exports = { getRecent };
