const Joi = require('@hapi/joi');

const getCarrierCredentialsSchema = Joi.object({
  carrier: Joi.string().valid('fedex', 'ups', 'dhl', 'usps').optional(),
  active_only: Joi.boolean().optional().default(true),
  limit: Joi.number().integer().min(1).max(100).optional(),
  offset: Joi.number().integer().min(0).optional(),
});

const createCarrierCredentialSchema = Joi.object({
  carrier: Joi.string().valid('fedex', 'ups', 'dhl', 'usps').required(),
  client_id: Joi.string().required(),
  client_secret: Joi.string().required(),
  account_numbers: Joi.array().items(Joi.string()).optional().default([]),
  selected_service_ids: Joi.array().items(Joi.number().integer()).optional().allow(null),
});

const updateCarrierCredentialSchema = Joi.object({
  id: Joi.number().integer().required(),
  client_id: Joi.string().optional(),
  client_secret: Joi.string().optional(),
  account_numbers: Joi.array().items(Joi.string()).optional(),
  is_active: Joi.boolean().optional(),
  selected_service_ids: Joi.array().items(Joi.number().integer()).optional().allow(null),
});

const getCarrierCredentialSchema = Joi.object({
  id: Joi.number().integer().required(),
});

module.exports = {
  getCarrierCredentialsSchema,
  createCarrierCredentialSchema,
  updateCarrierCredentialSchema,
  getCarrierCredentialSchema,
};
