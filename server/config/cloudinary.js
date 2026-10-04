/**
 * Cloudinary configuration for file uploads.
 * When credentials are missing the app still boots; upload endpoints then
 * answer 503 with a clear message instead of crashing.
 */
const cloudinary = require('cloudinary').v2;

let configured = false;

function initCloudinary() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.warn('[cloudinary] credentials missing — file uploads will return 503 "not configured"');
    return false;
  }
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
  console.log('[cloudinary] configured');
  return true;
}

function isCloudinaryConfigured() {
  return configured;
}

module.exports = { cloudinary, initCloudinary, isCloudinaryConfigured };
