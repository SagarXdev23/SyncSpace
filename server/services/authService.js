/**
 * Auth service: refresh-token cookie helpers.
 * The refresh token travels in an httpOnly cookie (secure in production,
 * SameSite lax). Only its SHA-256 hash is persisted on the user document.
 */
const REFRESH_COOKIE = 'refreshToken';
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_REFRESH_TOKENS = 5; // cap stored sessions (~devices) per user

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  };
}

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, { ...cookieOptions(), maxAge: REFRESH_MAX_AGE_MS });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, cookieOptions());
}

module.exports = { setRefreshCookie, clearRefreshCookie, REFRESH_COOKIE, MAX_REFRESH_TOKENS };
