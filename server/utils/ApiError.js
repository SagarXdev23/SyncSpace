/**
 * Operational error with an explicit HTTP status code.
 * Throw these from controllers/services/middleware; the centralized
 * error middleware turns them into consistent JSON responses.
 */
class ApiError extends Error {
  constructor(message, statusCode = 500, errors = undefined) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    if (errors !== undefined) this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
