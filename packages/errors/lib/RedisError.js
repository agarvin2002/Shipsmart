const ApplicationError = require('./ApplicationError');
const { HTTP_STATUS } = require('@shipsmart/constants');

/**
 * RedisError - Custom error class for Redis operations
 *
 * Used for Redis connection errors, operation failures, and cache issues
 */
class RedisError extends ApplicationError {
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, data = {}) {
    super(message, statusCode, data);
    this.name = 'RedisError';
  }
}

module.exports = RedisError;
