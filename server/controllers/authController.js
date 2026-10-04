/**
 * Authentication controller.
 * - register: create user, hash password (bcrypt, pre-save hook), issue tokens
 * - login: verify credentials, issue tokens, store refresh-token hash (cap 5)
 * - refresh: verify cookie, rotate pair; reuse of a rotated token revokes ALL sessions
 * - logout: revoke the presented refresh token, clear cookie
 * - me: current user profile (password never included)
 */
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} = require('../utils/generateToken');
const { setRefreshCookie, clearRefreshCookie, MAX_REFRESH_TOKENS } = require('../services/authService');
const { sendMail } = require('../services/emailService');
const crypto = require('crypto');
const stream = require('stream');
const User = require('../models/User');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

function uploadAvatarBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'syncspace/avatars',
        resource_type: 'image',
        transformation: [{ width: 512, height: 512, crop: 'limit' }],
      },
      (err, result) => (err ? reject(err) : resolve(result)),
    );
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    bufferStream.pipe(uploadStream);
    bufferStream.on('error', reject);
  });
}

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    throw new ApiError('An account with this email already exists', 409);
  }

  const user = await User.create({ name: name.trim(), email: email.toLowerCase().trim(), password });

  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);
  user.refreshTokens.push({ tokenHash: hashToken(refreshToken) });
  await user.save();
  setRefreshCookie(res, refreshToken);

  res.status(201).json({
    success: true,
    message: 'Account created',
    data: { user: user.toSafeJSON(), accessToken },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password +refreshTokens');
  if (!user || !(await user.comparePassword(password))) {
    // Same message for unknown email / wrong password (no user enumeration).
    throw new ApiError('Invalid email or password', 401);
  }

  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  // Cap stored sessions (~devices); drop the oldest first.
  while (user.refreshTokens.length >= MAX_REFRESH_TOKENS) {
    user.refreshTokens.shift();
  }
  user.refreshTokens.push({ tokenHash: hashToken(refreshToken) });
  await user.save();
  setRefreshCookie(res, refreshToken);

  res.json({
    success: true,
    message: 'Logged in',
    data: { user: user.toSafeJSON(), accessToken },
  });
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) {
    throw new ApiError('Refresh token missing', 401);
  }

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch (err) {
    clearRefreshCookie(res);
    throw new ApiError('Invalid or expired refresh token', 401);
  }

  const user = await User.findById(payload.sub).select('+refreshTokens');
  const presentedHash = hashToken(token);
  const index = user ? user.refreshTokens.findIndex((rt) => rt.tokenHash === presentedHash) : -1;

  if (!user || index === -1) {
    // Reuse detection: signature is valid but the token hash is unknown —
    // a rotated/stolen token is being replayed. Revoke every session.
    if (user) {
      user.refreshTokens = [];
      await user.save();
    }
    clearRefreshCookie(res);
    throw new ApiError('Invalid refresh token — all sessions revoked', 401);
  }

  // Rotate: drop the used token, issue a fresh pair.
  user.refreshTokens.splice(index, 1);
  const newRefreshToken = signRefreshToken(user._id);
  const newAccessToken = signAccessToken(user._id);
  user.refreshTokens.push({ tokenHash: hashToken(newRefreshToken) });
  await user.save();
  setRefreshCookie(res, newRefreshToken);

  res.json({ success: true, data: { accessToken: newAccessToken } });
});

const logout = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      await User.updateOne(
        { _id: payload.sub },
        { $pull: { refreshTokens: { tokenHash: hashToken(token) } } }
      );
    } catch (err) {
      // Expired/forged token — nothing to revoke server-side.
    }
  }
  clearRefreshCookie(res);
  res.json({ success: true, message: 'Logged out' });
});

const me = asyncHandler(async (req, res) => {
  // req.user comes from `protect` and already excludes password/refreshTokens.
  res.json({ success: true, data: { user: req.user } });
});

/**
 * PUT /api/auth/profile { name?, bio?, avatar? }
 * Updates the logged-in user's profile.
 */
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  const { name, bio, avatar } = req.body;
  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (!trimmed) {
      res.status(400);
      throw new Error('Name is required');
    }
    user.name = trimmed.slice(0, 80);
  }
  if (bio !== undefined) user.bio = String(bio).slice(0, 300);
  if (avatar !== undefined) user.avatar = String(avatar).slice(0, 500);
  await user.save();
  res.json({ success: true, data: { user: user.toSafeJSON() } });
});

const uploadProfileAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError('Choose an image to upload', 400);
  }
  if (!isCloudinaryConfigured()) {
    throw new ApiError('Profile photo uploads are not configured on this server', 503);
  }

  let uploaded;
  try {
    uploaded = await uploadAvatarBuffer(req.file.buffer);
  } catch (err) {
    throw new ApiError(`Profile photo upload failed: ${err.message}`, 502);
  }

  const user = await User.findById(req.user._id).select('+avatarPublicId');
  if (!user) {
    try {
      await cloudinary.uploader.destroy(uploaded.public_id, { resource_type: 'image' });
    } catch (err) {
      console.warn(`[profile] orphan avatar cleanup failed for ${uploaded.public_id}: ${err.message}`);
    }
    throw new ApiError('User not found', 404);
  }

  const oldPublicId = user.avatarPublicId;
  user.avatar = uploaded.secure_url;
  user.avatarPublicId = uploaded.public_id;
  await user.save();

  if (oldPublicId && oldPublicId !== uploaded.public_id) {
    try {
      await cloudinary.uploader.destroy(oldPublicId, { resource_type: 'image' });
    } catch (err) {
      console.warn(`[profile] old avatar cleanup failed for ${oldPublicId}: ${err.message}`);
    }
  }

  res.json({ success: true, data: { user: user.toSafeJSON() } });
});

/**
 * POST /api/auth/forgot-password { email }
 * Issues a single-use reset token (1h expiry). Always returns the same
 * generic message so attackers can't enumerate registered emails.
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const user = await User.findOne({ email });

  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = hashToken(token);
    user.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    const base = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0];
    const resetUrl = `${base}/reset-password/${token}`;
    const text =
      `You requested a password reset for your SyncSpace account.\n\n` +
      `Reset your password here (valid for 1 hour):\n${resetUrl}\n\n` +
      `If you didn't request this, you can safely ignore this email.`;
    try {
      await sendMail({ to: user.email, subject: 'Reset your SyncSpace password', text });
    } catch (err) {
      // Email failure must not leak whether the account exists.
      console.error('[auth] forgot-password email failed:', err.message);
    }
  }

  res.json({ success: true, message: 'If an account exists for that email, a reset link has been sent.' });
});

/**
 * POST /api/auth/reset-password { token, password }
 * Consumes a reset token, sets the new password, and revokes all sessions.
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const user = await User.findOne({
    resetPasswordToken: hashToken(String(token || '')),
    resetPasswordExpire: { $gt: new Date() },
  }).select('+resetPasswordToken +resetPasswordExpire +refreshTokens');

  if (!user) {
    throw new ApiError('Reset link is invalid or has expired', 400);
  }

  user.password = password; // hashed by the pre-save hook
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  user.refreshTokens = []; // revoke all sessions on password change
  await user.save();

  res.json({ success: true, message: 'Password has been reset. Please log in again.' });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  me,
  updateProfile,
  uploadProfileAvatar,
  forgotPassword,
  resetPassword,
};
