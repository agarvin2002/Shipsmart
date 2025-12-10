const Joi = require('@hapi/joi');

const createCarrierCredentialSchema = Joi.object({
  carrier: Joi.string().valid('fedex', 'ups', 'dhl', 'usps').required(),
  client_id: Joi.string().required(),
  client_secret: Joi.string().required(),
  account_numbers: Joi.array().items(Joi.string()).optional().default([]),
});

const updateCarrierCredentialSchema = Joi.object({
  id: Joi.number().integer().required(),
  client_id: Joi.string().optional(),
  client_secret: Joi.string().optional(),
  account_numbers: Joi.array().items(Joi.string()).optional(),
  is_active: Joi.boolean().optional(),
});

const getCarrierCredentialSchema = Joi.object({
  id: Joi.number().integer().required(),
});

module.exports = {
  createCarrierCredentialSchema,
  updateCarrierCredentialSchema,
  getCarrierCredentialSchema,
};
