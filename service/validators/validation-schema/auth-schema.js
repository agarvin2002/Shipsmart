const Joi = require('@hapi/joi');

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  first_name: Joi.string().required(),
  last_name: Joi.string().required(),
  company_name: Joi.string().optional().allow(''),
  phone: Joi.string().optional().allow(''),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  new_password: Joi.string().min(8).required(),
});

const refreshTokenSchema = Joi.object({
  refresh_token: Joi.string().required(),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
};
