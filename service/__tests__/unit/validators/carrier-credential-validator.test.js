/**
 * CarrierCredentialValidator Unit Tests
 */

jest.mock('../../../validators/validation-schema/carrier-credential-schema', () => ({
  getCarrierCredentialsSchema: {},
  createCarrierCredentialSchema: {},
  updateCarrierCredentialSchema: {},
  getCarrierCredentialSchema: {},
}));

const CarrierCredentialValidator = require('../../../validators/carrier-credential-validator');
const Joi = require('@hapi/joi');
const {
  getCarrierCredentialsSchema,
  createCarrierCredentialSchema,
  updateCarrierCredentialSchema,
  getCarrierCredentialSchema,
} = require('../../../validators/validation-schema/carrier-credential-schema');

describe('CarrierCredentialValidator', () => {
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
    it('should return getCarrierCredentialsSchema for getCredentials type', () => {
      const validator = new CarrierCredentialValidator('getCredentials');
      const schema = validator.fetchSchema();
      expect(schema).toBe(getCarrierCredentialsSchema);
    });

    it('should return createCarrierCredentialSchema for create type', () => {
      const validator = new CarrierCredentialValidator('create');
      const schema = validator.fetchSchema();
      expect(schema).toBe(createCarrierCredentialSchema);
    });

    it('should return updateCarrierCredentialSchema for update type', () => {
      const validator = new CarrierCredentialValidator('update');
      const schema = validator.fetchSchema();
      expect(schema).toBe(updateCarrierCredentialSchema);
    });

    it('should return getCarrierCredentialSchema for get type', () => {
      const validator = new CarrierCredentialValidator('get');
      const schema = validator.fetchSchema();
      expect(schema).toBe(getCarrierCredentialSchema);
    });

    it('should set error for invalid type', () => {
      const validator = new CarrierCredentialValidator('invalidType');
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
      const validatedValue = { carrier: 'fedex', client_id: 'abc123' };

      Joi.validate = jest.fn().mockReturnValue({
        error: null,
        value: validatedValue,
      });

      const validator = new CarrierCredentialValidator('create');
      validator.fetchSchema = jest.fn().mockReturnValue(mockSchema);

      validator.validate({ carrier: 'fedex', client_id: 'abc123' });

      expect(validator.isValid).toBe(true);
      expect(validator.value).toBe(validatedValue);
      expect(validator.error).toBeNull();
      expect(validator.errors).toEqual([]);
    });

    it('should set error for invalid data', () => {
      const mockSchema = {};
      const joiError = { details: [{ message: 'Carrier is required' }] };

      Joi.validate = jest.fn().mockReturnValue({
        error: joiError,
        value: undefined,
      });

      const validator = new CarrierCredentialValidator('create');
      validator.fetchSchema = jest.fn().mockReturnValue(mockSchema);

      validator.validate({});

      expect(validator.isValid).toBe(false);
      expect(validator.error).toBe(joiError);
      expect(validator.errors).toHaveLength(1);
    });

    it('should not validate if schema is null', () => {
      const validator = new CarrierCredentialValidator('invalidType');

      validator.validate({});

      expect(Joi.validate).not.toHaveBeenCalled();
    });
  });

  describe('#setErrorMessage', () => {
    it('should set isValid to false and populate errors array', () => {
      const validator = new CarrierCredentialValidator('create');

      validator.setErrorMessage('Custom error message');

      expect(validator.isValid).toBe(false);
      expect(validator.errors).toEqual([{ message: 'Custom error message' }]);
    });
  });
});
