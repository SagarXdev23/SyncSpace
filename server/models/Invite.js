const mongoose = require('mongoose');
const crypto = require('crypto');

const inviteSchema = new mongoose.Schema(
  {
    token: { type: String, unique: true, required: true },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    role: { type: String, enum: ['ADMIN', 'MEMBER'], default: 'MEMBER' },
    expiresAt: { type: Date, default: null },
    maxUses: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

inviteSchema.statics.generateToken = function () {
  return crypto.randomBytes(9).toString('base64url');
};

module.exports = mongoose.model('Invite', inviteSchema);
