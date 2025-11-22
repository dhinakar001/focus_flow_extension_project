/**
 * CSRF Protection Middleware
 * 
 * Protects against Cross-Site Request Forgery attacks
 * 
 * @module middlewares/csrf
 */

const crypto = require('crypto');
const logger = require('../utils/logger').child('CSRF');
const serverConfig = require('../server.config');

// CSRF secret from config or environment
const CSRF_SECRET = process.env.CSRF_SECRET || serverConfig.security?.csrfSecret || crypto.randomBytes(32).toString('hex');

// Store for CSRF tokens (in production, use Redis or similar)
const tokenStore = new Map();

// Token expiry time (10 minutes)
const TOKEN_TTL = 10 * 60 * 1000;

/**
 * Generates a CSRF token
 * @param {string} sessionId - Session ID
 * @returns {string} CSRF token
 */
function generateToken(sessionId) {
  const token = crypto.randomBytes(32).toString('hex');
  tokenStore.set(token, {
    sessionId,
    expiresAt: Date.now() + TOKEN_TTL
  });
  
  // Clean up expired tokens periodically
  if (tokenStore.size > 1000) {
    cleanupExpiredTokens();
  }
  
  return token;
}

/**
 * Validates a CSRF token
 * @param {string} token - CSRF token to validate
 * @param {string} sessionId - Session ID
 * @returns {boolean} True if token is valid
 */
function validateToken(token, sessionId) {
  if (!token || !sessionId) {
    return false;
  }
  
  const stored = tokenStore.get(token);
  
  if (!stored) {
    return false;
  }
  
  // Check expiration
  if (Date.now() > stored.expiresAt) {
    tokenStore.delete(token);
    return false;
  }
  
  // Check session match
  if (stored.sessionId !== sessionId) {
    return false;
  }
  
  return true;
}

/**
 * Cleans up expired tokens
 * @private
 */
function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [token, data] of tokenStore.entries()) {
    if (now > data.expiresAt) {
      tokenStore.delete(token);
    }
  }
}

/**
 * CSRF protection middleware
 * @param {express.Request} req - Express request
 * @param {express.Response} res - Express response
 * @param {express.NextFunction} next - Next middleware
 */
function csrfProtect(req, res, next) {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip CSRF for webhook endpoints (they use signature verification)
  if (req.path.startsWith('/payment/webhooks/')) {
    return next();
  }
  
  // Skip CSRF for health check
  if (req.path === '/health') {
    return next();
  }
  
  // Get token from header or body
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionId = req.session?.id || req.headers['x-session-id'] || 'anonymous';
  
  if (!token) {
    logger.warn('CSRF token missing', {
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    
    return res.status(403).json({
      success: false,
      error: {
        message: 'CSRF token missing',
        code: 'ERR_CSRF_TOKEN_MISSING'
      }
    });
  }
  
  if (!validateToken(token, sessionId)) {
    logger.warn('CSRF token validation failed', {
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    
    return res.status(403).json({
      success: false,
      error: {
        message: 'CSRF token invalid or expired',
        code: 'ERR_CSRF_TOKEN_INVALID'
      }
    });
  }
  
  // Token is valid - remove it (one-time use)
  tokenStore.delete(token);
  
  next();
}

/**
 * Middleware to generate CSRF token for response
 * @param {express.Request} req - Express request
 * @param {express.Response} res - Express response
 * @param {express.NextFunction} next - Next middleware
 */
function csrfToken(req, res, next) {
  const sessionId = req.session?.id || req.headers['x-session-id'] || 'anonymous';
  const token = generateToken(sessionId);
  
  // Attach token to response
  res.locals.csrfToken = token;
  res.setHeader('X-CSRF-Token', token);
  
  next();
}

module.exports = {
  csrfProtect,
  csrfToken,
  generateToken,
  validateToken
};

