const Joi = require('@hapi/joi');

const createAddressSchema = Joi.object({
  address_label: Joi.string().required(),
  is_default: Joi.boolean().default(false),
  company_name: Joi.string().optional().allow(''),
  street_address_1: Joi.string().required(),
  street_address_2: Joi.string().optional().allow(''),
  city: Joi.string().required(),
  state_province: Joi.string().required(),
  postal_code: Joi.string().required(),
  country: Joi.string().length(2).default('US'),
  phone: Joi.string().optional().allow(''),
});

const updateAddressSchema = Joi.object({
  id: Joi.number().integer().required(),
  address_label: Joi.string().optional(),
  is_default: Joi.boolean().optional(),
  company_name: Joi.string().optional().allow(''),
  street_address_1: Joi.string().optional(),
  street_address_2: Joi.string().optional().allow(''),
  city: Joi.string().optional(),
  state_province: Joi.string().optional(),
  postal_code: Joi.string().optional(),
  country: Joi.string().length(2).optional(),
  phone: Joi.string().optional().allow(''),
});

const getAddressSchema = Joi.object({
  id: Joi.number().integer().required(),
});

module.exports = {
  createAddressSchema,
  updateAddressSchema,
  getAddressSchema,
};
