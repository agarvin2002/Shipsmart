/**
 * UspsProxy Unit Tests
 */

// Mock dependencies BEFORE requiring UspsProxy
jest.mock('../../../../workers/utils/producer', () => ({
  getWorkerProducer: jest.fn(() => ({
    publishMessage: jest.fn(),
  })),
}));
jest.mock('cls-hooked', () => ({
  getNamespace: jest.fn(() => null),
}));
jest.mock('@shipsmart/env');
jest.mock('axios');
jest.mock('@shipsmart/redis', () => ({
  RedisWrapper: {
    get: jest.fn(),
    setWithExpiry: jest.fn(),
    getRedisKey: jest.fn((template, data) =>
      `CARRIER_TOKEN:${data.carrier}:${data.clientId}:${data.userId}`
    ),
  },
  RedisKeys: {
    CARRIER_TOKEN: 'CARRIER_TOKEN:%(carrier)s:%(clientId)s:%(userId)s',
  },
}));

const UspsProxy = require('../../../../lib/carrier-proxies/usps-proxy');
const config = require('@shipsmart/env');
const axios = require('axios');
const { RedisWrapper } = require('@shipsmart/redis');

describe('UspsProxy', () => {
  let proxy;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock config.get for USPS
    config.get = jest.fn((key) => {
      if (key === 'carriers:usps:api_url') return 'https://apis-tem.usps.com';
      if (key === 'carriers:usps:timeout') return 15000;
      return null;
    });

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

  describe('constructor', () => {
    it('should initialize with carrierConfig (DB-driven)', () => {
      const carrierConfig = {
        base_url: 'https://api.usps.com',
        timeout_ms: 20000,
        endpoints: {},
        headers: {},
      };

      proxy = new UspsProxy(carrierConfig);

      expect(proxy.carrierName).toBe('USPS');
      expect(proxy.baseUrl).toBe('https://api.usps.com');
      expect(proxy.timeout).toBe(20000);
    });

    it('should initialize with environment config (legacy)', () => {
      proxy = new UspsProxy();

      expect(proxy.carrierName).toBe('USPS');
      expect(config.get).toHaveBeenCalledWith('carriers:usps:api_url');
      expect(config.get).toHaveBeenCalledWith('carriers:usps:timeout');
    });
  });

  describe('#authenticate', () => {
    beforeEach(() => {
      proxy = new UspsProxy();
    });

    it('should authenticate successfully with valid credentials', async () => {
      const credentials = {
        client_id: 'usps_client_id',
        client_secret: 'usps_client_secret',
      };

      proxy.makeRequest = jest.fn().mockResolvedValue({
        access_token: 'usps_access_token',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      const token = await proxy.authenticate(credentials);

      expect(proxy.makeRequest).toHaveBeenCalledWith('/oauth2/v3/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          client_id: 'usps_client_id',
          client_secret: 'usps_client_secret',
          grant_type: 'client_credentials',
        },
        operation: 'authenticate',
      });

      expect(token).toBe('usps_access_token');
      expect(logger.info).toHaveBeenCalledWith('[UspsProxy] Authenticating with OAuth 2.0');
      expect(logger.info).toHaveBeenCalledWith('[UspsProxy] Authentication successful');
    });

    it('should throw error when authentication fails', async () => {
      const credentials = {
        client_id: 'invalid_id',
        client_secret: 'invalid_secret',
      };

      proxy.makeRequest = jest.fn().mockRejectedValue(new Error('401 Unauthorized'));

      await expect(proxy.authenticate(credentials)).rejects.toThrow('USPS authentication failed: 401 Unauthorized');
      expect(logger.error).toHaveBeenCalledWith('[UspsProxy] Authentication failed', {
        error: '401 Unauthorized',
      });
    });
  });

  describe('#getRates', () => {
    beforeEach(() => {
      proxy = new UspsProxy();
    });

    it('should fetch domestic rates successfully', async () => {
      const token = 'usps_access_token';
      const rateRequest = {
        originZIPCode: '10001',
        destinationZIPCode: '90210',
        weight: 5,
      };

      const mockResponse = {
        rateOptions: [
          { priceType: 'RETAIL', totalBasePrice: 10.50 },
          { priceType: 'COMMERCIAL', totalBasePrice: 8.75 },
        ],
      };

      proxy.makeRequest = jest.fn().mockResolvedValue(mockResponse);

      const result = await proxy.getRates(token, rateRequest, false);

      expect(proxy.makeRequest).toHaveBeenCalledWith('/prices/v3/base-rates-list/search', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer usps_access_token',
          'Content-Type': 'application/json',
        },
        data: rateRequest,
        operation: 'get_rates',
      });

      expect(result).toEqual(mockResponse);
      expect(logger.info).toHaveBeenCalledWith('[UspsProxy] Fetching rates', {
        endpoint: '/prices/v3/base-rates-list/search',
        isInternational: false,
      });
      expect(logger.info).toHaveBeenCalledWith('[UspsProxy] Rates fetched successfully', {
        rateCount: 2,
      });
    });

    it('should fetch international rates successfully', async () => {
      const token = 'usps_access_token';
      const rateRequest = {
        originZIPCode: '10001',
        destinationCountryCode: 'GB',
        weight: 5,
      };

      const mockResponse = {
        rateOptions: [
          { priceType: 'RETAIL', totalBasePrice: 45.50 },
        ],
      };

      proxy.makeRequest = jest.fn().mockResolvedValue(mockResponse);

      const result = await proxy.getRates(token, rateRequest, true);

      expect(proxy.makeRequest).toHaveBeenCalledWith('/international-prices/v3/base-rates-list/search', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer usps_access_token',
          'Content-Type': 'application/json',
        },
        data: rateRequest,
        operation: 'get_rates',
      });

      expect(result).toEqual(mockResponse);
      expect(logger.info).toHaveBeenCalledWith('[UspsProxy] Fetching rates', {
        endpoint: '/international-prices/v3/base-rates-list/search',
        isInternational: true,
      });
    });

    it('should handle empty rate response', async () => {
      const token = 'usps_access_token';
      const rateRequest = { originZIPCode: '10001', destinationZIPCode: '90210' };

      proxy.makeRequest = jest.fn().mockResolvedValue({});

      await proxy.getRates(token, rateRequest, false);

      expect(logger.info).toHaveBeenCalledWith('[UspsProxy] Rates fetched successfully', {
        rateCount: 0,
      });
    });

    it('should throw error when rate fetch fails', async () => {
      const token = 'usps_access_token';
      const rateRequest = { originZIPCode: '10001', destinationZIPCode: '90210' };

      proxy.makeRequest = jest.fn().mockRejectedValue(new Error('Service unavailable'));

      await expect(proxy.getRates(token, rateRequest, false)).rejects.toThrow('Service unavailable');
      expect(logger.error).toHaveBeenCalledWith('[UspsProxy] Rate fetch failed', {
        error: 'Service unavailable',
      });
    });
  });

  describe('#getTransitTime', () => {
    beforeEach(() => {
      proxy = new UspsProxy();
    });

    it('should fetch transit times successfully', async () => {
      const token = 'usps_access_token';
      const transitTimeRequest = {
        originZIPCode: '10001',
        destinationZIPCode: '90210',
      };

      const mockResponse = [
        { mailClass: 'PRIORITY_MAIL', serviceStandard: '2', serviceStandardMessage: '2-Day' },
        { mailClass: 'FIRST_CLASS', serviceStandard: '3', serviceStandardMessage: '3-Day' },
      ];

      proxy.makeRequest = jest.fn().mockResolvedValue(mockResponse);

      const result = await proxy.getTransitTime(token, transitTimeRequest);

      expect(proxy.makeRequest).toHaveBeenCalledWith(
        '/service-standards/v3/estimates?originZIPCode=10001&destinationZIPCode=90210',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer usps_access_token',
          },
          operation: 'get_transit_time',
        }
      );

      expect(result).toEqual(mockResponse);
      expect(logger.info).toHaveBeenCalledWith('[UspsProxy] Transit times fetched successfully', {
        serviceCount: 2,
      });
    });

    it('should handle empty transit time response', async () => {
      const token = 'usps_access_token';
      const transitTimeRequest = {
        originZIPCode: '10001',
        destinationZIPCode: '90210',
      };

      proxy.makeRequest = jest.fn().mockResolvedValue(null);

      await proxy.getTransitTime(token, transitTimeRequest);

      expect(logger.info).toHaveBeenCalledWith('[UspsProxy] Transit times fetched successfully', {
        serviceCount: 0,
      });
    });

    it('should throw error when transit time fetch fails', async () => {
      const token = 'usps_access_token';
      const transitTimeRequest = {
        originZIPCode: '10001',
        destinationZIPCode: '90210',
      };

      proxy.makeRequest = jest.fn().mockRejectedValue(new Error('Service unavailable'));

      await expect(proxy.getTransitTime(token, transitTimeRequest)).rejects.toThrow('Service unavailable');
      expect(logger.error).toHaveBeenCalledWith('[UspsProxy] Transit time fetch failed', {
        error: 'Service unavailable',
      });
    });
  });

  describe('#validateCredentials', () => {
    beforeEach(() => {
      proxy = new UspsProxy();
    });

    it('should return true for valid credentials', async () => {
      const credentials = {
        client_id: 'valid_id',
        client_secret: 'valid_secret',
      };

      proxy.authenticate = jest.fn().mockResolvedValue('access_token');

      const result = await proxy.validateCredentials(credentials);

      expect(result).toBe(true);
      expect(proxy.authenticate).toHaveBeenCalledWith(credentials);
    });

    it('should return false for invalid credentials', async () => {
      const credentials = {
        client_id: 'invalid_id',
        client_secret: 'invalid_secret',
      };

      proxy.authenticate = jest.fn().mockRejectedValue(new Error('Authentication failed'));

      const result = await proxy.validateCredentials(credentials);

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('[UspsProxy] Credential validation failed', {
        error: 'Authentication failed',
      });
    });
  });

  describe('#authenticate with token caching', () => {
    const credentials = {
      client_id: 'usps_client_id',
      client_secret: 'usps_client_secret',
    };
    const userId = 'user-789';

    beforeEach(() => {
      proxy = new UspsProxy();
      proxy.makeRequest = jest.fn().mockResolvedValue({
        access_token: 'fresh_usps_token',
        token_type: 'Bearer',
        expires_in: 3599,
      });

      // Re-setup Redis mock after clearAllMocks
      RedisWrapper.getRedisKey.mockImplementation((template, data) =>
        `CARRIER_TOKEN:${data.carrier}:${data.clientId}:${data.userId}`
      );
    });

    it('should return cached token on cache hit', async () => {
      RedisWrapper.get.mockResolvedValue('cached_usps_token');

      const token = await proxy.authenticate(credentials, userId);

      expect(token).toBe('cached_usps_token');
      expect(proxy.makeRequest).not.toHaveBeenCalled();
    });

    it('should fetch and cache token on cache miss', async () => {
      RedisWrapper.get.mockResolvedValue(null);
      RedisWrapper.setWithExpiry.mockResolvedValue('OK');

      const token = await proxy.authenticate(credentials, userId);

      expect(token).toBe('fresh_usps_token');
      expect(proxy.makeRequest).toHaveBeenCalled();
      expect(RedisWrapper.setWithExpiry).toHaveBeenCalledWith(
        expect.stringContaining('CARRIER_TOKEN:usps:usps_client_id:user-789'),
        'fresh_usps_token',
        3539 // 3599 - 60 safety margin
      );
    });

    it('should gracefully handle Redis get failure', async () => {
      RedisWrapper.get.mockRejectedValue(new Error('Redis connection failed'));

      const token = await proxy.authenticate(credentials, userId);

      expect(token).toBe('fresh_usps_token');
      expect(proxy.makeRequest).toHaveBeenCalled();
    });

    it('should gracefully handle Redis set failure', async () => {
      RedisWrapper.get.mockResolvedValue(null);
      RedisWrapper.setWithExpiry.mockRejectedValue(new Error('Redis write failed'));

      const token = await proxy.authenticate(credentials, userId);

      expect(token).toBe('fresh_usps_token');
    });

    it('should use default TTL when expires_in is missing', async () => {
      RedisWrapper.get.mockResolvedValue(null);
      RedisWrapper.setWithExpiry.mockResolvedValue('OK');
      proxy.makeRequest = jest.fn().mockResolvedValue({
        access_token: 'token_no_expiry',
      });

      await proxy.authenticate(credentials, userId);

      expect(RedisWrapper.setWithExpiry).toHaveBeenCalledWith(
        expect.any(String),
        'token_no_expiry',
        3540 // 3600 (default CACHE_CARRIER_TOKENS) - 60
      );
    });

    it('should skip caching when userId is null', async () => {
      const token = await proxy.authenticate(credentials);

      expect(token).toBe('fresh_usps_token');
      expect(RedisWrapper.get).not.toHaveBeenCalled();
      expect(RedisWrapper.setWithExpiry).not.toHaveBeenCalled();
    });
  });
});
