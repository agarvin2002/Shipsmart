/* global logger */
const cls = require('cls-hooked');

// Get the existing namespace created in models/index.js
const namespace = cls.getNamespace('shipsmart_sequel_trans');

/**
 * Logger Helper
 *
 * Wraps global.logger to automatically inject request ID from CLS namespace.
 * Works in both HTTP request context (via context-manager middleware) and
 * worker context (via worker consumers that set requestId in namespace).
 *
 * Usage:
 *   const logger = require('../helpers/logger-helper');
 *   logger.info('User created'); // Automatically becomes: [request-id] User created
 *
 * Falls back to regular logging if no request ID is available in context.
 */

/**
 * Format message with request ID prefix if available
 * @param {string} message - The log message
 * @returns {string} - Message with [requestId] prefix if available
 */
function formatMessage(message) {
  const requestId = namespace && namespace.get('requestId');
  if (requestId) {
    return `[${requestId}] ${message}`;
  }
  return message;
}

/**
 * Logger wrapper with automatic request ID injection
 */
const loggerHelper = {
  /**
   * Log info level message
   * @param {string} message - The message to log
   */
  info(message) {
    logger.info(formatMessage(message));
  },

  /**
   * Log error level message
   * @param {string} message - The message to log
   * @param {Object} meta - Optional metadata (e.g., { stack: error.stack })
   */
  error(message, meta = {}) {
    if (meta && Object.keys(meta).length > 0) {
      logger.error(formatMessage(message), meta);
    } else {
      logger.error(formatMessage(message));
    }
  },

  /**
   * Log warning level message
   * @param {string} message - The message to log
   */
  warn(message) {
    logger.warn(formatMessage(message));
  },

  /**
   * Log debug level message
   * @param {string} message - The message to log
   */
  debug(message) {
    logger.debug(formatMessage(message));
  },

  /**
   * Log verbose level message
   * @param {string} message - The message to log
   */
  verbose(message) {
    logger.verbose(formatMessage(message));
  },

  /**
   * Log silly level message
   * @param {string} message - The message to log
   */
  silly(message) {
    logger.silly(formatMessage(message));
  },

  /**
   * Generic log method
   * @param {string} level - Log level
   * @param {string} message - The message to log
   */
  log(level, message) {
    logger.log(level, formatMessage(message));
  },
};

module.exports = loggerHelper;
