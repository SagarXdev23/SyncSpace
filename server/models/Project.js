const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: [true, 'Project name is required'], trim: true, maxlength: 120 },
    description: { type: String, default: '', trim: true, maxlength: 2000 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

projectSchema.index({ workspace: 1, createdAt: -1 });

module.exports = mongoose.model('Project', projectSchema);
