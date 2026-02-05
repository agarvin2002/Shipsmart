/* global logger */
const ResponseFormatter = require('../helpers/response-formatter');

/**
 * Validation Middleware
 *
 * Centralizes validation error handling to avoid repetitive code in controllers.
 *
 * Usage:
 *   const { validate } = require('../middleware/validation-middleware');
 *   const AuthValidator = require('../validators/auth-validator');
 *
 *   router.post('/register',
 *     validate(AuthValidator, 'register', 'body'),
 *     AuthController.register
 *   );
 */

/**
 * Creates validation middleware for routes
 * @param {Class} ValidatorClass - The validator class to instantiate
 * @param {string} type - The validation type/schema name
 * @param {string} source - Where to get data from: 'body', 'query', 'params'
 * @returns {Function} Express middleware function
 */
function validate(ValidatorClass, type, source = 'body') {
  return (req, res, next) => {
    try {
      // Get data from specified source
      const data = req[source];

      // Create validator instance and validate
      const validator = new ValidatorClass(type);
      validator.validate(data);

      // Check validation result
      if (!validator.isValid) {
        const validationErrors = ResponseFormatter.formatValidationError(validator.error, req.id);
        logger.warn(`Validation failed for ${type}:`, {
          requestId: req.id,
          validationType: type,
          errors: validator.error?.details || validator.errors
        });
        return res.status(400).send(validationErrors);
      }

      // Attach validated value to request
      req.validated = validator.value;

      next();
    } catch (error) {
      logger.error('Validation middleware error:', {
        error: error.message,
        stack: error.stack
      });
      next(error);
    }
  };
}

module.exports = { validate };
