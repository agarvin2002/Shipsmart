const Joi = require('@hapi/joi');
const {
  registerUserSchema,
  loginUserSchema,
  updateUserSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
} = require('./validation-schema/user-schema');

class UserValidator {
  constructor(type) {
    this.isValid = true;
    this.type = type;
  }

  setErrorMessage(message) {
    this.isValid = false;
    this.errors = [{
      message,
    }];
  }

  fetchSchema() {
    let schema = null;
    switch (this.type) {
      case 'register':
        schema = registerUserSchema;
        break;
      case 'login':
        schema = loginUserSchema;
        break;
      case 'update':
        schema = updateUserSchema;
        break;
      case 'changePassword':
        schema = changePasswordSchema;
        break;
      case 'forgotPassword':
        schema = forgotPasswordSchema;
        break;
      case 'resetPassword':
        schema = resetPasswordSchema;
        break;
      case 'refreshToken':
        schema = refreshTokenSchema;
        break;
      default:
        this.setErrorMessage(`Invalid operation type: ${this.type}`);
        logger.error(`Invalid operation type: ${this.type}`);
    }
    return schema;
  }

  validate(data) {
    const schema = this.fetchSchema();
    if (schema) {
      const { error, value } = Joi.validate(data, schema);
      if (error) {
        this.error = error;
        this.setErrorMessage(error);
      } else {
        this.value = value;
        this.error = null;
        this.errors = [];
        this.isValid = true;
      }
    }
  }
}

module.exports = UserValidator;
