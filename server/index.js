/**
 * FocusFlow Server Entry Point
 * 
 * Production-grade Express server with comprehensive middleware, routing, and error handling.
 * 
 * @module server/index
 * @requires express
 * @requires dotenv
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configuration
const serverConfig = require('./server.config');
const logger = require('./utils/logger').child('Server');
const schedulers = require('./schedulers');

// Routes
const authRoutes = require('./routes/auth');
const botRoutes = require('./routes/bot');
const modeRoutes = require('./routes/modes');
const scheduleRoutes = require('./routes/schedule');
const statsRoutes = require('./routes/stats');
const missedMessagesRoutes = require('./routes/missedMessages');
const aiRoutes = require('./routes/ai');
const subscriptionRoutes = require('./routes/subscription');
const paymentRoutes = require('./routes/payment');
const adminRoutes = require('./routes/admin');

// Middleware
const { errorHandler } = require('./middlewares/errorHandler');
const { requestLogger } = require('./middlewares/requestLogger');
const { sanitize } = require('./middlewares/inputValidation');
const { csrfProtect, csrfToken } = require('./middlewares/csrf');

/**
 * Creates and configures Express application with all middleware and routes
 * @returns {express.Application} Configured Express application
 */
function initializeApp() {
  const app = express();

  // Trust proxy (for production behind reverse proxy)
  if (serverConfig.env.isProduction) {
    app.set('trust proxy', 1);
  }

  // Security middleware - Helmet.js with CSP
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        scriptSrc: ["'self'", "https://unpkg.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: serverConfig.env.isProduction ? [] : null
      }
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));

  // CORS configuration
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || (serverConfig.env.isProduction ? serverConfig.app.frontendUrl : '*'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Session-Id'],
    exposedHeaders: ['X-CSRF-Token', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
  }));

  // Rate limiting - stricter for auth endpoints
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: Number.parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    message: {
      success: false,
      error: {
        message: 'Too many requests from this IP, please try again later.',
        code: 'ERR_RATE_LIMIT'
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health';
    }
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: Number.parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10), // Stricter for auth
    message: {
      success: false,
      error: {
        message: 'Too many authentication attempts, please try again later.',
        code: 'ERR_AUTH_RATE_LIMIT'
      }
    },
    standardHeaders: true,
    legacyHeaders: false
  });

  // Apply rate limiting
  app.use('/auth', authLimiter);
  app.use('/api/', generalLimiter);
  app.use('/', generalLimiter);

  // Body parsing middleware
  app.use(express.json({ 
    limit: serverConfig.http.bodyLimit || '10mb',
    verify: (req, res, buf) => {
      // Store raw body for webhook signature verification
      req.rawBody = buf;
    }
  }));
  app.use(express.urlencoded({ 
    extended: true, 
    limit: serverConfig.http.bodyLimit || '10mb' 
  }));

  // Input sanitization (must be after body parsing)
  app.use(sanitize);

  // Request logging middleware
  app.use(requestLogger);

  // Health check endpoint (before auth, CSRF, etc.)
  app.get('/health', (req, res) => {
    const health = {
      status: 'ok',
      service: 'FocusFlow',
      version: process.env.npm_package_version || '2.0.2',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: serverConfig.env.nodeEnv,
      database: 'connected' // TODO: Add actual DB health check
    };
    
    res.json(health);
  });

  // CSRF token generation (for GET requests that need tokens)
  app.use(csrfToken);

  // API Routes
  // Note: CSRF protection is applied selectively - webhooks and public endpoints are exempt
  app.use('/auth', authRoutes);
  app.use('/bot', botRoutes); // Bot endpoints exempt from CSRF (use webhook signatures)
  app.use('/modes', modeRoutes);
  app.use('/schedule', scheduleRoutes);
  app.use('/stats', statsRoutes);
  app.use('/missed', missedMessagesRoutes);
  app.use('/ai', aiRoutes);
  app.use('/subscription', subscriptionRoutes);
  app.use('/payment', paymentRoutes); // Payment webhooks exempt from CSRF (use signatures)
  app.use('/admin', adminRoutes);

  // 404 handler
  app.use((req, res) => {
    logger.warn('Route not found', { 
      method: req.method, 
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    res.status(404).json({
      success: false,
      error: {
        message: `Route ${req.method} ${req.path} not found`,
        code: 'ERR_NOT_FOUND',
        path: req.path
      }
    });
  });

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Starts the HTTP server
 * @param {express.Application} app - Express application instance
 */
function startServer(app) {
  const { port } = serverConfig.http;
  
  const server = app.listen(port, () => {
    logger.info(`🚀 FocusFlow server starting...`);
    logger.info(`📡 Server listening on port ${port}`);
    logger.info(`🌍 Environment: ${serverConfig.env.nodeEnv}`);
    logger.info(`✅ Health check: http://localhost:${port}/health`);
    logger.info(`🔒 Security: ${serverConfig.env.isProduction ? 'ENABLED' : 'DEVELOPMENT MODE'}`);
    
    if (serverConfig.env.isProduction) {
      logger.info(`🔐 JWT secret: ${process.env.JWT_SECRET ? '✓ Set' : '✗ MISSING'}`);
      logger.info(`🔑 Encryption key: ${serverConfig.security.tokenEncryptionKey ? '✓ Set' : '✗ MISSING'}`);
    }
  });

  // Handle server errors
  server.on('error', (error) => {
    logger.error('Server error', error);
    process.exit(1);
  });

  // Graceful shutdown handling
  const shutdown = (signal) => {
    logger.info(`${signal} signal received: closing HTTP server`);
    server.close(() => {
      logger.info('HTTP server closed');
      // Close database pool
      const { pool } = require('./services/dbService');
      pool.end(() => {
        logger.info('Database pool closed');
        process.exit(0);
      });
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', error);
    shutdown('UNCAUGHT_EXCEPTION');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', { reason, promise });
    // Don't exit in production - log and continue
    if (serverConfig.env.isProduction) {
      // Send to error tracking service
    }
  });

  return server;
}

// Initialize and start server
try {
  const app = initializeApp();
  schedulers.startAll();
  startServer(app);
} catch (error) {
  logger.error('Failed to start server', error);
  process.exit(1);
}

module.exports = { initializeApp, startServer };
