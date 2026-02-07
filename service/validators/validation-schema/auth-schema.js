const Joi = require('@hapi/joi');
const { VALIDATION_LIMITS } = require('@shipsmart/constants');

// Strong password regex:
// - At least PASSWORD_MIN_LENGTH (12) characters
// - At least one uppercase letter
// - At least one lowercase letter
// - At least one digit
// - At least one special character (@$!%*?&)
const strongPasswordPattern = new RegExp(`^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{${VALIDATION_LIMITS.PASSWORD_MIN_LENGTH},}$`);

const passwordError = new Error(`Password must be at least ${VALIDATION_LIMITS.PASSWORD_MIN_LENGTH} characters and contain uppercase, lowercase, digit, and special character (@$!%*?&)`);

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(VALIDATION_LIMITS.PASSWORD_MIN_LENGTH)
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
    .min(VALIDATION_LIMITS.PASSWORD_MIN_LENGTH)
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
