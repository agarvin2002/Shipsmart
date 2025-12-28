const Joi = require('@hapi/joi');

const addressSchema = Joi.object({
  postal_code: Joi.string().required(),
  city: Joi.string().optional(),
  state: Joi.string().optional(),
  state_province: Joi.string().optional(),
  country: Joi.string().length(2).uppercase().default('US'),
  company_name: Joi.string().optional(),
  address_line1: Joi.string().optional(),
  street_lines: Joi.array().items(Joi.string()).optional(),
});

const packageSchema = Joi.object({
  weight: Joi.number().positive().max(150).required(),
  length: Joi.number().positive().max(108).optional(),
  width: Joi.number().positive().max(108).optional(),
  height: Joi.number().positive().max(108).optional(),
  weight_unit: Joi.string().valid('lb', 'kg', 'lbs').default('lb'),
  dimension_unit: Joi.string().valid('in', 'cm').default('in'),
  dimensions: Joi.object({
    length: Joi.number().positive().max(108).required(),
    width: Joi.number().positive().max(108).required(),
    height: Joi.number().positive().max(108).required(),
  }).optional(),
  value: Joi.number().positive().optional(),
  declared_value: Joi.number().positive().optional(),
  description: Joi.string().optional(),
});

const customsSchema = Joi.object({
  customs_value: Joi.number().positive().optional(),
  currency: Joi.string().length(3).uppercase().optional().default('USD'),
  commodity_description: Joi.string().optional(),
  quantity: Joi.number().integer().positive().optional(),
  quantity_units: Joi.string().optional(),
  duties_payment_type: Joi.string().valid('SENDER', 'RECIPIENT', 'THIRD_PARTY').optional().default('SENDER'),
});

const getRatesSchema = Joi.object({
  // Support both address IDs and full address objects
  origin_address_id: Joi.number().integer().positive().optional(),
  destination_address_id: Joi.number().integer().positive().optional(),
  origin: addressSchema.optional(),
  destination: addressSchema.optional(),
  package: packageSchema.required(),
  service_type: Joi.string().valid('ground', 'express', 'overnight', 'international').optional(),
  customs: customsSchema.optional(),
}).or('origin_address_id', 'origin').or('destination_address_id', 'destination');

const getRateHistorySchema = Joi.object({
  origin_zip: Joi.string().required(),
  destination_zip: Joi.string().required(),
  carrier: Joi.string().valid('fedex', 'ups', 'dhl', 'usps').optional(),
  days: Joi.number().integer().min(1).max(90).optional().default(30),
});

module.exports = {
  getRatesSchema,
  getRateHistorySchema,
};
