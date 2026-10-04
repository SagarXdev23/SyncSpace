/**
 * Multer upload middleware — memory storage, 25MB cap.
 * Buffers are streamed straight to Cloudinary; bytes are never written
 * to disk or stored in MongoDB.
 */
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

module.exports = upload;
