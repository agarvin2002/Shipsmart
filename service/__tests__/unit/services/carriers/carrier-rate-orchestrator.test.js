/**
 * CarrierRateOrchestrator Unit Tests
 * Tests cache management, parallel carrier calls, and rate analysis
 */

// Mock all dependencies FIRST before any requires
jest.mock('sequelize');
jest.mock('cls-hooked', () => ({
  getNamespace: jest.fn(() => null),
  createNamespace: jest.fn(() => ({ run: jest.fn((fn) => fn()) })),
}));
jest.mock('../../../../workers/utils/producer', () => ({
  getWorkerProducer: jest.fn(() => ({ publishMessage: jest.fn() })),
}));
jest.mock('../../../../services/carriers/fedex-rate-service');
jest.mock('../../../../services/carriers/ups-rate-service');
jest.mock('../../../../services/carriers/usps-rate-service');
jest.mock('../../../../lib/carrier-router');
jest.mock('../../../../repositories/address-repository');
jest.mock('../../../../models', () => ({
  Rate: {
    create: jest.fn(),
    bulkCreate: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  },
  RateHistory: {
    create: jest.fn(),
    findAll: jest.fn(),
  },
  CarrierCredential: jest.fn(),
  Carrier: jest.fn(),
  CarrierService: jest.fn(),
}));
jest.mock('@shipsmart/redis', () => ({
  get: jest.fn(),
  setWithExpiry: jest.fn(),
  del: jest.fn()
}));
jest.mock('../../../../helpers/package-normalizer', () => ({
  normalize: jest.fn()
}));

const CarrierRateOrchestrator = require('../../../../services/carriers/carrier-rate-orchestrator');
const CarrierRouter = require('../../../../lib/carrier-router');
const AddressRepository = require('../../../../repositories/address-repository');
const { Rate, RateHistory } = require('../../../../models');

const RedisWrapper = require('@shipsmart/redis');
const PackageNormalizer = require('../../../../helpers/package-normalizer');

// Mock cls-hooked
jest.mock('cls-hooked', () => {
  const mockNamespace = {
    set: jest.fn(),
    get: jest.fn(),
    run: jest.fn((fn) => fn()),
    bind: jest.fn((fn) => fn)
  };

  return {
    createNamespace: jest.fn(() => mockNamespace),
    getNamespace: jest.fn(() => mockNamespace)
  };
});

describe('CarrierRateOrchestrator Unit Tests', () => {
  let orchestrator;
  let mockAddressRepo;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create orchestrator instance
    orchestrator = new CarrierRateOrchestrator();

    // Get mock instances
    mockAddressRepo = orchestrator.addressRepository;
  });

  describe('#getRatesForShipment', () => {
    const userId = 1;
    const shipmentData = {
      origin: { postal_code: '10001', country: 'US' },
      destination: { postal_code: '90210', country: 'US' },
      packages: [{ weight: 10, length: 12, width: 8, height: 6 }]
    };

    it('should return cached rates when available and not forcing refresh', async () => {
      // Arrange
      const cachedRates = {
        total_rates: 3,
        all_rates: [
          { carrier: 'fedex', rate_amount: 15.50 },
          { carrier: 'ups', rate_amount: 12.00 }
        ]
      };

      RedisWrapper.get.mockResolvedValue(JSON.stringify(cachedRates));

      // Act
      const result = await orchestrator.getRatesForShipment(userId, shipmentData, {});

      // Assert
      expect(RedisWrapper.get).toHaveBeenCalled();
      expect(result.cached).toBe(true);
      expect(result.total_rates).toBe(3);
      expect(CarrierRouter.getAvailableCarriers).not.toHaveBeenCalled();
    });

    it('should bypass cache when forceRefresh is true', async () => {
      // Arrange
      const carriers = [
        { carrier: 'fedex', credentials: {} },
        { carrier: 'ups', credentials: {} }
      ];

      const fedexRates = [{ carrier: 'fedex', service_name: 'FedEx Ground', rate_amount: 15.50 }];
      const upsRates = [{ carrier: 'ups', service_name: 'UPS Ground', rate_amount: 12.00 }];

      CarrierRouter.getAvailableCarriers.mockResolvedValue(carriers);
      CarrierRouter.routeRateRequest
        .mockResolvedValueOnce(fedexRates)
        .mockResolvedValueOnce(upsRates);

      RedisWrapper.setWithExpiry.mockResolvedValue('OK');

      // Mock RateHistory.bulkCreate for saveRateHistory
      RateHistory.bulkCreate = jest.fn().mockResolvedValue([]);

      // Act
      const result = await orchestrator.getRatesForShipment(userId, shipmentData, { forceRefresh: true });

      // Assert
      expect(RedisWrapper.get).not.toHaveBeenCalled();
      expect(CarrierRouter.getAvailableCarriers).toHaveBeenCalledWith(userId, shipmentData);
      expect(result.cached).toBe(false);
      expect(result.total_rates).toBe(2);
    });

    it('should fetch rates from all available carriers in parallel', async () => {
      // Arrange
      const carriers = [
        { carrier: 'fedex', credentials: {} },
        { carrier: 'ups', credentials: {} },
        { carrier: 'usps', credentials: {} }
      ];

      const fedexRates = [{ carrier: 'fedex', rate_amount: 15.50, delivery_days: 3 }];
      const upsRates = [{ carrier: 'ups', rate_amount: 12.00, delivery_days: 2 }];
      const uspsRates = [{ carrier: 'usps', rate_amount: 10.00, delivery_days: 5 }];

      RedisWrapper.get.mockResolvedValue(null); // No cache
      CarrierRouter.getAvailableCarriers.mockResolvedValue(carriers);
      CarrierRouter.routeRateRequest
        .mockResolvedValueOnce(fedexRates)
        .mockResolvedValueOnce(upsRates)
        .mockResolvedValueOnce(uspsRates);

      RedisWrapper.setWithExpiry.mockResolvedValue('OK');
      RateHistory.bulkCreate = jest.fn().mockResolvedValue([]);

      // Act
      const result = await orchestrator.getRatesForShipment(userId, shipmentData);

      // Assert
      expect(CarrierRouter.routeRateRequest).toHaveBeenCalledTimes(3);
      expect(result.total_carriers).toBe(3);
      expect(result.total_rates).toBe(3);
      expect(result.all_rates).toHaveLength(3);
    });

    it('should handle partial carrier failures gracefully', async () => {
      // Arrange
      const carriers = [
        { carrier: 'fedex', credentials: {} },
        { carrier: 'ups', credentials: {} }
      ];

      const upsRates = [{ carrier: 'ups', rate_amount: 12.00, delivery_days: 2 }];

      RedisWrapper.get.mockResolvedValue(null);
      CarrierRouter.getAvailableCarriers.mockResolvedValue(carriers);
      CarrierRouter.routeRateRequest
        .mockRejectedValueOnce(new Error('FedEx API timeout'))
        .mockResolvedValueOnce(upsRates);

      RedisWrapper.setWithExpiry.mockResolvedValue('OK');
      RateHistory.bulkCreate = jest.fn().mockResolvedValue([]);

      // Act
      const result = await orchestrator.getRatesForShipment(userId, shipmentData);

      // Assert
      expect(result.total_rates).toBe(1);
      expect(result.all_rates[0].carrier).toBe('ups');
    });

    it('should throw error when all carriers fail', async () => {
      // Arrange
      const carriers = [
        { carrier: 'fedex', credentials: {} },
        { carrier: 'ups', credentials: {} }
      ];

      RedisWrapper.get.mockResolvedValue(null);
      CarrierRouter.getAvailableCarriers.mockResolvedValue(carriers);
      CarrierRouter.routeRateRequest
        .mockRejectedValueOnce(new Error('FedEx failed'))
        .mockRejectedValueOnce(new Error('UPS failed'));

      // Act & Assert
      await expect(
        orchestrator.getRatesForShipment(userId, shipmentData)
      ).rejects.toThrow('Failed to fetch rates from all carriers');
    });

    it('should throw error when no active carriers found', async () => {
      // Arrange
      RedisWrapper.get.mockResolvedValue(null);
      CarrierRouter.getAvailableCarriers.mockResolvedValue([]);

      // Act & Assert
      await expect(
        orchestrator.getRatesForShipment(userId, shipmentData)
      ).rejects.toThrow('No active carriers found');
    });

    it('should cache results after successful fetch', async () => {
      // Arrange
      const carriers = [{ carrier: 'ups', credentials: {} }];
      const upsRates = [{ carrier: 'ups', rate_amount: 12.00 }];

      RedisWrapper.get.mockResolvedValue(null);
      CarrierRouter.getAvailableCarriers.mockResolvedValue(carriers);
      CarrierRouter.routeRateRequest.mockResolvedValue(upsRates);
      RedisWrapper.setWithExpiry.mockResolvedValue('OK');
      RateHistory.bulkCreate = jest.fn().mockResolvedValue([]);

      // Act
      await orchestrator.getRatesForShipment(userId, shipmentData);

      // Assert
      expect(RedisWrapper.setWithExpiry).toHaveBeenCalledWith(
        expect.any(String), // cache key
        expect.any(String), // JSON stringified data
        300 // 5 minute TTL
      );
    });

    it('should save rate history asynchronously', async () => {
      // Arrange
      const carriers = [{ carrier: 'ups', credentials: {} }];
      const upsRates = [{
        carrier: 'ups',
        service_name: 'UPS Ground',
        rate_amount: 12.00,
        currency: 'USD'
      }];

      RedisWrapper.get.mockResolvedValue(null);
      CarrierRouter.getAvailableCarriers.mockResolvedValue(carriers);
      CarrierRouter.routeRateRequest.mockResolvedValue(upsRates);
      RedisWrapper.setWithExpiry.mockResolvedValue('OK');
      RateHistory.bulkCreate = jest.fn().mockResolvedValue([]);

      // Act
      await orchestrator.getRatesForShipment(userId, shipmentData);

      // Allow async operation to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert
      expect(RateHistory.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            user_id: userId,
            carrier: 'ups',
            rate_amount: 12.00
          })
        ])
      );
    });
  });

  describe('#fetchRatesFromCarriers', () => {
    it('should fetch rates from carriers in parallel using Promise.allSettled', async () => {
      // Arrange
      const carriers = [
        { carrier: 'fedex', credentials: {} },
        { carrier: 'ups', credentials: {} }
      ];
      const shipmentData = {};

      CarrierRouter.routeRateRequest
        .mockResolvedValueOnce([{ carrier: 'fedex', rate_amount: 15.50 }])
        .mockResolvedValueOnce([{ carrier: 'ups', rate_amount: 12.00 }]);

      // Act
      const rates = await orchestrator.fetchRatesFromCarriers(carriers, shipmentData);

      // Assert
      expect(rates).toHaveLength(2);
      expect(rates[0].carrier).toBe('fedex');
      expect(rates[1].carrier).toBe('ups');
    });

    it('should handle individual carrier failures and continue', async () => {
      // Arrange
      const carriers = [
        { carrier: 'fedex', credentials: {} },
        { carrier: 'ups', credentials: {} },
        { carrier: 'usps', credentials: {} }
      ];
      const shipmentData = {};

      CarrierRouter.routeRateRequest
        .mockRejectedValueOnce(new Error('FedEx timeout'))
        .mockResolvedValueOnce([{ carrier: 'ups', rate_amount: 12.00 }])
        .mockResolvedValueOnce([{ carrier: 'usps', rate_amount: 10.00 }]);

      // Act
      const rates = await orchestrator.fetchRatesFromCarriers(carriers, shipmentData);

      // Assert
      expect(rates).toHaveLength(2);
      expect(rates.every(r => r.carrier !== 'fedex')).toBe(true);
    });

    it('should throw error when all carriers fail', async () => {
      // Arrange
      const carriers = [
        { carrier: 'fedex', credentials: {} },
        { carrier: 'ups', credentials: {} }
      ];
      const shipmentData = {};

      CarrierRouter.routeRateRequest
        .mockRejectedValueOnce(new Error('FedEx failed'))
        .mockRejectedValueOnce(new Error('UPS failed'));

      // Act & Assert
      await expect(
        orchestrator.fetchRatesFromCarriers(carriers, shipmentData)
      ).rejects.toThrow('Failed to fetch rates from all carriers');
    });
  });

  describe('#analyzeRates', () => {
    it('should identify cheapest and fastest rates for domestic shipment', () => {
      // Arrange
      const rates = [
        { carrier: 'fedex', rate_amount: 15.50, delivery_days: 2, service_name: 'FedEx Express' },
        { carrier: 'ups', rate_amount: 12.00, delivery_days: 3, service_name: 'UPS Ground' },
        { carrier: 'usps', rate_amount: 10.00, delivery_days: 5, service_name: 'USPS Priority' }
      ];
      const shipmentData = {
        origin: { country: 'US' },
        destination: { country: 'US' }
      };

      // Act
      const analysis = orchestrator.analyzeRates(rates, shipmentData);

      // Assert
      expect(analysis.cheapest.carrier).toBe('usps');
      expect(analysis.cheapest.rate_amount).toBe(10.00);
      expect(analysis.fastest.carrier).toBe('fedex');
      expect(analysis.fastest.delivery_days).toBe(2);
      expect(analysis.total_carriers).toBe(3);
      expect(analysis.total_rates).toBe(3);
      expect(analysis.potential_savings).toBe(5.50); // 15.50 - 10.00
    });

    it('should sort rates by price (cheapest first)', () => {
      // Arrange
      const rates = [
        { carrier: 'fedex', rate_amount: 20.00 },
        { carrier: 'usps', rate_amount: 8.00 },
        { carrier: 'ups', rate_amount: 15.00 }
      ];

      // Act
      const analysis = orchestrator.analyzeRates(rates);

      // Assert
      expect(analysis.all_rates[0].rate_amount).toBe(8.00);
      expect(analysis.all_rates[1].rate_amount).toBe(15.00);
      expect(analysis.all_rates[2].rate_amount).toBe(20.00);
    });

    it('should not identify fastest rate for international shipments', () => {
      // Arrange
      const rates = [
        { carrier: 'fedex', rate_amount: 15.50, delivery_days: 2 }
      ];
      const shipmentData = {
        origin: { country: 'US' },
        destination: { country: 'CA' }
      };

      // Act
      const analysis = orchestrator.analyzeRates(rates, shipmentData);

      // Assert
      expect(analysis.fastest).toBeNull();
    });

    it('should handle empty rates array', () => {
      // Arrange
      const rates = [];

      // Act
      const analysis = orchestrator.analyzeRates(rates);

      // Assert
      expect(analysis.total_carriers).toBe(0);
      expect(analysis.cheapest).toBeNull();
      expect(analysis.fastest).toBeNull();
      expect(analysis.all_rates).toEqual([]);
      expect(analysis.potential_savings).toBe(0);
    });

    it('should handle rates without delivery_days', () => {
      // Arrange
      const rates = [
        { carrier: 'fedex', rate_amount: 15.50, delivery_days: null },
        { carrier: 'ups', rate_amount: 12.00, delivery_days: null }
      ];
      const shipmentData = {
        origin: { country: 'US' },
        destination: { country: 'US' }
      };

      // Act
      const analysis = orchestrator.analyzeRates(rates, shipmentData);

      // Assert
      expect(analysis.cheapest).toBeDefined();
      expect(analysis.fastest).toBeNull(); // No rates with delivery days
    });

    it('should calculate potential savings correctly', () => {
      // Arrange
      const rates = [
        { carrier: 'fedex', rate_amount: 25.00 },
        { carrier: 'usps', rate_amount: 8.50 }
      ];

      // Act
      const analysis = orchestrator.analyzeRates(rates);

      // Assert
      expect(analysis.potential_savings).toBe(16.50); // 25.00 - 8.50
    });
  });

  describe('#isInternationalShipment', () => {
    it('should return true when countries differ', () => {
      // Arrange
      const origin = { country: 'US' };
      const destination = { country: 'CA' };

      // Act
      const result = orchestrator.isInternationalShipment(origin, destination);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when countries match', () => {
      // Arrange
      const origin = { country: 'US' };
      const destination = { country: 'US' };

      // Act
      const result = orchestrator.isInternationalShipment(origin, destination);

      // Assert
      expect(result).toBe(false);
    });

    it('should default to US when country not specified', () => {
      // Arrange
      const origin = {};
      const destination = {};

      // Act
      const result = orchestrator.isInternationalShipment(origin, destination);

      // Assert
      expect(result).toBe(false); // Both default to US
    });

    it('should return false when origin or destination is null', () => {
      // Act & Assert
      expect(orchestrator.isInternationalShipment(null, null)).toBe(false);
      expect(orchestrator.isInternationalShipment({}, null)).toBe(false);
      expect(orchestrator.isInternationalShipment(null, {})).toBe(false);
    });
  });

  describe('#enrichShipmentData', () => {
    const userId = 1;

    it('should fetch origin and destination addresses by ID', async () => {
      // Arrange
      const shipmentData = {
        origin_address_id: 10,
        destination_address_id: 20,
        packages: [{ weight: 10 }]
      };

      const originAddress = {
        dataValues: { id: 10, postal_code: '10001', country: 'US' }
      };
      const destAddress = {
        dataValues: { id: 20, postal_code: '90210', country: 'US' }
      };

      mockAddressRepo.findById
        .mockResolvedValueOnce(originAddress)
        .mockResolvedValueOnce(destAddress);

      PackageNormalizer.normalize.mockReturnValue([{ weight: 10, length: 12, width: 8, height: 6 }]);

      // Act
      const enriched = await orchestrator.enrichShipmentData(userId, shipmentData);

      // Assert
      expect(mockAddressRepo.findById).toHaveBeenCalledWith(10, userId);
      expect(mockAddressRepo.findById).toHaveBeenCalledWith(20, userId);
      expect(enriched.origin.postal_code).toBe('10001');
      expect(enriched.destination.postal_code).toBe('90210');
    });

    it('should normalize packages', async () => {
      // Arrange
      const shipmentData = {
        origin: { postal_code: '10001' },
        destination: { postal_code: '90210' },
        packages: [{ weight: 10 }, { weight: 5 }]
      };

      const normalized = [
        { weight: 10, length: 12, width: 8, height: 6 },
        { weight: 5, length: 10, width: 6, height: 4 }
      ];

      PackageNormalizer.normalize.mockReturnValue(normalized);

      // Act
      const enriched = await orchestrator.enrichShipmentData(userId, shipmentData);

      // Assert
      // PackageNormalizer is called with raw packages (just weight)
      expect(PackageNormalizer.normalize).toHaveBeenCalledWith([{ weight: 10 }, { weight: 5 }]);
      expect(enriched.packages).toEqual(normalized);
    });

    it('should throw error when origin address not found', async () => {
      // Arrange
      const shipmentData = {
        origin_address_id: 999,
        destination_address_id: 20,
        packages: []
      };

      mockAddressRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        orchestrator.enrichShipmentData(userId, shipmentData)
      ).rejects.toThrow('Origin address not found: 999');
    });

    it('should throw error when destination address not found', async () => {
      // Arrange
      const shipmentData = {
        origin_address_id: 10,
        destination_address_id: 999,
        packages: []
      };

      const originAddress = { dataValues: { id: 10 } };

      mockAddressRepo.findById
        .mockResolvedValueOnce(originAddress)
        .mockResolvedValueOnce(null);

      // Act & Assert
      await expect(
        orchestrator.enrichShipmentData(userId, shipmentData)
      ).rejects.toThrow('Destination address not found: 999');
    });

    it('should support single package format', async () => {
      // Arrange
      const shipmentData = {
        origin: { postal_code: '10001' },
        destination: { postal_code: '90210' },
        package: { weight: 10 }
      };

      PackageNormalizer.normalize.mockReturnValue([{ weight: 10, length: 12, width: 8, height: 6 }]);

      // Act
      const enriched = await orchestrator.enrichShipmentData(userId, shipmentData);

      // Assert
      // PackageNormalizer is called with raw package (just weight)
      expect(PackageNormalizer.normalize).toHaveBeenCalledWith([{ weight: 10 }]);
      expect(enriched.package).toBeDefined();
    });
  });

  describe('#buildCacheKey', () => {
    it('should build cache key from address IDs and package details', () => {
      // Arrange
      const shipmentData = {
        origin_address_id: 10,
        destination_address_id: 20,
        packages: [
          { weight: 10 },
          { weight: 5 }
        ],
        service_type: 'express'
      };

      // Act
      const cacheKey = orchestrator.buildCacheKey(shipmentData);

      // Assert
      expect(cacheKey).toBe('RATE:10:20:15:2:express');
    });

    it('should use postal codes when address IDs not available', () => {
      // Arrange
      const shipmentData = {
        origin: { postal_code: '10001' },
        destination: { postal_code: '90210' },
        packages: [{ weight: 10 }]
      };

      // Act
      const cacheKey = orchestrator.buildCacheKey(shipmentData);

      // Assert
      expect(cacheKey).toContain('10001');
      expect(cacheKey).toContain('90210');
    });

    it('should default service_type to ground', () => {
      // Arrange
      const shipmentData = {
        origin_address_id: 10,
        destination_address_id: 20,
        packages: [{ weight: 10 }]
      };

      // Act
      const cacheKey = orchestrator.buildCacheKey(shipmentData);

      // Assert
      expect(cacheKey).toContain(':ground');
    });

    it('should handle single package format', () => {
      // Arrange
      const shipmentData = {
        origin_address_id: 10,
        destination_address_id: 20,
        package: { weight: 15 }
      };

      // Act
      const cacheKey = orchestrator.buildCacheKey(shipmentData);

      // Assert
      expect(cacheKey).toBe('RATE:10:20:15:1:ground');
    });
  });

  describe('#getCachedRates', () => {
    it('should return parsed rates from Redis', async () => {
      // Arrange
      const cachedData = { total_rates: 3, all_rates: [] };
      RedisWrapper.get.mockResolvedValue(JSON.stringify(cachedData));

      // Act
      const result = await orchestrator.getCachedRates('test-key');

      // Assert
      expect(RedisWrapper.get).toHaveBeenCalledWith('test-key');
      expect(result).toEqual(cachedData);
    });

    it('should return null when cache miss', async () => {
      // Arrange
      RedisWrapper.get.mockResolvedValue(null);

      // Act
      const result = await orchestrator.getCachedRates('test-key');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when Redis fails', async () => {
      // Arrange
      RedisWrapper.get.mockRejectedValue(new Error('Redis connection error'));

      // Act
      const result = await orchestrator.getCachedRates('test-key');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('#cacheRates', () => {
    it('should cache rates with TTL', async () => {
      // Arrange
      const rateComparison = { total_rates: 3, all_rates: [] };
      RedisWrapper.setWithExpiry.mockResolvedValue('OK');

      // Act
      await orchestrator.cacheRates('test-key', rateComparison);

      // Assert
      expect(RedisWrapper.setWithExpiry).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(rateComparison),
        300 // 5 minute TTL
      );
    });

    it('should not throw when caching fails', async () => {
      // Arrange
      RedisWrapper.setWithExpiry.mockRejectedValue(new Error('Redis error'));

      // Act & Assert - Should not throw
      await expect(
        orchestrator.cacheRates('test-key', {})
      ).resolves.toBeUndefined();
    });
  });

  describe('#saveRateHistory', () => {
    it('should save rate history for all rates', async () => {
      // Arrange
      const userId = 1;
      const rates = [
        { carrier: 'fedex', service_name: 'FedEx Ground', rate_amount: 15.50, currency: 'USD' },
        { carrier: 'ups', service_name: 'UPS Ground', rate_amount: 12.00, currency: 'USD' }
      ];
      const shipmentData = {
        origin: { postal_code: '10001', country: 'US' },
        destination: { postal_code: '90210', country: 'US' },
        packages: [{ weight: 10 }],
        service_type: 'ground'
      };

      RateHistory.bulkCreate = jest.fn().mockResolvedValue([]);

      // Act
      await orchestrator.saveRateHistory(userId, rates, shipmentData);

      // Assert
      expect(RateHistory.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            user_id: userId,
            carrier: 'fedex',
            rate_amount: 15.50,
            origin_zip: '10001',
            destination_zip: '90210'
          }),
          expect.objectContaining({
            user_id: userId,
            carrier: 'ups',
            rate_amount: 12.00
          })
        ])
      );
    });

    it('should not throw when save fails (async background operation)', async () => {
      // Arrange
      RateHistory.bulkCreate = jest.fn().mockRejectedValue(new Error('Database error'));

      // Act & Assert - Should not throw
      await expect(
        orchestrator.saveRateHistory(1, [], {})
      ).resolves.toBeUndefined();
    });
  });

  describe('#invalidateCache', () => {
    it('should delete cache key from Redis', async () => {
      // Arrange
      const shipmentData = {
        origin_address_id: 10,
        destination_address_id: 20,
        packages: [{ weight: 10 }]
      };

      RedisWrapper.del.mockResolvedValue(1);

      // Act
      await orchestrator.invalidateCache(shipmentData);

      // Assert
      expect(RedisWrapper.del).toHaveBeenCalledWith(
        expect.stringContaining('RATE:10:20')
      );
    });

    it('should not throw when invalidation fails', async () => {
      // Arrange
      RedisWrapper.del.mockRejectedValue(new Error('Redis error'));

      // Act & Assert - Should not throw
      await expect(
        orchestrator.invalidateCache({})
      ).resolves.toBeUndefined();
    });
  });
});
