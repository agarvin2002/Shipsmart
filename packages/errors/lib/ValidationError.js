const ApplicationError = require('./ApplicationError');
const { HTTP_STATUS } = require('@shipsmart/constants');

class ValidationError extends ApplicationError {
  constructor(message, data = {}) {
    super(message, HTTP_STATUS.BAD_REQUEST, data);
  }
}

module.exports = ValidationError;
