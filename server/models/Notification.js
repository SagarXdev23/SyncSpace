const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // e.g. task.assigned, workspace.invite, comment.added, task.updated
    type: { type: String, required: true },
    message: { type: String, required: true, maxlength: 500 },
    read: { type: Boolean, default: false },
    relatedEntity: {
      kind: { type: String }, // task | workspace | comment | project ...
      id: { type: mongoose.Schema.Types.ObjectId },
    },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
