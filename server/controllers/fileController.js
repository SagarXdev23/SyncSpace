/**
 * File sharing controller (Cloudinary-backed).
 * Upload flow: multipart buffer → Cloudinary upload_stream → metadata saved
 * in MongoDB. File bytes are never stored in MongoDB.
 */
const stream = require('stream');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const File = require('../models/File');
const cacheService = require('../services/cacheService');
const activityService = require('../services/activityService');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');
const { getIo } = require('../sockets/socketHandler');

function uploadBufferToCloudinary(buffer, filename) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'syncspace',
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true,
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    bufferStream.pipe(uploadStream);
    bufferStream.on('error', reject);
  });
}

const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError('No file provided — attach it as the "file" field', 400);
  }
  if (!isCloudinaryConfigured()) {
    throw new ApiError('File uploads are not configured on this server', 503);
  }

  let result;
  try {
    result = await uploadBufferToCloudinary(req.file.buffer, req.file.originalname);
  } catch (err) {
    throw new ApiError(`Cloudinary upload failed: ${err.message}`, 502);
  }

  const fileDoc = await File.create({
    workspace: req.workspace._id,
    uploadedBy: req.user._id,
    filename: req.file.originalname,
    url: result.secure_url,
    publicId: result.public_id,
    resourceType: result.resource_type || 'raw',
    size: result.bytes || req.file.size,
    mimeType: req.file.mimetype,
  });

  await cacheService.del(cacheService.keys.files(req.workspace._id.toString()));
  await activityService.log(req.workspace._id, req.user._id, 'file.uploaded', 'file', fileDoc._id);

  const io = getIo();
  if (io) {
    io.to(`workspace:${req.workspace._id}`).emit('file:uploaded', {
      workspaceId: req.workspace._id,
      file: fileDoc.toObject(),
    });
  }

  res.status(201).json({ success: true, data: fileDoc.toObject() });
});

const listFiles = asyncHandler(async (req, res) => {
  const cacheKey = cacheService.keys.files(req.workspace._id.toString());
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    return res.json({ success: true, data: cached, cached: true });
  }

  const files = await File.find({ workspace: req.workspace._id })
    .populate('uploadedBy', 'name avatar')
    .sort({ createdAt: -1 })
    .lean();

  await cacheService.set(cacheKey, files, 120);
  res.json({ success: true, data: files });
});

const deleteFile = asyncHandler(async (req, res) => {
  const file = req.fileDoc;
  const isUploader = file.uploadedBy.toString() === req.user._id.toString();
  if (!isUploader && !['OWNER', 'ADMIN'].includes(req.memberRole)) {
    throw new ApiError('Only the uploader or workspace admins can delete this file', 403);
  }

  // Best-effort Cloudinary cleanup — the DB record is removed regardless.
  try {
    if (isCloudinaryConfigured()) {
      await cloudinary.uploader.destroy(file.publicId, { resource_type: file.resourceType || 'raw' });
    }
  } catch (err) {
    console.warn(`[files] cloudinary destroy failed for ${file.publicId}: ${err.message}`);
  }

  await File.deleteOne({ _id: file._id });
  await cacheService.del(cacheService.keys.files(req.workspace._id.toString()));

  const io = getIo();
  if (io) {
    io.to(`workspace:${req.workspace._id}`).emit('file:deleted', {
      workspaceId: req.workspace._id,
      fileId: file._id.toString(),
    });
  }

  res.json({ success: true, message: 'File deleted' });
});

module.exports = { uploadFile, listFiles, deleteFile };
