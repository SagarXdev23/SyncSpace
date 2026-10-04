const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // e.g. workspace.created, member.added, project.created, task.created,
    // task.assigned, task.completed, file.uploaded, comment.added
    action: { type: String, required: true },
    entity: {
      kind: { type: String }, // project | task | comment | file | member ...
      id: { type: mongoose.Schema.Types.ObjectId },
    },
  },
  { timestamps: true }
);

activitySchema.index({ workspace: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
