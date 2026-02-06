const Joi = require('@hapi/joi');

// Strong password regex:
// - At least 12 characters
// - At least one uppercase letter
// - At least one lowercase letter
// - At least one digit
// - At least one special character (@$!%*?&)
const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;

const passwordError = new Error('Password must be at least 12 characters and contain uppercase, lowercase, digit, and special character (@$!%*?&)');

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(12)
    .regex(strongPasswordPattern)
    .required()
    .error(passwordError),
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
  new_password: Joi.string()
    .min(12)
    .regex(strongPasswordPattern)
    .required()
    .error(passwordError),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
