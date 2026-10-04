/**
 * User controller — user management for admin screens.
 * GET /api/users        -> paginated user list (searchable)
 * GET /api/users/stats  -> counts by role { total, admins, members, guests }
 */
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');

const getUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const search = (req.query.search || '').trim();
  const role = (req.query.role || '').trim();

  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  if (role && ['admin', 'member', 'guest'].includes(role)) {
    filter.role = role;
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('name email avatar role createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: users,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const getUserStats = asyncHandler(async (req, res) => {
  const [total, admins, members, guests] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ role: 'member' }),
    User.countDocuments({ role: 'guest' }),
  ]);

  res.json({
    success: true,
    data: { total, admins, members, guests },
  });
});

module.exports = { getUsers, getUserStats };
