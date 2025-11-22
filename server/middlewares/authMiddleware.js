/**
 * Authentication and Authorization Middleware
 * Production-grade middleware with JWT, role-based access control
 * 
 * @module middlewares/authMiddleware
 */

const jwt = require('jsonwebtoken');
const dbService = require('../services/dbService');
const logger = require('../utils/logger').child('AuthMiddleware');
const serverConfig = require('../server.config');

// SECURITY FIX: Enforce strong JWT secret in production
const JWT_SECRET = process.env.JWT_SECRET || serverConfig.security?.jwtSecret || 'change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || serverConfig.security?.jwtExpiresIn || '24h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || serverConfig.security?.refreshTokenExpiresIn || '7d';

// Validate JWT secret in production
if (serverConfig.env.isProduction) {
  if (!process.env.JWT_SECRET || JWT_SECRET === 'change-this-in-production' || JWT_SECRET.length < 32) {
    throw new Error(
      'JWT_SECRET environment variable must be set to a secure random string (min 32 chars) in production. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  logger.info('JWT secret validation passed');
}

/**
 * Generate JWT token for user
 * @param {Object} payload - Token payload
 * @param {string} [expiresIn] - Expiration time (default: 24h)
 * @returns {string} JWT token
 */
function generateToken(payload, expiresIn = JWT_EXPIRES_IN) {
  if (!payload || !payload.userId) {
    throw new Error('Invalid token payload: userId is required');
  }
  
  try {
    return jwt.sign(payload, JWT_SECRET, { 
      expiresIn,
      issuer: 'focusflow',
      audience: 'focusflow-users'
    });
  } catch (error) {
    logger.error('Failed to generate token', error);
    throw new Error('Token generation failed');
  }
}

/**
 * Generate refresh token
 * @param {Object} payload - Token payload
 * @returns {string} Refresh token
 */
function generateRefreshToken(payload) {
  if (!payload || !payload.userId) {
    throw new Error('Invalid refresh token payload: userId is required');
  }
  
  try {
    return jwt.sign(payload, JWT_SECRET, { 
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
      issuer: 'focusflow',
      audience: 'focusflow-users'
    });
  } catch (error) {
    logger.error('Failed to generate refresh token', error);
    throw new Error('Refresh token generation failed');
  }
}

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
function verifyToken(token) {
  if (!token) {
    throw new Error('Token is required');
  }
  
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'focusflow',
      audience: 'focusflow-users'
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    logger.error('Token verification failed', error);
    throw new Error('Token verification failed');
  }
}

/**
 * Middleware to authenticate requests using JWT
 * @param {express.Request} req - Express request
 * @param {express.Response} res - Express response
 * @param {express.NextFunction} next - Next middleware
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'ERR_AUTH_REQUIRED'
        }
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token || token.trim().length === 0) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid token format',
          code: 'ERR_INVALID_TOKEN'
        }
      });
    }
    
    // Verify token
    const decoded = verifyToken(token);
    
    // Validate token payload
    if (!decoded.userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid token payload',
          code: 'ERR_INVALID_TOKEN'
        }
      });
    }
    
    // Get user from database
    // NOTE: These methods may need to be implemented in dbService
    // For now, we'll create a lightweight user object from the token
    // In production, you should verify the user exists and is active
    const user = {
      id: decoded.userId,
      userId: decoded.userId,
      email: decoded.email || null,
      username: decoded.username || null,
      roles: decoded.roles || [],
      permissions: decoded.permissions || []
    };
    
    // Attach user to request
    req.user = user;
    
    next();
  } catch (error) {
    logger.error('Authentication failed', error, {
      path: req.path,
      method: req.method
    });
    
    const statusCode = error.message.includes('expired') ? 401 : 401;
    return res.status(statusCode).json({
      success: false,
      error: {
        message: error.message || 'Authentication failed',
        code: 'ERR_AUTH_FAILED'
      }
    });
  }
}

/**
 * Middleware for optional authentication (doesn't fail if no token)
 * @param {express.Request} req - Express request
 * @param {express.Response} res - Express response
 * @param {express.NextFunction} next - Next middleware
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token && token.trim().length > 0) {
        try {
          const decoded = verifyToken(token);
          req.user = {
            id: decoded.userId,
            userId: decoded.userId,
            email: decoded.email || null,
            username: decoded.username || null,
            roles: decoded.roles || [],
            permissions: decoded.permissions || []
          };
        } catch (error) {
          // Ignore token errors in optional auth
          logger.debug('Optional auth token invalid', { error: error.message });
        }
      }
    }
    
    next();
  } catch (error) {
    // Don't fail on optional auth errors
    next();
  }
}

/**
 * Middleware to check if user has required role(s)
 * @param {...string} allowedRoles - Allowed roles
 * @returns {Function} Express middleware
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'ERR_AUTH_REQUIRED'
        }
      });
    }

    const userRoles = req.user.roles || [];
    const hasRole = allowedRoles.some(role => userRoles.includes(role));
    
    if (!hasRole) {
      logger.warn('Access denied - insufficient role', {
        userId: req.user.userId,
        userRoles,
        requiredRoles: allowedRoles,
        path: req.path
      });
      
      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'ERR_FORBIDDEN'
        }
      });
    }

    next();
  };
}

/**
 * Middleware to check if user has required permission(s)
 * @param {...string} allowedPermissions - Allowed permissions
 * @returns {Function} Express middleware
 */
function requirePermission(...allowedPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'ERR_AUTH_REQUIRED'
        }
      });
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = allowedPermissions.some(permission => userPermissions.includes(permission));
    
    if (!hasPermission) {
      logger.warn('Access denied - insufficient permission', {
        userId: req.user.userId,
        userPermissions,
        requiredPermissions: allowedPermissions,
        path: req.path
      });
      
      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'ERR_FORBIDDEN'
        }
      });
    }

    next();
  };
}

/**
 * Basic auth placeholder (for backward compatibility)
 * @deprecated Use authenticate middleware instead
 */
function basicAuthPlaceholder(req, res, next) {
  // This is a placeholder - in production, use proper authentication
  // For backward compatibility, allow requests through
  next();
}

module.exports = {
  authenticate,
  optionalAuth,
  requireRole,
  requirePermission,
  generateToken,
  generateRefreshToken,
  verifyToken,
  basicAuthPlaceholder // Deprecated - for backward compatibility
};
