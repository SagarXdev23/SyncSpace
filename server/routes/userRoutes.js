const express = require('express');
const ApiError = require('../utils/ApiError');
const { getUsers, getUserStats } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(new ApiError('Admin access required', 403));
  }
  next();
};

router.get('/stats', requireAdmin, getUserStats);
router.get('/', requireAdmin, getUsers);

module.exports = router;
