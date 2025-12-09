const ApplicationError = require('./ApplicationError');
const { HTTP_STATUS } = require('@shipsmart/constants');

/**
 * S3Error - Custom error class for AWS S3 operations
 *
 * Used for S3 upload/download failures, permission issues, and bucket errors
 */
class S3Error extends ApplicationError {
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, data = {}) {
    super(message, statusCode, data);
    this.name = 'S3Error';
  }
}

module.exports = S3Error;
