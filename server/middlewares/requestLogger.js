/**
 * Request Logging Middleware
 * 
 * Logs all incoming requests with method, path, status code, and response time
 * 
 * @module middlewares/requestLogger
 */

const logger = require('../utils/logger').child('RequestLogger');

/**
 * Request logging middleware
 * Logs request details and response time
 * 
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 */
function requestLogger(req, res, next) {
  const startTime = Date.now();

  // Log request start
  logger.debug('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    
    // Log response
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    };

    if (res.statusCode >= 500) {
      logger.error('Request failed', null, logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request error', logData);
    } else {
      logger.debug('Request completed', logData);
    }

    // Call original end
    originalEnd.call(this, chunk, encoding);
  };

  next();
}

module.exports = { requestLogger };

