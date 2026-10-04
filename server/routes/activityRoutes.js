const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getRecent } = require('../controllers/activityController');

const router = express.Router();

router.use(protect);
router.get('/recent', getRecent);

module.exports = router;
