/**
 * Server Configuration
 * 
 * Centralized configuration management for FocusFlow server
 * Loads from environment variables with sensible defaults
 * 
 * @module server/server.config
 */

require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/focusflow';
const accountsBaseUrl = process.env.ZOHO_ACCOUNTS_BASE_URL || 'https://accounts.zoho.com';

/**
 * Server configuration object
 * @type {Object}
 */
const serverConfig = {
  // HTTP server configuration
  http: {
    port: Number.parseInt(process.env.PORT || '4000', 10),
    bodyLimit: process.env.BODY_LIMIT || '10mb',
    timeout: Number.parseInt(process.env.REQUEST_TIMEOUT || '30000', 10)
  },

  // Zoho Cliq API configuration
  cliq: {
    apiBaseUrl: process.env.ZOHO_CLIQ_API_BASE_URL || 'https://cliq.zoho.com/api/v2'
  },

  // OAuth configuration
  oauth: {
    clientId: process.env.ZOHO_CLIENT_ID,
    clientSecret: process.env.ZOHO_CLIENT_SECRET,
    redirectUri: process.env.ZOHO_REDIRECT_URI,
    scopes: (process.env.ZOHO_SCOPES || 'ZohoCliq.bots.CREATE,ZohoCliq.bots.READ')
      .split(',')
      .map((scope) => scope.trim()),
    authorizeUrl: `${accountsBaseUrl}/oauth/v2/auth`,
    tokenUrl: `${accountsBaseUrl}/oauth/v2/token`,
    accountsBaseUrl
  },

  // External integrations
  integrations: {
    pythonServiceUrl: process.env.PYTHON_SERVICE_URL || 'http://localhost:8000',
    dbUrl: databaseUrl
  },

  // Database configuration
  database: {
    url: databaseUrl,
    poolSize: Number.parseInt(process.env.DB_POOL_SIZE || '10', 10),
    ssl: process.env.DB_SSL === 'true',
    connectionTimeoutMillis: Number.parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
    idleTimeoutMillis: Number.parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10)
  },

  // Security configuration
  security: {
    jwtSecret: process.env.JWT_SECRET || 'change-this-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
    stateSecret: process.env.OAUTH_STATE_SECRET,
    stateTtlMs: Number.parseInt(process.env.OAUTH_STATE_TTL_MS || '600000', 10),
    tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY,
    bcryptRounds: Number.parseInt(process.env.BCRYPT_ROUNDS || '12', 10)
  },

  // Payments
  payments: {
    defaultProvider: process.env.DEFAULT_PAYMENT_PROVIDER || 'stripe',
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    },
    razorpay: {
      keyId: process.env.RAZORPAY_KEY_ID,
      keySecret: process.env.RAZORPAY_KEY_SECRET,
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET
    }
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'text'
  },

  // SSL section (merged)
  ssl: {
    rejectUnauthorized: false
  },

  // Environment metadata
  env: {
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    isTest: process.env.NODE_ENV === 'test'
  },

  // Application metadata
  app: {
    name: 'FocusFlow',
    version: process.env.npm_package_version || '2.0.0',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
  }
};

// Validation: Check required configuration in production
if (serverConfig.env.isProduction) {
  const required = [
    'security.jwtSecret',
    'security.tokenEncryptionKey',
    'database.url'
  ];

  const missing = required.filter(key => {
    const keys = key.split('.');
    let value = serverConfig;
    for (const k of keys) {
      value = value?.[k];
      if (!value) return true;
    }
    return false;
  });

  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
}

module.exports = serverConfig;
