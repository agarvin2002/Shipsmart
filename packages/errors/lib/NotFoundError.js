const ApplicationError = require('./ApplicationError');
const { HTTP_STATUS } = require('@shipsmart/constants');

class NotFoundError extends ApplicationError {
  constructor(message, data = {}) {
    super(message, HTTP_STATUS.NOT_FOUND, data);
  }
}

module.exports = NotFoundError;
