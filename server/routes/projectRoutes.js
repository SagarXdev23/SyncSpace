const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/authMiddleware');
const { loadWorkspace, loadProjectWorkspace, requireRole } = require('../middleware/workspaceAuth');
const {
  createProject,
  getProjectOrList,
  listAllProjects,
  updateProject,
  deleteProject,
} = require('../controllers/projectController');

const router = express.Router();

router.use(protect);

const createValidation = [
  body('workspaceId').isMongoId().withMessage('Valid workspaceId is required'),
  body('name').trim().isLength({ min: 1, max: 120 }).withMessage('Project name is required (max 120 chars)'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description max 2000 chars'),
];

const updateValidation = [
  body('name').optional().trim().isLength({ min: 1, max: 120 }).withMessage('Name max 120 chars'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description max 2000 chars'),
];

// loadWorkspace resolves the workspace from body.workspaceId for creation.
router.post('/', loadWorkspace, createValidation, validate, createProject);
// All projects across the caller's workspaces (dashboard "Recent Projects").
router.get('/', listAllProjects);
// Dual route: :param is a project id (detail) or a workspace id (list).
router.get('/:param', getProjectOrList);
router.patch('/:id', loadProjectWorkspace, requireRole('OWNER', 'ADMIN'), updateValidation, validate, updateProject);
router.delete('/:id', loadProjectWorkspace, requireRole('OWNER', 'ADMIN'), deleteProject);

module.exports = router;
