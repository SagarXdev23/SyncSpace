const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getStats, getAdminStats } = require('../controllers/statsController');

const router = express.Router();

router.use(protect);
router.get('/admin', getAdminStats);
router.get('/', getStats);

module.exports = router;
