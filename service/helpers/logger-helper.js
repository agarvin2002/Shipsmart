/* global logger */
const cls = require('cls-hooked');

// Get the existing namespace created in models/index.js
const namespace = cls.getNamespace('shipsmart_sequel_trans');

function formatMessage(message) {
  const requestId = namespace && namespace.get('requestId');
  if (requestId) {
    return `[${requestId}] ${message}`;
  }
  return message;
}

const loggerHelper = {
  info(message) {
    logger.info(formatMessage(message));
  },

  error(message, meta = {}) {
    if (meta && Object.keys(meta).length > 0) {
      logger.error(formatMessage(message), meta);
    } else {
      logger.error(formatMessage(message));
    }
  },

  warn(message) {
    logger.warn(formatMessage(message));
  },

  debug(message) {
    logger.debug(formatMessage(message));
  },

  verbose(message) {
    logger.verbose(formatMessage(message));
  },

  silly(message) {
    logger.silly(formatMessage(message));
  },

  log(level, message) {
    logger.log(level, formatMessage(message));
  },
};

module.exports = loggerHelper;
