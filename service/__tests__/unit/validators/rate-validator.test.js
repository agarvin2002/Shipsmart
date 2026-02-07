/**
 * RateValidator Unit Tests
 */

jest.mock('../../../validators/validation-schema/rate-schema', () => ({
  getRatesSchema: {},
  getRateHistorySchema: {},
}));

const RateValidator = require('../../../validators/rate-validator');
const Joi = require('@hapi/joi');
const { getRatesSchema, getRateHistorySchema } = require('../../../validators/validation-schema/rate-schema');

describe('RateValidator', () => {
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
    it('should return getRatesSchema for getRates type', () => {
      const validator = new RateValidator('getRates');
      const schema = validator.fetchSchema();
      expect(schema).toBe(getRatesSchema);
    });

    it('should return getRateHistorySchema for getRateHistory type', () => {
      const validator = new RateValidator('getRateHistory');
      const schema = validator.fetchSchema();
      expect(schema).toBe(getRateHistorySchema);
    });

    it('should set error for invalid type', () => {
      const validator = new RateValidator('invalidType');
      const schema = validator.fetchSchema();

      expect(schema).toBeNull();
      expect(validator.isValid).toBe(false);
      expect(validator.errors).toHaveLength(1);
      expect(validator.errors[0].message).toContain('Invalid operation type');
    });
  });

  describe('#validate', () => {
    it('should validate data successfully with valid input', () => {
      const mockSchema = {};
      const validatedValue = { origin: { postal_code: '10001' } };

      Joi.validate = jest.fn().mockReturnValue({
        error: null,
        value: validatedValue,
      });

      const validator = new RateValidator('getRates');
      validator.fetchSchema = jest.fn().mockReturnValue(mockSchema);

      validator.validate({ origin: { postal_code: '10001' } });

      expect(validator.isValid).toBe(true);
      expect(validator.value).toBe(validatedValue);
      expect(validator.error).toBeNull();
      expect(validator.errors).toEqual([]);
    });

    it('should set error for invalid data', () => {
      const mockSchema = {};
      const joiError = { details: [{ message: 'Validation error' }] };

      Joi.validate = jest.fn().mockReturnValue({
        error: joiError,
        value: undefined,
      });

      const validator = new RateValidator('getRates');
      validator.fetchSchema = jest.fn().mockReturnValue(mockSchema);

      validator.validate({});

      expect(validator.isValid).toBe(false);
      expect(validator.error).toBe(joiError);
      expect(validator.errors).toHaveLength(1);
    });

    it('should not validate if schema is null', () => {
      const validator = new RateValidator('invalidType');

      validator.validate({});

      expect(Joi.validate).not.toHaveBeenCalled();
    });
  });

  describe('#setErrorMessage', () => {
    it('should set isValid to false and populate errors array', () => {
      const validator = new RateValidator('getRates');

      validator.setErrorMessage('Custom error message');

      expect(validator.isValid).toBe(false);
      expect(validator.errors).toEqual([{ message: 'Custom error message' }]);
    });
  });
});
