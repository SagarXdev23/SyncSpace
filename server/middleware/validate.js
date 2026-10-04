/**
 * Turns express-validator results into a 400 ApiError with field details.
 * Usage: router.post('/', [...checks], validate, controller)
 */
const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
  next(new ApiError('Validation failed', 400, errors));
}

module.exports = validate;
