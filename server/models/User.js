const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 80 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Never selected by default — must be explicitly requested with +password.
    password: { type: String, required: [true, 'Password is required'], minlength: 8, select: false },
    avatar: { type: String, default: '' },
    avatarPublicId: { type: String, default: '', select: false },
    bio: { type: String, default: '', maxlength: 300 },
    // Global role for admin/user management screens.
    role: { type: String, enum: ['admin', 'member', 'guest'], default: 'member' },
    // SHA-256 hashes of active refresh tokens (raw tokens are never stored).
    refreshTokens: { type: [refreshTokenSchema], default: [], select: false },
    // Password reset: only the SHA-256 hash of the token is stored.
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpire: { type: Date, select: false },
  },
  { timestamps: true }
);

// Hash password with bcrypt (12 rounds) whenever it is created/changed.
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

/** Public representation — password / refresh tokens are never exposed. */
userSchema.methods.toSafeJSON = function () {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    avatar: this.avatar,
    bio: this.bio,
    role: this.role,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('User', userSchema);
