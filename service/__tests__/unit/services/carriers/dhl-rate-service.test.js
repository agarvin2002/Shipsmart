const DhlRateService = require('../../../../services/carriers/dhl-rate-service');
const DhlProxy = require('../../../../lib/carrier-proxies/dhl-proxy');
const DhlRateRequestBuilder = require('../../../../lib/request-builders/dhl-rate-request-builder');
const CryptoHelper = require('../../../../helpers/crypto-helper');
const { CARRIERS } = require('@shipsmart/constants');
const { RATE_SUCCESS_DOMESTIC, RATE_SUCCESS_INTERNATIONAL, AUTH_SUCCESS } = require('../../../fixtures/dhl-mock-data');

// Mock dependencies
jest.mock('../../../../lib/carrier-proxies/dhl-proxy');
jest.mock('../../../../lib/request-builders/dhl-rate-request-builder');
jest.mock('../../../../helpers/crypto-helper');

// Mock Bull to avoid ES module issues
jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    process: jest.fn(),
    on: jest.fn(),
  }));
});

// Mock logger globally
global.logger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

describe('DhlRateService', () => {
  let service;
  let mockCarrierCredential;
  let mockProxy;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock carrier credential with encrypted data
    mockCarrierCredential = {
      carrier: CARRIERS.DHL,
      client_id_encrypted: 'encrypted_client_id',
      client_secret_encrypted: 'encrypted_client_secret',
      account_numbers: JSON.stringify(['123456789']),
      carrierConfig: {
        base_url: 'https://express.api.dhl.com/mydhlapi/test',
        timeout_ms: 15000,
      },
      services: [
        { id: 1, service_code: 'DHL_EXPRESS_DOMESTIC', service_name: 'DHL Express Domestic' },
        { id: 2, service_code: 'DHL_EXPRESS_WORLDWIDE', service_name: 'DHL Express Worldwide' },
      ],
    };

    // Mock CryptoHelper
    CryptoHelper.decrypt = jest.fn((encrypted) => {
      if (encrypted === 'encrypted_client_id') return 'test_username';
      if (encrypted === 'encrypted_client_secret') return 'test_password';
      return encrypted;
    });

    // Mock DhlProxy
    mockProxy = {
      authenticate: jest.fn().mockResolvedValue(AUTH_SUCCESS),
      getRates: jest.fn().mockResolvedValue(RATE_SUCCESS_DOMESTIC),
    };
    DhlProxy.mockImplementation(() => mockProxy);

    // Mock DhlRateRequestBuilder
    DhlRateRequestBuilder.buildRateRequest = jest.fn().mockReturnValue({
      unitOfMeasurement: 'imperial',
      packages: [{ weight: 5, dimensions: { length: 10, width: 10, height: 10 } }],
      customerDetails: {
        shipperDetails: { cityName: 'CHICAGO', countryCode: 'US', postalCode: '60601' },
        receiverDetails: { cityName: 'NEW YORK', countryCode: 'US', postalCode: '10001' },
      },
    });

    // Create service instance
    service = new DhlRateService(mockCarrierCredential);
  });

  describe('constructor', () => {
    it('should initialize with carrier credential', () => {
      expect(service.carrierName).toBe(CARRIERS.DHL);
      expect(service.carrierConfig).toEqual(mockCarrierCredential.carrierConfig);
      expect(service.services).toEqual(mockCarrierCredential.services);
      expect(service.decryptedCredentials).toEqual({
        client_id: 'test_username',
        client_secret: 'test_password',
        account_number: '123456789',
        account_numbers: ['123456789'],
      });
    });
  });

  describe('#getRates', () => {
    it('should fetch rates successfully for domestic shipment', async () => {
      const shipmentData = {
        origin: { city: 'Chicago', postal_code: '60601', country: 'US' },
        destination: { city: 'New York', postal_code: '10001', country: 'US' },
        packages: [{ weight: 5, dimensions: { length: 10, width: 10, height: 10 } }],
      };

      const rates = await service.getRates(shipmentData);

      expect(mockProxy.authenticate).toHaveBeenCalledWith(service.decryptedCredentials);
      expect(DhlRateRequestBuilder.buildRateRequest).toHaveBeenCalledWith(
        shipmentData,
        service.decryptedCredentials
      );
      expect(mockProxy.getRates).toHaveBeenCalledWith(AUTH_SUCCESS, expect.any(Object));
      expect(rates).toHaveLength(1);
      expect(rates[0]).toMatchObject({
        carrier: CARRIERS.DHL,
        service_code: 'DHL_EXPRESS_DOMESTIC',
        rate_amount: 78.48,
        currency: 'USD',
        delivery_days: 1,
      });
    });

    it('should fetch rates successfully for international shipment', async () => {
      mockProxy.getRates.mockResolvedValue(RATE_SUCCESS_INTERNATIONAL);

      const shipmentData = {
        origin: { city: 'Chicago', postal_code: '60601', country: 'US' },
        destination: { city: 'Jakarta', postal_code: '10150', country: 'ID' },
        packages: [{ weight: 2.18, dimensions: { length: 11, width: 8, height: 11 } }],
      };

      const rates = await service.getRates(shipmentData);

      expect(rates).toHaveLength(2);
      expect(rates[0]).toMatchObject({
        carrier: CARRIERS.DHL,
        service_code: 'DHL_EXPRESS_WORLDWIDE',
        rate_amount: 33.32,
        currency: 'USD',
        delivery_days: null, // International shipments don't have delivery days
      });
      expect(rates[1]).toMatchObject({
        carrier: CARRIERS.DHL,
        service_code: 'DHL_EXPRESS_EASY',
        rate_amount: 306.73,
        currency: 'USD',
      });
    });

    it('should throw error on API failure', async () => {
      mockProxy.getRates.mockRejectedValue(new Error('API Error'));

      const shipmentData = {
        origin: { city: 'Chicago', postal_code: '60601', country: 'US' },
        destination: { city: 'New York', postal_code: '10001', country: 'US' },
        packages: [{ weight: 5 }],
      };

      await expect(service.getRates(shipmentData)).rejects.toThrow('API Error');
      expect(logger.error).toHaveBeenCalledWith(
        '[DhlRateService] Failed to get rates',
        expect.objectContaining({ error: 'API Error' })
      );
    });
  });

  describe('#transformRates', () => {
    it('should transform DHL products into standard rate format', () => {
      const shipmentData = {
        origin: { city: 'Chicago', postal_code: '60601', country: 'US' },
        destination: { city: 'New York', postal_code: '10001', country: 'US' },
      };

      const rates = service.transformRates(RATE_SUCCESS_DOMESTIC, shipmentData);

      expect(rates).toHaveLength(1);
      expect(rates[0]).toMatchObject({
        carrier: CARRIERS.DHL,
        service_name: 'EXPRESS DOMESTIC',
        service_code: 'DHL_EXPRESS_DOMESTIC',
        rate_amount: 78.48,
        currency: 'USD',
        delivery_days: 1,
        estimated_delivery_date: '2026-02-11T23:59:00',
      });
    });

    it('should filter rates by selected service codes for domestic', () => {
      const shipmentData = {
        origin: { city: 'Chicago', postal_code: '60601', country: 'US' },
        destination: { city: 'New York', postal_code: '10001', country: 'US' },
      };

      // Service has only DHL_EXPRESS_WORLDWIDE in selected services (won't match domestic product N)
      service.services = [{ service_code: 'DHL_EXPRESS_WORLDWIDE' }];

      const rates = service.transformRates(RATE_SUCCESS_DOMESTIC, shipmentData);

      expect(rates).toHaveLength(0); // Domestic product filtered out
    });

    it('should not filter rates for international shipments', () => {
      const shipmentData = {
        origin: { city: 'Chicago', postal_code: '60601', country: 'US' },
        destination: { city: 'Jakarta', postal_code: '10150', country: 'ID' },
      };

      // Even with limited selected services, international rates should show all
      service.services = [{ service_code: 'DHL_EXPRESS_DOMESTIC' }];

      const rates = service.transformRates(RATE_SUCCESS_INTERNATIONAL, shipmentData);

      expect(rates).toHaveLength(2); // Both international products shown
    });

    it('should set delivery_days and estimated_delivery_date to null for international', () => {
      const shipmentData = {
        origin: { city: 'Chicago', postal_code: '60601', country: 'US' },
        destination: { city: 'Jakarta', postal_code: '10150', country: 'ID' },
      };

      const rates = service.transformRates(RATE_SUCCESS_INTERNATIONAL, shipmentData);

      expect(rates[0].delivery_days).toBeNull();
      expect(rates[0].estimated_delivery_date).toBeNull();
    });

    it('should handle empty products array', () => {
      const shipmentData = {
        origin: { city: 'Chicago', postal_code: '60601', country: 'US' },
        destination: { city: 'New York', postal_code: '10001', country: 'US' },
      };

      const rates = service.transformRates({ products: [] }, shipmentData);

      expect(rates).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith('[DhlRateService] No rates returned from DHL');
    });

    it('should skip products without BILLC price', () => {
      const shipmentData = {
        origin: { city: 'Chicago', postal_code: '60601', country: 'US' },
        destination: { city: 'New York', postal_code: '10001', country: 'US' },
      };

      const mockResponse = {
        products: [
          {
            productCode: 'N',
            productName: 'EXPRESS DOMESTIC',
            totalPrice: [{ currencyType: 'PULCL', price: 78.48 }], // No BILLC
          },
        ],
      };

      const rates = service.transformRates(mockResponse, shipmentData);

      expect(rates).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith(
        '[DhlRateService] No billing price found for product',
        { productCode: 'N' }
      );
    });
  });

  describe('#mapProductCodeToServiceCode', () => {
    it('should map DHL product codes to internal service codes', () => {
      expect(service.mapProductCodeToServiceCode('N')).toBe('DHL_EXPRESS_DOMESTIC');
      expect(service.mapProductCodeToServiceCode('P')).toBe('DHL_EXPRESS_WORLDWIDE');
      expect(service.mapProductCodeToServiceCode('K')).toBe('DHL_EXPRESS_9_00');
      expect(service.mapProductCodeToServiceCode('E')).toBe('DHL_EXPRESS_10_30');
      expect(service.mapProductCodeToServiceCode('Y')).toBe('DHL_EXPRESS_12_00');
      expect(service.mapProductCodeToServiceCode('8')).toBe('DHL_EXPRESS_EASY');
      expect(service.mapProductCodeToServiceCode('W')).toBe('DHL_ECONOMY_SELECT');
    });

    it('should handle unknown product codes', () => {
      expect(service.mapProductCodeToServiceCode('Z')).toBe('DHL_PRODUCT_Z');
    });
  });

  describe('#isInternationalShipment', () => {
    it('should return true for international shipment', () => {
      const origin = { country: 'US' };
      const destination = { country: 'CA' };
      expect(service.isInternationalShipment(origin, destination)).toBe(true);
    });

    it('should return false for domestic shipment', () => {
      const origin = { country: 'US' };
      const destination = { country: 'US' };
      expect(service.isInternationalShipment(origin, destination)).toBe(false);
    });

    it('should default to US if country not specified', () => {
      const origin = {};
      const destination = {};
      expect(service.isInternationalShipment(origin, destination)).toBe(false);
    });
  });

  describe('#validateCredentials', () => {
    it('should return valid:true for successful authentication', async () => {
      const result = await service.validateCredentials();

      expect(mockProxy.authenticate).toHaveBeenCalledWith(service.decryptedCredentials);
      expect(result).toEqual({ valid: true, carrier: CARRIERS.DHL });
    });

    it('should return valid:false on authentication failure', async () => {
      mockProxy.authenticate.mockRejectedValue(new Error('Invalid credentials'));

      const result = await service.validateCredentials();

      expect(result).toEqual({
        valid: false,
        carrier: CARRIERS.DHL,
        error: 'Invalid credentials',
      });
      expect(logger.error).toHaveBeenCalledWith(
        '[DhlRateService] Credential validation failed',
        expect.objectContaining({ error: 'Invalid credentials' })
      );
    });
  });
});
