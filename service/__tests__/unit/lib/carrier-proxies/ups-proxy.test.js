/**
 * UpsProxy Unit Tests
 */

// Mock dependencies BEFORE requiring UpsProxy
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

const UpsProxy = require('../../../../lib/carrier-proxies/ups-proxy');
const config = require('@shipsmart/env');
const axios = require('axios');
const { RedisWrapper } = require('@shipsmart/redis');

describe('UpsProxy', () => {
  let proxy;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock config.get for UPS
    config.get = jest.fn((key) => {
      if (key === 'carriers:ups:api_url') return 'https://wwwcie.ups.com';
      if (key === 'carriers:ups:timeout') return 15000;
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
        base_url: 'https://onlinetools.ups.com',
        timeout_ms: 20000,
        endpoints: {},
        headers: {},
      };

      proxy = new UpsProxy(carrierConfig);

      expect(proxy.carrierName).toBe('UPS');
      expect(proxy.baseUrl).toBe('https://onlinetools.ups.com');
      expect(proxy.timeout).toBe(20000);
    });

    it('should initialize with environment config (legacy)', () => {
      proxy = new UpsProxy();

      expect(proxy.carrierName).toBe('UPS');
      expect(config.get).toHaveBeenCalledWith('carriers:ups:api_url');
      expect(config.get).toHaveBeenCalledWith('carriers:ups:timeout');
    });
  });

  describe('#authenticate', () => {
    beforeEach(() => {
      proxy = new UpsProxy();
    });

    it('should authenticate successfully with valid credentials', async () => {
      const credentials = {
        client_id: 'ups_client_id',
        client_secret: 'ups_client_secret',
        account_number: 'merchant_123',
      };

      proxy.makeRequest = jest.fn().mockResolvedValue({
        access_token: 'ups_access_token',
        token_type: 'Bearer',
        expires_in: 14400,
      });

      const token = await proxy.authenticate(credentials);

      expect(proxy.makeRequest).toHaveBeenCalledWith('/security/v1/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': expect.stringContaining('Basic '),
          'x-merchant-id': 'merchant_123',
        },
        data: 'grant_type=client_credentials',
        operation: 'authenticate',
      });

      expect(token).toBe('ups_access_token');
      expect(logger.info).toHaveBeenCalledWith('[UpsProxy] Authenticating with OAuth 2.0');
      expect(logger.info).toHaveBeenCalledWith('[UpsProxy] Authentication successful');
    });

    it('should throw error when account_number is missing', async () => {
      const credentials = {
        client_id: 'ups_client_id',
        client_secret: 'ups_client_secret',
      };

      await expect(proxy.authenticate(credentials)).rejects.toThrow('UPS merchant_id is required in credentials');
    });

    it('should throw error when authentication fails', async () => {
      const credentials = {
        client_id: 'invalid_id',
        client_secret: 'invalid_secret',
        account_number: 'merchant_123',
      };

      proxy.makeRequest = jest.fn().mockRejectedValue(new Error('401 Unauthorized'));

      await expect(proxy.authenticate(credentials)).rejects.toThrow('UPS authentication failed: 401 Unauthorized');
      expect(logger.error).toHaveBeenCalledWith('[UpsProxy] Authentication failed', {
        error: '401 Unauthorized',
      });
    });
  });

  describe('#getRates', () => {
    beforeEach(() => {
      proxy = new UpsProxy();
    });

    it('should fetch rates successfully with multiple rates', async () => {
      const token = 'ups_access_token';
      const rateRequest = {
        RateRequest: {
          Shipment: {},
        },
      };

      const mockResponse = {
        RateResponse: {
          RatedShipment: [
            { Service: { Code: '03' }, TotalCharges: { MonetaryValue: '15.50' } },
            { Service: { Code: '01' }, TotalCharges: { MonetaryValue: '25.75' } },
          ],
        },
      };

      proxy.makeRequest = jest.fn().mockResolvedValue(mockResponse);

      const result = await proxy.getRates(token, rateRequest);

      expect(proxy.makeRequest).toHaveBeenCalledWith('/api/rating/v2/Shoptimeintransit', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ups_access_token',
          'Content-Type': 'application/json',
          'transId': expect.any(String),
          'transactionSrc': 'ShipSmartAI',
        },
        data: rateRequest,
        operation: 'get_rates',
      });

      expect(result).toEqual(mockResponse);
      expect(logger.info).toHaveBeenCalledWith('[UpsProxy] Rates fetched successfully', {
        rateCount: 2,
      });
    });

    it('should handle single rate response', async () => {
      const token = 'ups_access_token';
      const rateRequest = { RateRequest: { Shipment: {} } };

      const mockResponse = {
        RateResponse: {
          RatedShipment: { Service: { Code: '03' }, TotalCharges: { MonetaryValue: '15.50' } },
        },
      };

      proxy.makeRequest = jest.fn().mockResolvedValue(mockResponse);

      await proxy.getRates(token, rateRequest);

      expect(logger.info).toHaveBeenCalledWith('[UpsProxy] Rates fetched successfully', {
        rateCount: 1,
      });
    });

    it('should handle empty rate response', async () => {
      const token = 'ups_access_token';
      const rateRequest = { RateRequest: { Shipment: {} } };

      proxy.makeRequest = jest.fn().mockResolvedValue({ RateResponse: {} });

      await proxy.getRates(token, rateRequest);

      expect(logger.info).toHaveBeenCalledWith('[UpsProxy] Rates fetched successfully', {
        rateCount: 0,
      });
    });

    it('should throw error when rate fetch fails', async () => {
      const token = 'ups_access_token';
      const rateRequest = { RateRequest: { Shipment: {} } };

      proxy.makeRequest = jest.fn().mockRejectedValue(new Error('Service unavailable'));

      await expect(proxy.getRates(token, rateRequest)).rejects.toThrow('Service unavailable');
      expect(logger.error).toHaveBeenCalledWith('[UpsProxy] Rate fetch failed', {
        error: 'Service unavailable',
      });
    });
  });

  describe('#generateTransactionId', () => {
    beforeEach(() => {
      proxy = new UpsProxy();
    });

    it('should generate unique transaction ID', () => {
      const txId1 = proxy.generateTransactionId();
      const txId2 = proxy.generateTransactionId();

      expect(txId1).toMatch(/^\d+-[a-z0-9]+$/);
      expect(txId2).toMatch(/^\d+-[a-z0-9]+$/);
      expect(txId1).not.toBe(txId2);
    });
  });

  describe('#validateCredentials', () => {
    beforeEach(() => {
      proxy = new UpsProxy();
    });

    it('should return true for valid credentials', async () => {
      const credentials = {
        client_id: 'valid_id',
        client_secret: 'valid_secret',
        account_number: 'merchant_123',
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
        account_number: 'merchant_123',
      };

      proxy.authenticate = jest.fn().mockRejectedValue(new Error('Authentication failed'));

      const result = await proxy.validateCredentials(credentials);

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('[UpsProxy] Credential validation failed', {
        error: 'Authentication failed',
      });
    });
  });

  describe('#authenticate with token caching', () => {
    const credentials = {
      client_id: 'ups_client_id',
      client_secret: 'ups_client_secret',
      account_number: 'merchant_123',
    };
    const userId = 'user-456';

    beforeEach(() => {
      proxy = new UpsProxy();
      proxy.makeRequest = jest.fn().mockResolvedValue({
        access_token: 'fresh_ups_token',
        token_type: 'Bearer',
        expires_in: 14399,
      });

      // Re-setup Redis mock after clearAllMocks
      RedisWrapper.getRedisKey.mockImplementation((template, data) =>
        `CARRIER_TOKEN:${data.carrier}:${data.clientId}:${data.userId}`
      );
    });

    it('should return cached token on cache hit', async () => {
      RedisWrapper.get.mockResolvedValue('cached_ups_token');

      const token = await proxy.authenticate(credentials, userId);

      expect(token).toBe('cached_ups_token');
      expect(proxy.makeRequest).not.toHaveBeenCalled();
    });

    it('should fetch and cache token on cache miss', async () => {
      RedisWrapper.get.mockResolvedValue(null);
      RedisWrapper.setWithExpiry.mockResolvedValue('OK');

      const token = await proxy.authenticate(credentials, userId);

      expect(token).toBe('fresh_ups_token');
      expect(proxy.makeRequest).toHaveBeenCalled();
      expect(RedisWrapper.setWithExpiry).toHaveBeenCalledWith(
        expect.stringContaining('CARRIER_TOKEN:ups:ups_client_id:user-456'),
        'fresh_ups_token',
        14339 // 14399 - 60 safety margin
      );
    });

    it('should gracefully handle Redis get failure', async () => {
      RedisWrapper.get.mockRejectedValue(new Error('Redis connection failed'));

      const token = await proxy.authenticate(credentials, userId);

      expect(token).toBe('fresh_ups_token');
      expect(proxy.makeRequest).toHaveBeenCalled();
    });

    it('should gracefully handle Redis set failure', async () => {
      RedisWrapper.get.mockResolvedValue(null);
      RedisWrapper.setWithExpiry.mockRejectedValue(new Error('Redis write failed'));

      const token = await proxy.authenticate(credentials, userId);

      expect(token).toBe('fresh_ups_token');
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

      expect(token).toBe('fresh_ups_token');
      expect(RedisWrapper.get).not.toHaveBeenCalled();
      expect(RedisWrapper.setWithExpiry).not.toHaveBeenCalled();
    });
  });
});
