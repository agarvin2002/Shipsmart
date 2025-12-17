const Joi = require('@hapi/joi');

class RateValidator {
  static getRatesSchema() {
    return Joi.object({
      origin_address_id: Joi.number().integer().positive().required(),
      destination_address_id: Joi.number().integer().positive().required(),
      package: Joi.object({
        weight: Joi.number().positive().max(150).required(),
        dimensions: Joi.object({
          length: Joi.number().positive().max(108).required(),
          width: Joi.number().positive().max(108).required(),
          height: Joi.number().positive().max(108).required(),
        }).required(),
        value: Joi.number().positive().optional(),
      }).required(),
      service_type: Joi.string().valid('ground', 'express', 'overnight', 'international').optional(),
    });
  }

  static validateGetRates(data) {
    const schema = this.getRatesSchema();
    const { error, value } = schema.validate(data, { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      return { valid: false, errors };
    }

    return { valid: true, value };
  }
}

module.exports = RateValidator;
