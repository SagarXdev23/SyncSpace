const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');
const avatarUpload = require('../middleware/avatarUpload');
const {
  register,
  login,
  refresh,
  logout,
  me,
  updateProfile,
  uploadProfileAvatar,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');

const router = express.Router();

const registerValidation = [
  body('name').trim().isLength({ min: 1, max: 80 }).withMessage('Name is required (max 80 chars)'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

router.post('/register', authLimiter, registerValidation, validate, register);
router.post('/login', authLimiter, loginValidation, validate, login);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', logout);
router.get('/me', protect, me);
router.put('/profile', protect, updateProfile);
router.post('/profile/avatar', protect, avatarUpload.single('avatar'), uploadProfileAvatar);
router.post(
  '/forgot-password',
  authLimiter,
  [body('email').isEmail().withMessage('Valid email is required').normalizeEmail()],
  validate,
  forgotPassword
);
router.post(
  '/reset-password',
  authLimiter,
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validate,
  resetPassword
);

module.exports = router;
