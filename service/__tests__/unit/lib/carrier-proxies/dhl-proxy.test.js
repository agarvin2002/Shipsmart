const DhlProxy = require('../../../../lib/carrier-proxies/dhl-proxy');
const axios = require('axios');
const { RATE_SUCCESS_DOMESTIC, RATE_ERROR, AUTH_SUCCESS } = require('../../../fixtures/dhl-mock-data');

// Mock axios
jest.mock('axios');

// Mock logger globally
global.logger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

// Mock cls-hooked to avoid CLS context errors
jest.mock('cls-hooked', () => ({
  getNamespace: jest.fn(() => ({
    get: jest.fn(() => null),
  })),
}));

// Mock worker producer
jest.mock('../../../../workers/utils/producer', () => ({
  getWorkerProducer: jest.fn(() => null),
}));

describe('DhlProxy', () => {
  let proxy;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create proxy with mock carrier config
    const mockCarrierConfig = {
      base_url: 'https://express.api.dhl.com/mydhlapi/test',
      timeout_ms: 15000,
      endpoints: { get_rates: { path: '/rates', method: 'POST' } },
      headers: { 'Content-Type': 'application/json' },
    };

    proxy = new DhlProxy(mockCarrierConfig);
  });

  describe('constructor', () => {
    it('should initialize with carrier config (DB-driven approach)', () => {
      const mockCarrierConfig = {
        base_url: 'https://express.api.dhl.com/mydhlapi',
        timeout_ms: 30000,
      };

      const proxyInstance = new DhlProxy(mockCarrierConfig);

      expect(proxyInstance.baseUrl).toBe('https://express.api.dhl.com/mydhlapi');
      expect(proxyInstance.timeout).toBe(30000);
      expect(proxyInstance.carrierName).toBe('DHL');
    });

    it('should initialize with legacy approach (no config)', () => {
      const proxyInstance = new DhlProxy();

      expect(proxyInstance.baseUrl).toBe('https://express.api.dhl.com/mydhlapi/test');
      expect(proxyInstance.timeout).toBe(15000);
      expect(proxyInstance.carrierName).toBe('DHL');
    });
  });

  describe('#authenticate', () => {
    it('should build Base64-encoded Basic Auth string', async () => {
      const credentials = {
        client_id: 'test_username',
        client_secret: 'test_password',
      };

      const authHeader = await proxy.authenticate(credentials);

      // Base64 of "test_username:test_password"
      const expectedAuth = Buffer.from('test_username:test_password').toString('base64');
      expect(authHeader).toBe(expectedAuth);
      expect(logger.info).toHaveBeenCalledWith('[DhlProxy] Building Basic Auth credentials');
      expect(logger.info).toHaveBeenCalledWith('[DhlProxy] Basic Auth credentials built successfully');
    });

    it('should throw error if credentials are missing', async () => {
      const credentials = {
        client_id: null,
        client_secret: null,
      };

      await expect(proxy.authenticate(credentials)).rejects.toThrow('DHL authentication failed');
    });
  });

  describe('#getRates', () => {
    it('should fetch rates successfully with Basic Auth header', async () => {
      const authHeader = AUTH_SUCCESS;
      const rateRequest = {
        unitOfMeasurement: 'imperial',
        packages: [{ weight: 5, dimensions: { length: 10, width: 10, height: 10 } }],
        customerDetails: {
          shipperDetails: { cityName: 'CHICAGO', countryCode: 'US', postalCode: '60601' },
          receiverDetails: { cityName: 'NEW YORK', countryCode: 'US', postalCode: '10001' },
        },
      };

      axios.mockResolvedValue({ data: RATE_SUCCESS_DOMESTIC });

      const response = await proxy.getRates(authHeader, rateRequest);

      expect(response).toEqual(RATE_SUCCESS_DOMESTIC);
      expect(axios).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://express.api.dhl.com/mydhlapi/test/rates',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authHeader}`,
        },
        data: rateRequest,
        params: null,
        timeout: 15000,
      });
      expect(logger.info).toHaveBeenCalledWith('[DhlProxy] Fetching rates');
      expect(logger.info).toHaveBeenCalledWith(
        '[DhlProxy] Rates fetched successfully',
        { productCount: 1 }
      );
    });

    it('should handle empty products array', async () => {
      const authHeader = AUTH_SUCCESS;
      const rateRequest = {
        unitOfMeasurement: 'imperial',
        packages: [{ weight: 1, dimensions: { length: 1, width: 1, height: 1 } }],
      };

      axios.mockResolvedValue({ data: { products: [], exchangeRates: [] } });

      const response = await proxy.getRates(authHeader, rateRequest);

      expect(response.products).toEqual([]);
      expect(logger.info).toHaveBeenCalledWith(
        '[DhlProxy] Rates fetched successfully',
        { productCount: 0 }
      );
    });

    it('should throw error on API failure', async () => {
      const authHeader = AUTH_SUCCESS;
      const rateRequest = { unitOfMeasurement: 'imperial', packages: [] };

      axios.mockRejectedValue({
        response: {
          status: 400,
          data: RATE_ERROR,
        },
      });

      await expect(proxy.getRates(authHeader, rateRequest)).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle 401 unauthorized error', async () => {
      const authHeader = 'invalid_auth';
      const rateRequest = { unitOfMeasurement: 'imperial', packages: [] };

      axios.mockRejectedValue({
        response: {
          status: 401,
          data: { error: 'Unauthorized' },
        },
      });

      await expect(proxy.getRates(authHeader, rateRequest)).rejects.toThrow('DHL authentication failed');
    });

    it('should handle timeout error', async () => {
      const authHeader = AUTH_SUCCESS;
      const rateRequest = { unitOfMeasurement: 'imperial', packages: [] };

      axios.mockRejectedValue({
        code: 'ECONNABORTED',
        message: 'timeout of 15000ms exceeded',
      });

      await expect(proxy.getRates(authHeader, rateRequest)).rejects.toThrow('DHL API request timeout');
    });
  });

  describe('#validateCredentials', () => {
    it('should return true for valid credentials', async () => {
      const credentials = {
        client_id: 'valid_username',
        client_secret: 'valid_password',
        account_number: '123456789',
      };

      axios.mockResolvedValue({ data: RATE_SUCCESS_DOMESTIC });

      const result = await proxy.validateCredentials(credentials);

      expect(result).toBe(true);
      expect(axios).toHaveBeenCalled();
    });

    it('should return false for invalid credentials', async () => {
      const credentials = {
        client_id: 'invalid_username',
        client_secret: 'invalid_password',
        account_number: '123456789',
      };

      axios.mockRejectedValue({
        response: {
          status: 401,
          data: { error: 'Invalid credentials' },
        },
      });

      const result = await proxy.validateCredentials(credentials);

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        '[DhlProxy] Credential validation failed',
        expect.objectContaining({ error: expect.any(String) })
      );
    });
  });
});
