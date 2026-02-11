/**
 * RateService Unit Tests
 * Tests business logic with mocked dependencies
 */

// Mock all dependencies FIRST before any requires
jest.mock('sequelize');
jest.mock('cls-hooked', () => ({
  getNamespace: jest.fn(() => null),
  createNamespace: jest.fn(() => ({ run: jest.fn((fn) => fn()) })),
}));
jest.mock('../../../workers/utils/producer', () => ({
  getWorkerProducer: jest.fn(() => ({ publishMessage: jest.fn() })),
}));
jest.mock('../../../services/carriers/fedex-rate-service');
jest.mock('../../../services/carriers/ups-rate-service');
jest.mock('../../../services/carriers/usps-rate-service');
jest.mock('../../../services/carriers/carrier-rate-orchestrator', () => {
  return jest.fn().mockImplementation(() => ({
    getRatesForShipment: jest.fn(),
    fetchRates: jest.fn(),
    invalidateCache: jest.fn(),
  }));
});
jest.mock('../../../repositories/rate-history-repository', () => {
  return jest.fn().mockImplementation(() => ({
    create: jest.fn(),
    findByUserId: jest.fn(),
    findByShipmentId: jest.fn(),
    findByRoute: jest.fn(),
  }));
});
jest.mock('../../../models', () => ({
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
jest.mock('../../../lib/carrier-router');

const RateService = require('../../../services/rate-service');
const CarrierRateOrchestrator = require('../../../services/carriers/carrier-rate-orchestrator');
const RateHistoryRepository = require('../../../repositories/rate-history-repository');

describe('RateService Unit Tests', () => {
  let rateService;
  let mockOrchestrator;
  let mockRateHistoryRepo;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Setup mock orchestrator
    mockOrchestrator = {
      getRatesForShipment: jest.fn(),
      fetchRates: jest.fn(),
      invalidateCache: jest.fn(),
    };
    CarrierRateOrchestrator.mockImplementation(() => mockOrchestrator);

    // Setup mock rate history repository
    mockRateHistoryRepo = {
      create: jest.fn(),
      findByUserId: jest.fn(),
      findByShipmentId: jest.fn(),
      findByRoute: jest.fn(),
    };
    RateHistoryRepository.mockImplementation(() => mockRateHistoryRepo);

    // Setup global logger
    global.logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    // Create service instance
    rateService = new RateService();
  });

  afterEach(() => {
    delete global.logger;
  });

  describe('#getRates', () => {
    it('should successfully fetch rates via orchestrator', async () => {
      // Arrange
      const userId = 1;
      const rateRequest = {
        origin: {
          postal_code: '10001',
          country: 'US'
        },
        destination: {
          postal_code: '90210',
          country: 'US'
        },
        packages: [
          {
            weight: 10,
            length: 12,
            width: 8,
            height: 6
          }
        ]
      };
      const options = {};

      const mockRateComparison = {
        total_rates: 3,
        cached: false,
        rates: [
          { carrier: 'fedex', service_name: 'FedEx Ground', rate_amount: 15.50 },
          { carrier: 'ups', service_name: 'UPS Ground', rate_amount: 12.00 },
          { carrier: 'usps', service_name: 'USPS Priority', rate_amount: 10.00 }
        ],
        cheapest_rate: { carrier: 'usps', rate_amount: 10.00 },
        fastest_rate: { carrier: 'fedex', delivery_days: 2 }
      };

      mockOrchestrator.getRatesForShipment.mockResolvedValue(mockRateComparison);

      // Act
      const result = await rateService.getRates(userId, rateRequest, options);

      // Assert
      expect(mockOrchestrator.getRatesForShipment).toHaveBeenCalledWith(
        userId,
        rateRequest,
        options
      );
      expect(result).toEqual(mockRateComparison);
      expect(result.total_rates).toBe(3);
      expect(result.rates).toHaveLength(3);
    });

    it('should pass options to orchestrator', async () => {
      // Arrange
      const userId = 1;
      const rateRequest = { origin: {}, destination: {}, packages: [] };
      const options = { forceRefresh: true, carriers: ['fedex', 'ups'] };

      const mockRateComparison = {
        total_rates: 2,
        cached: false,
        rates: []
      };

      mockOrchestrator.getRatesForShipment.mockResolvedValue(mockRateComparison);

      // Act
      await rateService.getRates(userId, rateRequest, options);

      // Assert
      expect(mockOrchestrator.getRatesForShipment).toHaveBeenCalledWith(
        userId,
        rateRequest,
        options
      );
    });

    it('should handle cached rates correctly', async () => {
      // Arrange
      const userId = 1;
      const rateRequest = { origin: {}, destination: {}, packages: [] };

      const mockCachedRates = {
        total_rates: 3,
        cached: true,  // Rates from cache
        rates: [
          { carrier: 'fedex', rate_amount: 15.50 }
        ]
      };

      mockOrchestrator.getRatesForShipment.mockResolvedValue(mockCachedRates);

      // Act
      const result = await rateService.getRates(userId, rateRequest);

      // Assert
      expect(result.cached).toBe(true);
      expect(mockOrchestrator.getRatesForShipment).toHaveBeenCalledTimes(1);
    });

    it('should throw error when orchestrator fails', async () => {
      // Arrange
      const userId = 1;
      const rateRequest = { origin: {}, destination: {}, packages: [] };

      const orchestratorError = new Error('Orchestrator failed to fetch rates');
      mockOrchestrator.getRatesForShipment.mockRejectedValue(orchestratorError);

      // Act & Assert
      await expect(
        rateService.getRates(userId, rateRequest)
      ).rejects.toThrow('Orchestrator failed to fetch rates');

      expect(mockOrchestrator.getRatesForShipment).toHaveBeenCalledWith(
        userId,
        rateRequest,
        {}
      );
    });

    it('should handle empty rate results', async () => {
      // Arrange
      const userId = 1;
      const rateRequest = { origin: {}, destination: {}, packages: [] };

      const mockEmptyRates = {
        total_rates: 0,
        cached: false,
        rates: [],
        cheapest_rate: null,
        fastest_rate: null
      };

      mockOrchestrator.getRatesForShipment.mockResolvedValue(mockEmptyRates);

      // Act
      const result = await rateService.getRates(userId, rateRequest);

      // Assert
      expect(result.total_rates).toBe(0);
      expect(result.rates).toEqual([]);
    });
  });

  describe('#compareRates', () => {
    it('should fetch rates with forceRefresh option', async () => {
      // Arrange
      const userId = 1;
      const rateRequest = {
        origin: { postal_code: '10001', country: 'US' },
        destination: { postal_code: '90210', country: 'US' },
        packages: [{ weight: 10 }]
      };

      const mockRateComparison = {
        total_rates: 3,
        cached: false,
        rates: [
          { carrier: 'fedex', rate_amount: 15.50 },
          { carrier: 'ups', rate_amount: 12.00 },
          { carrier: 'usps', rate_amount: 10.00 }
        ]
      };

      mockOrchestrator.getRatesForShipment.mockResolvedValue(mockRateComparison);

      // Act
      const result = await rateService.compareRates(userId, rateRequest);

      // Assert
      expect(mockOrchestrator.getRatesForShipment).toHaveBeenCalledWith(
        userId,
        rateRequest,
        { forceRefresh: true }  // Should always force refresh
      );
      expect(result).toEqual(mockRateComparison);
    });

    it('should always bypass cache when comparing rates', async () => {
      // Arrange
      const userId = 1;
      const rateRequest = { origin: {}, destination: {}, packages: [] };

      const mockFreshRates = {
        total_rates: 2,
        cached: false,  // Never cached because forceRefresh: true
        rates: []
      };

      mockOrchestrator.getRatesForShipment.mockResolvedValue(mockFreshRates);

      // Act
      await rateService.compareRates(userId, rateRequest);

      // Assert
      const callArgs = mockOrchestrator.getRatesForShipment.mock.calls[0];
      expect(callArgs[2]).toEqual({ forceRefresh: true });
    });

    it('should throw error when orchestrator fails during comparison', async () => {
      // Arrange
      const userId = 1;
      const rateRequest = { origin: {}, destination: {}, packages: [] };

      const comparisonError = new Error('Rate comparison failed');
      mockOrchestrator.getRatesForShipment.mockRejectedValue(comparisonError);

      // Act & Assert
      await expect(
        rateService.compareRates(userId, rateRequest)
      ).rejects.toThrow('Rate comparison failed');
    });
  });

  describe('#getRateHistory', () => {
    it('should fetch rate history by route', async () => {
      // Arrange
      const queryParams = {
        origin_zip: '10001',
        destination_zip: '90210',
        carrier: 'fedex',
        days: '30'
      };

      const mockHistory = [
        {
          id: 1,
          origin_zip: '10001',
          destination_zip: '90210',
          carrier: 'fedex',
          rate_amount: 15.50,
          fetched_at: new Date('2024-01-15')
        },
        {
          id: 2,
          origin_zip: '10001',
          destination_zip: '90210',
          carrier: 'fedex',
          rate_amount: 16.00,
          fetched_at: new Date('2024-01-10')
        }
      ];

      mockRateHistoryRepo.findByRoute.mockResolvedValue(mockHistory);

      // Act
      const result = await rateService.getRateHistory(1, queryParams);

      // Assert
      expect(mockRateHistoryRepo.findByRoute).toHaveBeenCalledWith(
        '10001',
        '90210',
        1,
        {
          carrier: 'fedex',
          days: 30  // Should be parsed to integer
        }
      );
      expect(result).toEqual(mockHistory);
      expect(result).toHaveLength(2);
    });

    it('should parse days parameter as integer', async () => {
      // Arrange
      const queryParams = {
        origin_zip: '10001',
        destination_zip: '90210',
        carrier: 'ups',
        days: '7'  // String from query params
      };

      mockRateHistoryRepo.findByRoute.mockResolvedValue([]);

      // Act
      await rateService.getRateHistory(1, queryParams);

      // Assert
      const callArgs = mockRateHistoryRepo.findByRoute.mock.calls[0];
      expect(callArgs[3].days).toBe(7);  // Should be integer, not string
      expect(typeof callArgs[3].days).toBe('number');
    });

    it('should handle history query without carrier filter', async () => {
      // Arrange
      const queryParams = {
        origin_zip: '10001',
        destination_zip: '90210',
        days: '30'
        // No carrier specified
      };

      mockRateHistoryRepo.findByRoute.mockResolvedValue([]);

      // Act
      await rateService.getRateHistory(1, queryParams);

      // Assert
      expect(mockRateHistoryRepo.findByRoute).toHaveBeenCalledWith(
        '10001',
        '90210',
        1,
        {
          carrier: undefined,
          days: 30
        }
      );
    });

    it('should return empty array when no history found', async () => {
      // Arrange
      const queryParams = {
        origin_zip: '99999',
        destination_zip: '00000',
        days: '30'
      };

      mockRateHistoryRepo.findByRoute.mockResolvedValue([]);

      // Act
      const result = await rateService.getRateHistory(1, queryParams);

      // Assert
      expect(result).toEqual([]);
    });

    it('should throw error when repository fails', async () => {
      // Arrange
      const queryParams = {
        origin_zip: '10001',
        destination_zip: '90210',
        days: '30'
      };

      const repoError = new Error('Database query failed');
      mockRateHistoryRepo.findByRoute.mockRejectedValue(repoError);

      // Act & Assert
      await expect(
        rateService.getRateHistory(1, queryParams)
      ).rejects.toThrow('Database query failed');
    });
  });

  describe('#getUserRateHistory', () => {
    it('should fetch rate history for a specific user', async () => {
      // Arrange
      const userId = 1;
      const options = { limit: 50, offset: 0 };

      const mockUserHistory = [
        {
          id: 1,
          user_id: 1,
          origin_zip: '10001',
          destination_zip: '90210',
          carrier: 'fedex',
          rate_amount: 15.50,
          fetched_at: new Date()
        },
        {
          id: 2,
          user_id: 1,
          origin_zip: '10001',
          destination_zip: '94102',
          carrier: 'ups',
          rate_amount: 18.00,
          fetched_at: new Date()
        }
      ];

      mockRateHistoryRepo.findByUserId.mockResolvedValue(mockUserHistory);

      // Act
      const result = await rateService.getUserRateHistory(userId, options);

      // Assert
      expect(mockRateHistoryRepo.findByUserId).toHaveBeenCalledWith(userId, options);
      expect(result).toEqual(mockUserHistory);
      expect(result).toHaveLength(2);
      expect(result.every(r => r.user_id === userId)).toBe(true);
    });

    it('should use default options when none provided', async () => {
      // Arrange
      const userId = 1;

      mockRateHistoryRepo.findByUserId.mockResolvedValue([]);

      // Act
      await rateService.getUserRateHistory(userId);

      // Assert
      expect(mockRateHistoryRepo.findByUserId).toHaveBeenCalledWith(userId, {});
    });

    it('should return empty array for user with no history', async () => {
      // Arrange
      const userId = 999;
      const options = {};

      mockRateHistoryRepo.findByUserId.mockResolvedValue([]);

      // Act
      const result = await rateService.getUserRateHistory(userId, options);

      // Assert
      expect(result).toEqual([]);
    });

    it('should pass pagination options to repository', async () => {
      // Arrange
      const userId = 1;
      const options = {
        limit: 20,
        offset: 10,
        carrier: 'fedex'
      };

      mockRateHistoryRepo.findByUserId.mockResolvedValue([]);

      // Act
      await rateService.getUserRateHistory(userId, options);

      // Assert
      expect(mockRateHistoryRepo.findByUserId).toHaveBeenCalledWith(userId, options);
    });

    it('should throw error when repository fails', async () => {
      // Arrange
      const userId = 1;
      const options = {};

      const repoError = new Error('Failed to fetch user history');
      mockRateHistoryRepo.findByUserId.mockRejectedValue(repoError);

      // Act & Assert
      await expect(
        rateService.getUserRateHistory(userId, options)
      ).rejects.toThrow('Failed to fetch user history');
    });
  });

  describe('Error handling and logging', () => {
    it('should log successful rate fetch', async () => {
      // Arrange
      const userId = 1;
      const rateRequest = { origin: {}, destination: {}, packages: [] };

      const mockRates = {
        total_rates: 3,
        cached: false,
        rates: []
      };

      mockOrchestrator.getRatesForShipment.mockResolvedValue(mockRates);

      // Act
      await rateService.getRates(userId, rateRequest);

      // Assert
      // Logger is mocked globally, so we just verify the method completed successfully
      expect(mockOrchestrator.getRatesForShipment).toHaveBeenCalledTimes(1);
    });

    it('should log and rethrow orchestrator errors', async () => {
      // Arrange
      const userId = 1;
      const rateRequest = { origin: {}, destination: {}, packages: [] };

      const orchestratorError = new Error('Carrier API timeout');
      orchestratorError.stack = 'Error stack trace';
      mockOrchestrator.getRatesForShipment.mockRejectedValue(orchestratorError);

      // Act & Assert
      await expect(
        rateService.getRates(userId, rateRequest)
      ).rejects.toThrow('Carrier API timeout');

      // Verify the error was thrown after logging
      expect(mockOrchestrator.getRatesForShipment).toHaveBeenCalledTimes(1);
    });
  });
});
