/**
 * AuthValidator Unit Tests
 */

jest.mock('../../../validators/validation-schema/auth-schema', () => ({
  registerSchema: {},
  loginSchema: {},
  forgotPasswordSchema: {},
  resetPasswordSchema: {},
}));

const AuthValidator = require('../../../validators/auth-validator');
const Joi = require('@hapi/joi');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../../../validators/validation-schema/auth-schema');

describe('AuthValidator', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    global.logger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    };
  });

  afterEach(() => {
    delete global.logger;
  });

  describe('#fetchSchema', () => {
    it('should return registerSchema for register type', () => {
      const validator = new AuthValidator('register');
      const schema = validator.fetchSchema();
      expect(schema).toBe(registerSchema);
    });

    it('should return loginSchema for login type', () => {
      const validator = new AuthValidator('login');
      const schema = validator.fetchSchema();
      expect(schema).toBe(loginSchema);
    });

    it('should return forgotPasswordSchema for forgotPassword type', () => {
      const validator = new AuthValidator('forgotPassword');
      const schema = validator.fetchSchema();
      expect(schema).toBe(forgotPasswordSchema);
    });

    it('should return resetPasswordSchema for resetPassword type', () => {
      const validator = new AuthValidator('resetPassword');
      const schema = validator.fetchSchema();
      expect(schema).toBe(resetPasswordSchema);
    });

    it('should set error for invalid type', () => {
      const validator = new AuthValidator('invalidType');
      const schema = validator.fetchSchema();

      expect(schema).toBeNull();
      expect(validator.isValid).toBe(false);
      expect(validator.errors).toHaveLength(1);
      expect(validator.errors[0].message).toContain('Invalid authentication operation type');
    });
  });

  describe('#validate', () => {
    it('should validate data successfully with valid input', () => {
      const mockSchema = {};
      const validatedValue = { email: 'test@example.com', password: 'password123' };

      Joi.validate = jest.fn().mockReturnValue({
        error: null,
        value: validatedValue,
      });

      const validator = new AuthValidator('login');
      validator.fetchSchema = jest.fn().mockReturnValue(mockSchema);

      validator.validate({ email: 'test@example.com', password: 'password123' });

      expect(validator.isValid).toBe(true);
      expect(validator.value).toBe(validatedValue);
      expect(validator.error).toBeNull();
      expect(validator.errors).toEqual([]);
    });

    it('should set error for invalid data', () => {
      const mockSchema = {};
      const joiError = { details: [{ message: 'Email is required' }] };

      Joi.validate = jest.fn().mockReturnValue({
        error: joiError,
        value: undefined,
      });

      const validator = new AuthValidator('login');
      validator.fetchSchema = jest.fn().mockReturnValue(mockSchema);

      validator.validate({});

      expect(validator.isValid).toBe(false);
      expect(validator.error).toBe(joiError);
      expect(validator.errors).toHaveLength(1);
    });

    it('should not validate if schema is null', () => {
      const validator = new AuthValidator('invalidType');

      validator.validate({});

      expect(Joi.validate).not.toHaveBeenCalled();
    });
  });

  describe('#setErrorMessage', () => {
    it('should set isValid to false and populate errors array', () => {
      const validator = new AuthValidator('login');

      validator.setErrorMessage('Custom error message');

      expect(validator.isValid).toBe(false);
      expect(validator.errors).toEqual([{ message: 'Custom error message' }]);
    });
  });
});
