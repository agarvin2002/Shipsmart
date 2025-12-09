/* global logger */
const cls = require('cls-hooked');

/**
 * Logger Initializer
 *
 * Wraps global.logger methods to automatically inject request ID from CLS namespace.
 * This allows all existing code using global.logger to automatically get request IDs
 * without any code changes.
 *
 * Usage:
 *   const initializeLogger = require('./helpers/logger-initializer');
 *   initializeLogger(); // Call once at app startup after logger is defined
 */

/**
 * Get namespace for request ID tracking
 * Returns null if namespace doesn't exist yet
 */
function getNamespace() {
  try {
    return cls.getNamespace('shipsmart_sequel_trans');
  } catch (error) {
    return null;
  }
}

/**
 * Format message with request ID prefix if available
 * @param {string} message - The log message
 * @returns {string} - Message with [requestId] prefix if available
 */
function formatMessage(message) {
  const namespace = getNamespace();
  const requestId = namespace && namespace.get('requestId');
  if (requestId) {
    return `[${requestId}] ${message}`;
  }
  return message;
}

/**
 * Initialize logger wrapper
 * Wraps global.logger methods to auto-inject request ID from namespace
 */
function initializeLogger() {
  // Store original logger methods
  const originalInfo = logger.info.bind(logger);
  const originalError = logger.error.bind(logger);
  const originalWarn = logger.warn.bind(logger);
  const originalDebug = logger.debug.bind(logger);
  const originalVerbose = logger.verbose.bind(logger);
  const originalSilly = logger.silly.bind(logger);

  // Wrap info method
  logger.info = function(message) {
    return originalInfo(formatMessage(message));
  };

  // Wrap error method (preserves metadata)
  logger.error = function(message, meta) {
    if (meta && typeof meta === 'object') {
      return originalError(formatMessage(message), meta);
    }
    return originalError(formatMessage(message));
  };

  // Wrap warn method
  logger.warn = function(message) {
    return originalWarn(formatMessage(message));
  };

  // Wrap debug method
  logger.debug = function(message) {
    return originalDebug(formatMessage(message));
  };

  // Wrap verbose method
  logger.verbose = function(message) {
    return originalVerbose(formatMessage(message));
  };

  // Wrap silly method
  logger.silly = function(message) {
    return originalSilly(formatMessage(message));
  };

  logger.info('[logger] Logger wrapper initialized - request IDs will be auto-injected');
}

module.exports = initializeLogger;
