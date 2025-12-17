const Joi = require('@hapi/joi');

const updateUserSchema = Joi.object({
  first_name: Joi.string().optional(),
  last_name: Joi.string().optional(),
  company_name: Joi.string().optional().allow(''),
  phone: Joi.string().optional().allow(''),
});

const changePasswordSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password: Joi.string().min(8).required(),
});

module.exports = {
  updateUserSchema,
  changePasswordSchema,
};
