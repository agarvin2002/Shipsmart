const Joi = require('@hapi/joi');

const createCheckSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().optional().allow(''),
  status: Joi.string().valid('active', 'inactive').default('active'),
});

const updateCheckSchema = Joi.object({
  id: Joi.number().integer().required(),
  name: Joi.string().optional(),
  description: Joi.string().optional().allow(''),
  status: Joi.string().valid('active', 'inactive').optional(),
});

const getCheckSchema = Joi.object({
  id: Joi.number().integer().required(),
});

module.exports = {
  createCheckSchema,
  updateCheckSchema,
  getCheckSchema,
};
