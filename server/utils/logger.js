/**
 * Production-grade logging utility for FocusFlow
 * Provides structured logging with levels, context, and error tracking
 * 
 * @module utils/logger
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const CURRENT_LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

/**
 * Formats log message with timestamp and context
 * @private
 * @param {string} level - Log level
 * @param {string} context - Context/module name
 * @param {any[]} args - Arguments to log
 * @returns {string} Formatted log message
 */
function formatLog(level, context, ...args) {
  const timestamp = new Date().toISOString();
  const contextStr = context ? `[${context}]` : '';
  return `[${timestamp}] [${level}] ${contextStr}`;
}

/**
 * Production-grade logger with structured logging
 */
const logger = {
  /**
   * Logs debug messages (only in development)
   * @param {string} context - Context/module name
   * @param {...any} args - Arguments to log
   */
  debug(context, ...args) {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
      console.debug(formatLog('DEBUG', context), ...args);
    }
  },

  /**
   * Logs informational messages
   * @param {string} context - Context/module name
   * @param {...any} args - Arguments to log
   */
  info(context, ...args) {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.INFO) {
      console.log(formatLog('INFO', context), ...args);
    }
  },

  /**
   * Logs warning messages
   * @param {string} context - Context/module name
   * @param {...any} args - Arguments to log
   */
  warn(context, ...args) {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.WARN) {
      console.warn(formatLog('WARN', context), ...args);
    }
  },

  /**
   * Logs error messages with stack traces
   * @param {string} context - Context/module name
   * @param {Error|string} error - Error object or message
   * @param {Object} [metadata] - Additional error metadata
   */
  error(context, error, metadata = {}) {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.ERROR) {
      const errorMessage = error instanceof Error ? error.message : error;
      const stack = error instanceof Error ? error.stack : undefined;
      
      console.error(formatLog('ERROR', context), errorMessage);
      if (stack) {
        console.error('Stack:', stack);
      }
      if (Object.keys(metadata).length > 0) {
        console.error('Metadata:', JSON.stringify(metadata, null, 2));
      }
    }
  },

  /**
   * Creates a child logger with a fixed context
   * @param {string} context - Context name for this logger
   * @returns {Object} Logger instance with context
   */
  child(context) {
    return {
      debug: (...args) => logger.debug(context, ...args),
      info: (...args) => logger.info(context, ...args),
      warn: (...args) => logger.warn(context, ...args),
      error: (error, metadata) => logger.error(context, error, metadata)
    };
  }
};

module.exports = logger;
