const Joi = require('@hapi/joi');

class RateValidator {
  static getRatesSchema() {
    const addressSchema = Joi.object({
      postal_code: Joi.string().required(),
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      state_province: Joi.string().optional(),
      country: Joi.string().length(2).uppercase().default('US'),
      company_name: Joi.string().optional(),
    });

    return Joi.object({
      // Support both address IDs and full address objects
      origin_address_id: Joi.number().integer().positive().optional(),
      destination_address_id: Joi.number().integer().positive().optional(),
      origin: addressSchema.optional(),
      destination: addressSchema.optional(),

      package: Joi.object({
        weight: Joi.number().positive().max(150).required(),
        length: Joi.number().positive().max(108).optional(),
        width: Joi.number().positive().max(108).optional(),
        height: Joi.number().positive().max(108).optional(),
        weight_unit: Joi.string().valid('lb', 'kg').default('lb'),
        dimension_unit: Joi.string().valid('in', 'cm').default('in'),
        dimensions: Joi.object({
          length: Joi.number().positive().max(108).required(),
          width: Joi.number().positive().max(108).required(),
          height: Joi.number().positive().max(108).required(),
        }).optional(),
        value: Joi.number().positive().optional(),
      }).required(),
      service_type: Joi.string().valid('ground', 'express', 'overnight', 'international').optional(),
    }).or('origin_address_id', 'origin').or('destination_address_id', 'destination');
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
