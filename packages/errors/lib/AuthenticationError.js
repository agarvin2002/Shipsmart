const ApplicationError = require('./ApplicationError');
const { HTTP_STATUS } = require('@shipsmart/constants');

class AuthenticationError extends ApplicationError {
  constructor(message, data = {}) {
    super(message, HTTP_STATUS.UNAUTHORIZED, data);
  }
}

module.exports = AuthenticationError;
