const multer = require('multer');
const ApiError = require('../utils/ApiError');

module.exports = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, callback) {
    if (!file.mimetype.startsWith('image/')) {
      return callback(new ApiError('Profile photo must be an image', 400));
    }
    callback(null, true);
  },
});
