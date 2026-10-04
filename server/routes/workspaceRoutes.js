const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const { loadWorkspace, requireRole } = require('../middleware/workspaceAuth');
const {
  createWorkspace,
  listWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  addMember,
  updateMemberRole,
  removeMember,
  getActivity,
} = require('../controllers/workspaceController');

const router = express.Router();

router.use(protect);

const createValidation = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Workspace name is required (max 100 chars)'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description max 1000 chars'),
];

const updateValidation = [
  body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Name max 100 chars'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description max 1000 chars'),
];

const addMemberValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('role').optional().isIn(['MEMBER', 'ADMIN']).withMessage('Role must be MEMBER or ADMIN'),
];

const roleValidation = [
  body('role').isIn(['OWNER', 'ADMIN', 'MEMBER']).withMessage('Role must be OWNER, ADMIN or MEMBER'),
];

router.post('/', upload.single('logo'), createValidation, validate, createWorkspace);
router.get('/', listWorkspaces);
router.get('/:id/activity', loadWorkspace, getActivity);
router.get('/:id', loadWorkspace, getWorkspace);
router.patch('/:id', loadWorkspace, requireRole('OWNER', 'ADMIN'), upload.single('logo'), updateValidation, validate, updateWorkspace);
router.delete('/:id', loadWorkspace, requireRole('OWNER'), deleteWorkspace);

router.post('/:id/members', loadWorkspace, requireRole('OWNER', 'ADMIN'), addMemberValidation, validate, addMember);
router.patch('/:id/members/:userId', loadWorkspace, requireRole('OWNER', 'ADMIN'), roleValidation, validate, updateMemberRole);
router.delete('/:id/members/:userId', loadWorkspace, requireRole('OWNER', 'ADMIN'), removeMember);

module.exports = router;
