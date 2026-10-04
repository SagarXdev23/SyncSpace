const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: [true, 'Message content is required'], trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

messageSchema.index({ workspace: 1, _id: -1 });

module.exports = mongoose.model('Message', messageSchema);
