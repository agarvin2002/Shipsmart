/**
 * BaseCarrierRateService Unit Tests
 *
 * Tests base carrier service class that all carrier-specific services extend.
 */

// Mock uuid before anything else
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

// Mock CryptoHelper before requiring BaseCarrierRateService
jest.mock('../../../../helpers/crypto-helper');

const BaseCarrierRateService = require('../../../../services/carriers/base-carrier-rate-service');
const CryptoHelper = require('../../../../helpers/crypto-helper');
const { createMockCarrierCredential } = require('../../../utils/test-helpers');

describe('BaseCarrierRateService', () => {
  let mockCredential;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup CryptoHelper mock
    CryptoHelper.decrypt.mockImplementation((encrypted) => {
      if (encrypted === 'encrypted_client_id') return 'decrypted_client_id';
      if (encrypted === 'encrypted_client_secret') return 'decrypted_client_secret';
      return encrypted;
    });

    // Setup global logger mock
    global.logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    // Create mock credential
    mockCredential = createMockCarrierCredential('fedex', {
      client_id_encrypted: 'encrypted_client_id',
      client_secret_encrypted: 'encrypted_client_secret',
      account_numbers: JSON.stringify(['123456789', '987654321']),
    });
  });

  afterEach(() => {
    delete global.logger;
  });

  describe('Constructor', () => {
    it('should initialize with carrier credential', () => {
      const service = new BaseCarrierRateService(mockCredential);

      expect(service.carrierName).toBe('fedex');
      expect(service.credential).toBe(mockCredential);
      expect(service.carrierConfig).toBeNull(); // Default when undefined
      expect(service.services).toEqual([]); // Default when undefined
    });

    it('should decrypt credentials correctly', () => {
      const service = new BaseCarrierRateService(mockCredential);

      expect(CryptoHelper.decrypt).toHaveBeenCalledWith('encrypted_client_id');
      expect(CryptoHelper.decrypt).toHaveBeenCalledWith('encrypted_client_secret');
      expect(service.decryptedCredentials).toEqual({
        client_id: 'decrypted_client_id',
        client_secret: 'decrypted_client_secret',
        account_number: '123456789',
        account_numbers: ['123456789', '987654321'],
      });
    });

    it('should handle account_numbers as JSON string', () => {
      const credential = createMockCarrierCredential('ups', {
        account_numbers: '["ACC123", "ACC456"]',
      });

      const service = new BaseCarrierRateService(credential);

      expect(service.decryptedCredentials.account_numbers).toEqual(['ACC123', 'ACC456']);
      expect(service.decryptedCredentials.account_number).toBe('ACC123');
    });

    it('should handle account_numbers as array', () => {
      const credential = createMockCarrierCredential('usps', {
        account_numbers: ['USPS001', 'USPS002'],
      });

      const service = new BaseCarrierRateService(credential);

      expect(service.decryptedCredentials.account_numbers).toEqual(['USPS001', 'USPS002']);
      expect(service.decryptedCredentials.account_number).toBe('USPS001');
    });

    it('should handle missing account_numbers', () => {
      const credential = createMockCarrierCredential('dhl', {
        account_numbers: null,
      });

      const service = new BaseCarrierRateService(credential);

      expect(service.decryptedCredentials.account_numbers).toEqual([]);
      expect(service.decryptedCredentials.account_number).toBeNull();
    });

    it('should handle missing carrier credential', () => {
      const service = new BaseCarrierRateService(null);

      expect(service.carrierName).toBe('unknown');
      expect(service.credential).toBeNull();
      expect(service.carrierConfig).toBeNull();
      expect(service.services).toEqual([]);
      expect(service.decryptedCredentials).toBeUndefined();
    });
  });

  describe('Abstract Methods', () => {
    it('should throw error when getRates() not implemented', async () => {
      const service = new BaseCarrierRateService(mockCredential);

      await expect(service.getRates({})).rejects.toThrow(
        'getRates() must be implemented by BaseCarrierRateService'
      );
    });

    it('should throw error when validateCredentials() not implemented', async () => {
      const service = new BaseCarrierRateService(mockCredential);

      await expect(service.validateCredentials()).rejects.toThrow(
        'validateCredentials() must be implemented by BaseCarrierRateService'
      );
    });
  });

  describe('#handleError', () => {
    it('should log error and return error response', () => {
      const service = new BaseCarrierRateService(mockCredential);
      const error = new Error('API connection failed');
      error.stack = 'Error stack trace';

      const result = service.handleError(error);

      expect(global.logger.error).toHaveBeenCalledWith(
        '[fedexRateService] Error:',
        {
          message: 'API connection failed',
          stack: 'Error stack trace',
        }
      );

      expect(result).toEqual({
        success: false,
        carrier: 'fedex',
        error: 'API connection failed',
      });
    });

    it('should handle error without message', () => {
      const service = new BaseCarrierRateService(mockCredential);
      const error = new Error();

      const result = service.handleError(error);

      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('#logRateFetch', () => {
    it('should log multi-package shipment data', () => {
      const service = new BaseCarrierRateService(mockCredential);
      const shipmentData = {
        origin: { postal_code: '10001' },
        destination: { postal_code: '90210' },
        packages: [
          { weight: 5.5 },
          { weight: 10.2 },
          { weight: 3.0 },
        ],
      };

      service.logRateFetch(shipmentData);

      expect(global.logger.info).toHaveBeenCalledWith(
        '[fedexRateService] Fetching rates',
        {
          origin: '10001',
          destination: '90210',
          weight: 18.7,
          package_count: 3,
        }
      );
    });

    it('should log single package shipment data', () => {
      const service = new BaseCarrierRateService(mockCredential);
      const shipmentData = {
        origin: { postal_code: '10001' },
        destination: { postal_code: '90210' },
        package: { weight: 5.5 },
      };

      service.logRateFetch(shipmentData);

      expect(global.logger.info).toHaveBeenCalledWith(
        '[fedexRateService] Fetching rates',
        {
          origin: '10001',
          destination: '90210',
          weight: 5.5,
          package_count: 1,
        }
      );
    });
  });

  describe('#formatRate', () => {
    it('should format rate data correctly', () => {
      const service = new BaseCarrierRateService(mockCredential);
      const rawRate = {
        service_name: 'FedEx Ground',
        service_code: 'FEDEX_GROUND',
        rate_amount: '15.50',
        currency: 'USD',
        delivery_days: 3,
        estimated_delivery_date: '2024-02-10',
        raw_response: { /* carrier API response */ },
      };

      const result = service.formatRate(rawRate);

      expect(result).toEqual({
        carrier: 'fedex',
        service_name: 'FedEx Ground',
        service_code: 'FEDEX_GROUND',
        rate_amount: 15.50,
        currency: 'USD',
        delivery_days: 3,
        estimated_delivery_date: '2024-02-10',
        raw_response: rawRate.raw_response,
      });
    });

    it('should default currency to USD when not provided', () => {
      const service = new BaseCarrierRateService(mockCredential);
      const rawRate = {
        service_name: 'Test Service',
        service_code: 'TEST',
        rate_amount: '20.00',
      };

      const result = service.formatRate(rawRate);

      expect(result.currency).toBe('USD');
    });
  });
});
