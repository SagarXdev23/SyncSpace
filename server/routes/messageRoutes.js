const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/authMiddleware');
const { loadWorkspace, loadTaskWorkspace } = require('../middleware/workspaceAuth');
const { listMessages, createMessage } = require('../controllers/messageController');

const router = express.Router();

router.use(protect);

const createValidation = [
  body('workspaceId').isMongoId().withMessage('Valid workspaceId is required'),
  body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Message content is required (max 2000 chars)'),
];

router.get('/:workspaceId', loadWorkspace, listMessages);
router.post('/', loadWorkspace, createValidation, validate, createMessage);

module.exports = router;
