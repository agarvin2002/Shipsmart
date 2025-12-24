const Joi = require('@hapi/joi');
const {
  getRatesSchema,
  getRateHistorySchema,
} = require('./validation-schema/rate-schema');

class RateValidator {
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
      case 'getRates':
        schema = getRatesSchema;
        break;
      case 'getRateHistory':
        schema = getRateHistorySchema;
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

module.exports = RateValidator;
