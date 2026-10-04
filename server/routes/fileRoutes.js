const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { loadWorkspace, loadFileWorkspace } = require('../middleware/workspaceAuth');
const upload = require('../middleware/upload');
const { uploadFile, listFiles, deleteFile } = require('../controllers/fileController');

const router = express.Router();

router.use(protect);

// Multer parses the multipart body first so loadWorkspace can read body.workspaceId.
router.post('/', upload.single('file'), loadWorkspace, uploadFile);
router.get('/:workspaceId', loadWorkspace, listFiles);
router.delete('/:id', loadFileWorkspace, deleteFile);

module.exports = router;
