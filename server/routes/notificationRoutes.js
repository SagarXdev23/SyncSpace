const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { listNotifications, markRead, markAllRead } = require('../controllers/notificationController');

const router = express.Router();

router.use(protect);

router.get('/', listNotifications);
// NOTE: /read-all must be registered before /:id.
router.patch('/read-all', markAllRead);
router.patch('/:id', markRead);

module.exports = router;
