/**
 * Global Error Handler Middleware
 * 
 * Centralized error handling for all routes with proper status codes and logging
 * 
 * @module middlewares/errorHandler
 */

const logger = require('../utils/logger').child('ErrorHandler');

/**
 * Custom application error class
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || `ERR_${statusCode}`;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 * @param {Error} err - Error object
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 */
function errorHandler(err, req, res, next) {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log error
  logger.error('Request error', err, {
    method: req.method,
    path: req.path,
    statusCode: error.statusCode,
    userId: req.user?.userId,
    ip: req.ip
  });

  // Database errors
  if (err.code === '23505') { // PostgreSQL unique violation
    const message = 'Resource already exists';
    error = new AppError(message, 409);
  } else if (err.code === '23503') { // Foreign key violation
    const message = 'Referenced resource does not exist';
    error = new AppError(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token', 401, 'ERR_INVALID_TOKEN');
  } else if (err.name === 'TokenExpiredError') {
    error = new AppError('Token expired', 401, 'ERR_TOKEN_EXPIRED');
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new AppError(message, 400, 'ERR_VALIDATION');
  }

  // Cast errors (MongoDB/ObjectID errors)
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new AppError(message, 404, 'ERR_NOT_FOUND');
  }

  // Default to 500 server error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  const code = error.code || 'ERR_INTERNAL_SERVER_ERROR';

  // Don't leak error details in production
  const response = {
    success: false,
    error: {
      message: statusCode === 500 && process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : message,
      code,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    }
  };

  res.status(statusCode).json(response);
}

/**
 * Async handler wrapper to catch errors in async route handlers
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  asyncHandler,
  AppError
};

