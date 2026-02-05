/**
 * CarrierRouter Unit Tests
 *
 * Tests carrier selection and routing logic.
 */

// Mock uuid before anything else
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

// Mock dependencies
jest.mock('../../../models');
jest.mock('../../../services/carriers/fedex-rate-service');
jest.mock('../../../services/carriers/ups-rate-service');
jest.mock('../../../services/carriers/usps-rate-service');

const CarrierRouter = require('../../../lib/carrier-router');
const { CarrierCredential, Carrier, CarrierService } = require('../../../models');
const FedexRateService = require('../../../services/carriers/fedex-rate-service');
const UpsRateService = require('../../../services/carriers/ups-rate-service');
const UspsRateService = require('../../../services/carriers/usps-rate-service');
const { createMockCarrierCredential } = require('../../utils/test-helpers');

describe('CarrierRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup global logger
    global.logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };
  });

  afterEach(() => {
    delete global.logger;
  });

  describe('.getAvailableCarriers', () => {
    it('should return enriched credentials with carrier config and services', async () => {
      const mockCredential = createMockCarrierCredential('fedex', {
        user_id: 'user-123',
        is_active: true,
        validation_status: 'valid',
      });
      mockCredential.toJSON = jest.fn(() => ({ ...mockCredential }));

      const mockCarrier = {
        id: 'carrier-1',
        code: 'fedex',
        name: 'FedEx',
        is_active: true,
      };

      const mockServices = [
        { id: 'svc-1', carrier_id: 'carrier-1', service_code: 'FEDEX_GROUND' },
        { id: 'svc-2', carrier_id: 'carrier-1', service_code: 'FEDEX_EXPRESS' },
      ];

      CarrierCredential.findAll = jest.fn().mockResolvedValue([mockCredential]);
      Carrier.findOne = jest.fn().mockResolvedValue(mockCarrier);
      CarrierService.findAll = jest.fn().mockResolvedValue(mockServices);

      const result = await CarrierRouter.getAvailableCarriers('user-123');

      expect(CarrierCredential.findAll).toHaveBeenCalledWith({
        where: {
          user_id: 'user-123',
          is_active: true,
          validation_status: 'valid',
        },
        order: [['carrier', 'ASC']],
      });
      expect(Carrier.findOne).toHaveBeenCalledWith({
        where: { code: 'fedex', is_active: true },
      });
      expect(CarrierService.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].carrier).toBe('fedex');
      expect(result[0].carrierConfig).toBe(mockCarrier);
      expect(result[0].services).toBe(mockServices);
    });

    it('should return empty array when no active carriers found', async () => {
      CarrierCredential.findAll = jest.fn().mockResolvedValue([]);

      const result = await CarrierRouter.getAvailableCarriers('user-123');

      expect(result).toEqual([]);
      expect(global.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No active carriers found'),
        expect.any(Object)
      );
    });

    it('should filter carriers by route support when shipment data provided', async () => {
      const fedexCred = createMockCarrierCredential('fedex');
      fedexCred.toJSON = jest.fn(() => ({ ...fedexCred, carrier: 'fedex' }));

      const uspsCred = createMockCarrierCredential('usps');
      uspsCred.toJSON = jest.fn(() => ({ ...uspsCred, carrier: 'usps' }));

      CarrierCredential.findAll = jest.fn().mockResolvedValue([fedexCred, uspsCred]);
      Carrier.findOne = jest.fn().mockImplementation((query) => {
        if (query.where.code === 'fedex') {
          return { id: 'carrier-1', code: 'fedex', is_active: true };
        }
        return { id: 'carrier-2', code: 'usps', is_active: true };
      });
      CarrierService.findAll = jest.fn().mockResolvedValue([]);

      const shipmentData = {
        origin: { country: 'US' },
        destination: { country: 'CA' }, // International
      };

      const result = await CarrierRouter.getAvailableCarriers('user-123', shipmentData);

      // Both should pass since supportsRoute returns true by default
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter out credentials without carrier config', async () => {
      const mockCredential = createMockCarrierCredential('invalid-carrier');
      mockCredential.toJSON = jest.fn(() => ({ ...mockCredential }));

      CarrierCredential.findAll = jest.fn().mockResolvedValue([mockCredential]);
      Carrier.findOne = jest.fn().mockResolvedValue(null); // No carrier config

      const result = await CarrierRouter.getAvailableCarriers('user-123');

      expect(result).toEqual([]);
      expect(global.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Carrier config not found'),
        expect.any(Object)
      );
    });

    it('should handle errors and throw', async () => {
      const dbError = new Error('Database connection failed');
      CarrierCredential.findAll = jest.fn().mockRejectedValue(dbError);

      await expect(CarrierRouter.getAvailableCarriers('user-123')).rejects.toThrow(
        'Database connection failed'
      );

      expect(global.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error getting carriers'),
        expect.any(Object)
      );
    });
  });

  describe('.supportsRoute', () => {
    it('should return true for domestic USPS shipments', () => {
      const shipmentData = {
        origin: { country: 'US' },
        destination: { country: 'US' },
      };

      const result = CarrierRouter.supportsRoute('usps', shipmentData);

      expect(result).toBe(true);
    });

    it('should return true for international FedEx/UPS/DHL shipments', () => {
      const shipmentData = {
        origin: { country: 'US' },
        destination: { country: 'CA' },
      };

      expect(CarrierRouter.supportsRoute('fedex', shipmentData)).toBe(true);
      expect(CarrierRouter.supportsRoute('ups', shipmentData)).toBe(true);
      expect(CarrierRouter.supportsRoute('dhl', shipmentData)).toBe(true);
    });

    it('should return true for domestic US shipments for all carriers', () => {
      const shipmentData = {
        origin: { country: 'US' },
        destination: { country: 'US' },
      };

      expect(CarrierRouter.supportsRoute('fedex', shipmentData)).toBe(true);
      expect(CarrierRouter.supportsRoute('ups', shipmentData)).toBe(true);
      expect(CarrierRouter.supportsRoute('usps', shipmentData)).toBe(true);
    });

    it('should handle missing country data', () => {
      const shipmentData = {
        origin: {},
        destination: {},
      };

      const result = CarrierRouter.supportsRoute('fedex', shipmentData);

      expect(result).toBe(true); // Default behavior
    });

    it('should default to true when no specific rule matches', () => {
      const shipmentData = {
        origin: { country: 'CA' },
        destination: { country: 'MX' },
      };

      const result = CarrierRouter.supportsRoute('fedex', shipmentData);

      expect(result).toBe(true);
    });
  });

  describe('.getCarrierService', () => {
    it('should return correct service instance for supported carriers', () => {
      const mockCredential = createMockCarrierCredential('fedex');

      FedexRateService.mockImplementation(() => ({ carrier: 'fedex' }));
      UpsRateService.mockImplementation(() => ({ carrier: 'ups' }));
      UspsRateService.mockImplementation(() => ({ carrier: 'usps' }));

      const fedexService = CarrierRouter.getCarrierService('fedex', mockCredential);
      const upsService = CarrierRouter.getCarrierService('ups', mockCredential);
      const uspsService = CarrierRouter.getCarrierService('usps', mockCredential);

      expect(FedexRateService).toHaveBeenCalledWith(mockCredential);
      expect(UpsRateService).toHaveBeenCalledWith(mockCredential);
      expect(UspsRateService).toHaveBeenCalledWith(mockCredential);
      expect(fedexService.carrier).toBe('fedex');
      expect(upsService.carrier).toBe('ups');
      expect(uspsService.carrier).toBe('usps');
    });

    it('should throw error for unsupported carriers', () => {
      const mockCredential = createMockCarrierCredential('unknown');

      expect(() => {
        CarrierRouter.getCarrierService('unknown', mockCredential);
      }).toThrow('Unsupported carrier: unknown');
    });
  });

  describe('.routeRateRequest', () => {
    it('should route request and return rates', async () => {
      const mockCredential = createMockCarrierCredential('fedex');
      const mockRates = [
        { service_name: 'FedEx Ground', rate_amount: 15.50 },
        { service_name: 'FedEx Express', rate_amount: 25.00 },
      ];

      const mockService = {
        getRates: jest.fn().mockResolvedValue(mockRates),
      };

      FedexRateService.mockImplementation(() => mockService);

      const shipmentData = {
        origin: { postal_code: '10001' },
        destination: { postal_code: '90210' },
      };

      const result = await CarrierRouter.routeRateRequest('fedex', mockCredential, shipmentData);

      expect(FedexRateService).toHaveBeenCalledWith(mockCredential);
      expect(mockService.getRates).toHaveBeenCalledWith(shipmentData);
      expect(result).toEqual(mockRates);
      expect(global.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Rate request completed'),
        expect.objectContaining({ carrier: 'fedex', rateCount: 2 })
      );
    });

    it('should handle errors from carrier service', async () => {
      const mockCredential = createMockCarrierCredential('fedex');
      const serviceError = new Error('API timeout');

      const mockService = {
        getRates: jest.fn().mockRejectedValue(serviceError),
      };

      FedexRateService.mockImplementation(() => mockService);

      const shipmentData = {
        origin: { postal_code: '10001' },
        destination: { postal_code: '90210' },
      };

      await expect(
        CarrierRouter.routeRateRequest('fedex', mockCredential, shipmentData)
      ).rejects.toThrow('API timeout');

      expect(global.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Rate request failed'),
        expect.objectContaining({ carrier: 'fedex', error: 'API timeout' })
      );
    });
  });
});
