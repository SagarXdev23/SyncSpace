/**
 * Centralized error handling.
 * Produces consistent JSON: { success: false, message, errors? }.
 * Stack traces are only included in development; production never leaks them.
 */
const ApiError = require('../utils/ApiError');

function notFound(req, res, next) {
  next(new ApiError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors; // ApiError may carry structured field errors

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => e.message);
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid id format';
  } else if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate value — resource already exists';
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Invalid or expired token';
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    message = err.field === 'avatar'
      ? 'Profile photo too large — maximum 5MB'
      : 'File too large — maximum 25MB';
  } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    message = err.field === 'avatar'
      ? 'Unexpected file field — use "avatar"'
      : 'Unexpected file field — use "file"';
  }

  if (statusCode >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
    if (process.env.NODE_ENV === 'production') {
      message = 'Internal server error';
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
    ...(process.env.NODE_ENV === 'development' && err.stack ? { stack: err.stack } : {}),
  });
}

module.exports = { notFound, errorHandler };
