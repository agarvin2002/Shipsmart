const Joi = require('@hapi/joi');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
} = require('./validation-schema/auth-schema');

class AuthValidator {
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
        schema = registerSchema;
        break;
      case 'login':
        schema = loginSchema;
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
        this.setErrorMessage(`Invalid authentication operation type: ${this.type}`);
        logger.error(`Invalid authentication operation type: ${this.type}`);
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

module.exports = AuthValidator;
