const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/authMiddleware');
const { loadProjectWorkspace, loadTaskWorkspace } = require('../middleware/workspaceAuth');
const {
  createTask,
  listTasks,
  getTaskOrList,
  updateTask,
  deleteTask,
  VALID_STATUSES,
  VALID_PRIORITIES,
} = require('../controllers/taskController');

const router = express.Router();

router.use(protect);

const createValidation = [
  body('projectId').isMongoId().withMessage('Valid projectId is required'),
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Task title is required (max 200 chars)'),
  body('description').optional().trim().isLength({ max: 5000 }).withMessage('Description max 5000 chars'),
  body('status').optional().isIn(VALID_STATUSES).withMessage('Invalid status'),
  body('priority').optional().isIn(VALID_PRIORITIES).withMessage('Invalid priority'),
  body('assignedTo').optional({ nullable: true }).isMongoId().withMessage('assignedTo must be a user id'),
  body('dueDate').optional({ nullable: true }).isISO8601().withMessage('dueDate must be a valid date'),
];

const updateValidation = [
  body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Title max 200 chars'),
  body('description').optional().trim().isLength({ max: 5000 }).withMessage('Description max 5000 chars'),
  body('status').optional().isIn(VALID_STATUSES).withMessage('Invalid status'),
  body('priority').optional().isIn(VALID_PRIORITIES).withMessage('Invalid priority'),
  body('assignedTo').optional({ nullable: true }).isMongoId().withMessage('assignedTo must be a user id'),
  body('dueDate').optional({ nullable: true }).isISO8601().withMessage('dueDate must be a valid date'),
];

// loadProjectWorkspace resolves the workspace from body.projectId for creation.
router.post('/', loadProjectWorkspace, createValidation, validate, createTask);
// List tasks of a project (supports ?status= filter).
router.get('/project/:projectId', loadProjectWorkspace, listTasks);
// Dual route: :param is a task id (detail) or a project id (list).
router.get('/:param', getTaskOrList);
router.patch('/:id', loadTaskWorkspace, updateValidation, validate, updateTask);
router.delete('/:id', loadTaskWorkspace, deleteTask);

module.exports = router;
