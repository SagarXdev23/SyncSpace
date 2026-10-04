/**
 * JWT helpers for the access/refresh token pair, plus SHA-256 hashing of
 * refresh tokens (only the hash is ever persisted, never the raw token).
 */
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';

function signAccessToken(userId) {
  return jwt.sign(
    { sub: userId.toString(), type: 'access', jti: crypto.randomUUID() },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

function signRefreshToken(userId) {
  // jti guarantees every issued token is unique — without it, two tokens
  // minted within the same second would be byte-identical and rotation
  // would silently fail to invalidate the old one.
  return jwt.sign(
    { sub: userId.toString(), type: 'refresh', jti: crypto.randomUUID() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
}

function verifyAccessToken(token) {
  const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  if (payload.type !== 'access') throw new Error('Not an access token');
  return payload;
}

function verifyRefreshToken(token) {
  const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  if (payload.type !== 'refresh') throw new Error('Not a refresh token');
  return payload;
}

/** One-way hash used to store refresh tokens on the user document. */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  ACCESS_EXPIRES_IN,
  REFRESH_EXPIRES_IN,
};
