/* global logger */
const cls = require('cls-hooked');

function getNamespace() {
  try {
    return cls.getNamespace('shipsmart_sequel_trans');
  } catch (error) {
    return null;
  }
}

function formatMessage(message) {
  const namespace = getNamespace();
  const requestId = namespace && namespace.get('requestId');
  if (requestId) {
    return `[${requestId}] ${message}`;
  }
  return message;
}

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
