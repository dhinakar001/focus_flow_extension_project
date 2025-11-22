/**
 * Input Validation Middleware
 * 
 * Validates and sanitizes user input to prevent SQL injection, XSS, and other attacks
 * 
 * @module middlewares/inputValidation
 */

const { body, param, query, validationResult } = require('express-validator');
const logger = require('../utils/logger').child('InputValidation');
const { AppError } = require('./errorHandler');

/**
 * Sanitizes a string to prevent XSS
 * @private
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(str) {
  if (typeof str !== 'string') {
    return String(str);
  }
  // Remove HTML tags and encode special characters
  return str
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

/**
 * Sanitizes an object recursively
 * @private
 * @param {any} obj - Object to sanitize
 * @returns {any} Sanitized object
 */
function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return typeof obj === 'string' ? sanitizeString(obj) : obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
  }
  return sanitized;
}

/**
 * Middleware to validate request and handle errors
 * @param {Array} validations - Express-validator validations
 * @returns {Array} Middleware array
 */
function validate(validations) {
  return [
    ...validations,
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation failed', {
          path: req.path,
          method: req.method,
          errors: errors.array()
        });
        
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'ERR_VALIDATION',
            details: errors.array()
          }
        });
      }
      next();
    }
  ];
}

/**
 * Sanitizes request body, query, and params
 * @param {express.Request} req - Express request
 * @param {express.Response} res - Express response
 * @param {express.NextFunction} next - Next middleware
 */
function sanitize(req, res, next) {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
}

/**
 * Common validation rules
 */
const validators = {
  // User ID validation
  userId: [
    param('userId')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 64 })
      .withMessage('User ID must be between 1 and 64 characters')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('User ID contains invalid characters')
  ],
  
  // Email validation
  email: [
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Invalid email address')
      .isLength({ max: 255 })
      .withMessage('Email must be less than 255 characters')
  ],
  
  // Password validation
  password: [
    body('password')
      .optional()
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
  ],
  
  // Mode name validation
  modeName: [
    body('name')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 120 })
      .withMessage('Mode name must be between 1 and 120 characters')
      .matches(/^[a-zA-Z0-9\s-_]+$/)
      .withMessage('Mode name contains invalid characters')
  ],
  
  // Duration validation
  duration: [
    body('durationMinutes')
      .optional()
      .isInt({ min: 1, max: 1440 }) // 1 minute to 24 hours
      .withMessage('Duration must be between 1 and 1440 minutes')
  ],
  
  // Limit validation for pagination
  limit: [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt()
  ],
  
  // Page validation for pagination
  page: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt()
  ],
  
  // User ID validation
  userId: [
    body('userId')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 64 })
      .withMessage('User ID must be between 1 and 64 characters')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('User ID contains invalid characters'),
    param('userId')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 64 })
      .withMessage('User ID must be between 1 and 64 characters')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('User ID contains invalid characters')
  ]
};

module.exports = {
  validate,
  sanitize,
  validators,
  sanitizeString,
  sanitizeObject
};

