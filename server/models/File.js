const mongoose = require('mongoose');

/**
 * File metadata only — file bytes live on Cloudinary, never in MongoDB.
 */
const fileSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    filename: { type: String, required: true },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    resourceType: { type: String, default: 'raw' }, // image | video | raw | auto
    size: { type: Number, required: true }, // bytes
    mimeType: { type: String, default: '' },
  },
  { timestamps: true }
);

fileSchema.index({ workspace: 1, createdAt: -1 });

module.exports = mongoose.model('File', fileSchema);
