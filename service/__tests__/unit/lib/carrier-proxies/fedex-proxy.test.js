/**
 * FedexProxy Unit Tests
 */

// Mock dependencies BEFORE requiring FedexProxy
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

const FedexProxy = require('../../../../lib/carrier-proxies/fedex-proxy');
const config = require('@shipsmart/env');
const axios = require('axios');

describe('FedexProxy', () => {
  let proxy;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock config.get for FedEx
    config.get = jest.fn((key) => {
      if (key === 'carriers:fedex:api_url') return 'https://apis-sandbox.fedex.com';
      if (key === 'carriers:fedex:timeout') return 15000;
      return null;
    });

    global.logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };
  });

  afterEach(() => {
    delete global.logger;
  });

  describe('constructor', () => {
    it('should initialize with carrierConfig (DB-driven)', () => {
      const carrierConfig = {
        base_url: 'https://apis-custom.fedex.com',
        timeout_ms: 20000,
        endpoints: {},
        headers: {},
      };

      proxy = new FedexProxy(carrierConfig);

      expect(proxy.carrierName).toBe('FedEx');
      expect(proxy.baseUrl).toBe('https://apis-custom.fedex.com');
      expect(proxy.timeout).toBe(20000);
    });

    it('should initialize with environment config (legacy)', () => {
      proxy = new FedexProxy();

      expect(proxy.carrierName).toBe('FedEx');
      expect(config.get).toHaveBeenCalledWith('carriers:fedex:api_url');
      expect(config.get).toHaveBeenCalledWith('carriers:fedex:timeout');
    });
  });

  describe('#authenticate', () => {
    beforeEach(() => {
      proxy = new FedexProxy();
    });

    it('should authenticate successfully with valid credentials', async () => {
      const credentials = {
        client_id: 'fedex_client_id',
        client_secret: 'fedex_client_secret',
      };

      proxy.makeRequest = jest.fn().mockResolvedValue({
        access_token: 'fedex_access_token',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      const token = await proxy.authenticate(credentials);

      expect(proxy.makeRequest).toHaveBeenCalledWith('/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'x-customer-transaction-id': expect.any(String),
          'x-locale': 'en_US',
        },
        data: expect.stringContaining('grant_type=client_credentials'),
        operation: 'authenticate',
      });

      expect(token).toBe('fedex_access_token');
      expect(logger.info).toHaveBeenCalledWith('[FedexProxy] Authenticating with OAuth 2.0');
      expect(logger.info).toHaveBeenCalledWith('[FedexProxy] Authentication successful');
    });

    it('should throw error when authentication fails', async () => {
      const credentials = {
        client_id: 'invalid_id',
        client_secret: 'invalid_secret',
      };

      proxy.makeRequest = jest.fn().mockRejectedValue(new Error('401 Unauthorized'));

      await expect(proxy.authenticate(credentials)).rejects.toThrow('FedEx authentication failed: 401 Unauthorized');
      expect(logger.error).toHaveBeenCalledWith('[FedexProxy] Authentication failed', {
        error: '401 Unauthorized',
      });
    });
  });

  describe('#getRates', () => {
    beforeEach(() => {
      proxy = new FedexProxy();
    });

    it('should fetch rates successfully', async () => {
      const token = 'fedex_access_token';
      const rateRequest = {
        accountNumber: { value: '123456789' },
        requestedShipment: {},
      };

      const mockResponse = {
        output: {
          rateReplyDetails: [
            { serviceName: 'FedEx Ground', rateAmount: 15.50 },
            { serviceName: 'FedEx Express', rateAmount: 25.75 },
          ],
        },
      };

      proxy.makeRequest = jest.fn().mockResolvedValue(mockResponse);

      const result = await proxy.getRates(token, rateRequest);

      expect(proxy.makeRequest).toHaveBeenCalledWith('/rate/v1/rates/quotes', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer fedex_access_token',
          'x-customer-transaction-id': expect.any(String),
          'x-locale': 'en_US',
        },
        data: rateRequest,
        operation: 'get_rates',
      });

      expect(result).toEqual(mockResponse);
      expect(logger.info).toHaveBeenCalledWith('[FedexProxy] Rates fetched successfully', {
        rateCount: 2,
      });
    });

    it('should handle empty rate response', async () => {
      const token = 'fedex_access_token';
      const rateRequest = { accountNumber: { value: '123456789' } };

      proxy.makeRequest = jest.fn().mockResolvedValue({ output: {} });

      const result = await proxy.getRates(token, rateRequest);

      expect(logger.info).toHaveBeenCalledWith('[FedexProxy] Rates fetched successfully', {
        rateCount: 0,
      });
    });

    it('should throw error when rate fetch fails', async () => {
      const token = 'fedex_access_token';
      const rateRequest = { accountNumber: { value: '123456789' } };

      proxy.makeRequest = jest.fn().mockRejectedValue(new Error('Service unavailable'));

      await expect(proxy.getRates(token, rateRequest)).rejects.toThrow('Service unavailable');
      expect(logger.error).toHaveBeenCalledWith('[FedexProxy] Rate fetch failed', {
        error: 'Service unavailable',
      });
    });
  });

  describe('#generateTransactionId', () => {
    beforeEach(() => {
      proxy = new FedexProxy();
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
      proxy = new FedexProxy();
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
      expect(logger.error).toHaveBeenCalledWith('[FedexProxy] Credential validation failed', {
        error: 'Authentication failed',
      });
    });
  });
});
