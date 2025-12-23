const Joi = require('@hapi/joi');

const getCarriersSchema = Joi.object({
  active_only: Joi.boolean().optional().default(true),
  limit: Joi.number().integer().min(1).max(100).optional(),
  offset: Joi.number().integer().min(0).optional(),
});

const getCarrierByIdSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

const getCarrierServicesSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
  category: Joi.string().valid('express', 'ground', 'freight', 'international').optional(),
  active_only: Joi.boolean().optional().default(true),
});

module.exports = {
  getCarriersSchema,
  getCarrierByIdSchema,
  getCarrierServicesSchema,
};
