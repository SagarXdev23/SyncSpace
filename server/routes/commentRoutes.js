const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/authMiddleware');
const { loadTaskWorkspace, loadCommentWorkspace } = require('../middleware/workspaceAuth');
const {
  createComment,
  listComments,
  updateComment,
  deleteComment,
} = require('../controllers/commentController');

const router = express.Router();

router.use(protect);

const contentValidation = [
  body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Comment content is required (max 2000 chars)'),
];

const createValidation = [
  body('taskId').isMongoId().withMessage('Valid taskId is required'),
  ...contentValidation,
];

// loadTaskWorkspace resolves the workspace from body.taskId / params.taskId.
router.post('/', loadTaskWorkspace, createValidation, validate, createComment);
router.get('/:taskId', loadTaskWorkspace, listComments);
router.patch('/:id', loadCommentWorkspace, contentValidation, validate, updateComment);
router.delete('/:id', loadCommentWorkspace, deleteComment);

module.exports = router;
