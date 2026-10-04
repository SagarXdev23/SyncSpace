const express = require('express');
const { body } = require('express-validator');
const {
  createInvite,
  listInvites,
  getInvite,
  acceptInvite,
} = require('../controllers/inviteController');
const { protect } = require('../middleware/authMiddleware');
const { loadWorkspace, requireRole } = require('../middleware/workspaceAuth');
const validate = require('../middleware/validate');

const router = express.Router();

router.get('/:token', getInvite);
router.use(protect);
router.post(
  '/',
  loadWorkspace,
  requireRole('OWNER', 'ADMIN'),
  [
    body('role').optional().isIn(['ADMIN', 'MEMBER']).withMessage('Role must be ADMIN or MEMBER'),
    body('expiresInDays').optional().isInt({ min: 0, max: 365 }),
    body('maxUses').optional({ nullable: true }).isInt({ min: 1 }),
  ],
  validate,
  createInvite,
);
router.get('/', listInvites);
router.post(
  '/accept',
  [body('token').trim().isLength({ min: 1, max: 64 }).withMessage('Invite token is required')],
  validate,
  acceptInvite,
);

module.exports = router;
