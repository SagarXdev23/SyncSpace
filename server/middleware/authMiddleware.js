/**
 * JWT authentication middleware ("who are you?").
 * Expects `Authorization: Bearer <accessToken>`. Attaches the user document
 * (without password / refresh tokens) as req.user.
 */
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyAccessToken } = require('../utils/generateToken');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new ApiError('Not authenticated — missing bearer token', 401);
  }

  let payload;
  try {
    payload = verifyAccessToken(header.split(' ')[1]);
  } catch (err) {
    throw new ApiError('Invalid or expired access token', 401);
  }

  const user = await User.findById(payload.sub).select('-password -refreshTokens');
  if (!user) {
    throw new ApiError('User no longer exists', 401);
  }

  req.user = user;
  next();
});

module.exports = { protect };
