/**
 * FedexRateService Unit Tests
 * Tests FedEx-specific rate transformation and API integration
 */

const FedexRateService = require('../../../../services/carriers/fedex-rate-service');
const FedexProxy = require('../../../../lib/carrier-proxies/fedex-proxy');
const FedexRateRequestBuilder = require('../../../../lib/request-builders/fedex-rate-request-builder');
const CryptoHelper = require('../../../../helpers/crypto-helper');

// Mock all dependencies
jest.mock('../../../../lib/carrier-proxies/fedex-proxy');
jest.mock('../../../../lib/request-builders/fedex-rate-request-builder');
jest.mock('../../../../helpers/crypto-helper');

describe('FedexRateService Unit Tests', () => {
  let fedexService;
  let mockCarrierCredential;
  let mockDecryptedCredentials;
  let mockProxyInstance;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Mock CryptoHelper.decrypt
    CryptoHelper.decrypt = jest.fn((encrypted) => `decrypted_${encrypted}`);

    // Setup carrier credential
    mockCarrierCredential = {
      carrier: 'fedex',
      client_id_encrypted: 'encrypted_client_id',
      client_secret_encrypted: 'encrypted_client_secret',
      account_numbers: ['123456789'],
      carrierConfig: {
        api_url: 'https://apis-sandbox.fedex.com'
      },
      services: [
        { service_code: 'FEDEX_GROUND', service_name: 'FedEx Ground' },
        { service_code: 'FEDEX_2_DAY', service_name: 'FedEx 2Day' }
      ]
    };

    mockDecryptedCredentials = {
      client_id: 'decrypted_encrypted_client_id',
      client_secret: 'decrypted_encrypted_client_secret',
      account_number: '123456789',
      account_numbers: ['123456789']
    };

    // Mock proxy instance methods
    mockProxyInstance = {
      authenticate: jest.fn(),
      getRates: jest.fn()
    };

    // Mock FedexProxy constructor to return our mock instance
    FedexProxy.mockImplementation(() => mockProxyInstance);

    // Create service instance
    fedexService = new FedexRateService(mockCarrierCredential);
  });

  describe('#getRates', () => {
    const shipmentData = {
      origin: { postal_code: '10001', country: 'US' },
      destination: { postal_code: '90210', country: 'US' },
      packages: [{ weight: 10, length: 12, width: 8, height: 6 }]
    };

    it('should successfully fetch and transform rates', async () => {
      // Arrange
      const mockToken = 'mock_fedex_token';
      const mockRateRequest = { shipment: {}, accountNumber: {} };
      const mockFedexResponse = {
        output: {
          rateReplyDetails: [
            {
              serviceType: 'FEDEX_GROUND',
              serviceName: 'FedEx Ground',
              ratedShipmentDetails: [
                {
                  rateType: 'ACCOUNT',
                  totalNetCharge: 15.50,
                  currency: 'USD'
                }
              ],
              commit: {
                transitDays: { minimumTransitTime: 'FIVE_DAYS' }
              }
            }
          ]
        }
      };

      mockProxyInstance.authenticate.mockResolvedValue(mockToken);
      mockProxyInstance.getRates.mockResolvedValue(mockFedexResponse);
      FedexRateRequestBuilder.buildRateRequest = jest.fn().mockReturnValue(mockRateRequest);

      // Act
      const rates = await fedexService.getRates(shipmentData);

      // Assert
      expect(mockProxyInstance.authenticate).toHaveBeenCalledWith(mockDecryptedCredentials);
      expect(FedexRateRequestBuilder.buildRateRequest).toHaveBeenCalledWith(
        shipmentData,
        mockDecryptedCredentials
      );
      expect(mockProxyInstance.getRates).toHaveBeenCalledWith(mockToken, mockRateRequest);
      expect(rates).toHaveLength(1);
      expect(rates[0].carrier).toBe('fedex');
      expect(rates[0].rate_amount).toBe(15.50);
    });

    it('should throw error when authentication fails', async () => {
      // Arrange
      mockProxyInstance.authenticate.mockRejectedValue(
        new Error('FedEx authentication failed')
      );

      // Act & Assert
      await expect(fedexService.getRates(shipmentData)).rejects.toThrow(
        'FedEx authentication failed'
      );
    });

    it('should throw error when rate fetch fails', async () => {
      // Arrange
      const mockToken = 'mock_token';
      mockProxyInstance.authenticate.mockResolvedValue(mockToken);
      mockProxyInstance.getRates.mockRejectedValue(
        new Error('FedEx API timeout')
      );
      FedexRateRequestBuilder.buildRateRequest = jest.fn().mockReturnValue({});

      // Act & Assert
      await expect(fedexService.getRates(shipmentData)).rejects.toThrow('FedEx API timeout');
    });
  });

  describe('#transformRates', () => {
    it('should transform FedEx rates to standard format', () => {
      // Arrange
      const fedexResponse = {
        output: {
          rateReplyDetails: [
            {
              serviceType: 'FEDEX_GROUND',
              serviceName: 'FedEx Ground',
              ratedShipmentDetails: [
                {
                  rateType: 'ACCOUNT',
                  totalNetCharge: 15.50,
                  currency: 'USD'
                }
              ],
              commit: {
                transitDays: { minimumTransitTime: 'FIVE_DAYS' },
                dateDetail: { dayFormat: '2024-12-20' }
              },
              operationalDetail: {
                deliveryDate: '2024-12-20'
              }
            }
          ]
        }
      };

      const shipmentData = {
        origin: { country: 'US' },
        destination: { country: 'US' }
      };

      // Act
      const rates = fedexService.transformRates(fedexResponse, shipmentData);

      // Assert
      expect(rates).toHaveLength(1);
      expect(rates[0].carrier).toBe('fedex');
      expect(rates[0].service_code).toBe('FEDEX_GROUND');
      expect(rates[0].rate_amount).toBe(15.50);
      expect(rates[0].currency).toBe('USD');
      expect(rates[0].delivery_days).toBe(5);
      expect(rates[0].estimated_delivery_date).toBe('2024-12-20');
    });

    it('should return empty array when no rates in response', () => {
      // Arrange
      const emptyResponse = { output: { rateReplyDetails: [] } };
      const shipmentData = {
        origin: { country: 'US' },
        destination: { country: 'US' }
      };

      // Act
      const rates = fedexService.transformRates(emptyResponse, shipmentData);

      // Assert
      expect(rates).toEqual([]);
    });

    it('should filter rates by selected services for domestic shipments', () => {
      // Arrange
      const fedexResponse = {
        output: {
          rateReplyDetails: [
            {
              serviceType: 'FEDEX_GROUND',
              serviceName: 'FedEx Ground',
              ratedShipmentDetails: [
                { rateType: 'ACCOUNT', totalNetCharge: 15.50, currency: 'USD' }
              ]
            },
            {
              serviceType: 'PRIORITY_OVERNIGHT',
              serviceName: 'FedEx Priority Overnight',
              ratedShipmentDetails: [
                { rateType: 'ACCOUNT', totalNetCharge: 45.00, currency: 'USD' }
              ]
            }
          ]
        }
      };

      const shipmentData = {
        origin: { country: 'US' },
        destination: { country: 'US' }
      };

      // Act - Only FEDEX_GROUND and FEDEX_2_DAY selected in services
      const rates = fedexService.transformRates(fedexResponse, shipmentData);

      // Assert - Should only include FEDEX_GROUND
      expect(rates).toHaveLength(1);
      expect(rates[0].service_code).toBe('FEDEX_GROUND');
    });

    it('should include all services for international shipments', () => {
      // Arrange
      const fedexResponse = {
        output: {
          rateReplyDetails: [
            {
              serviceType: 'INTERNATIONAL_ECONOMY',
              serviceName: 'FedEx International Economy',
              ratedShipmentDetails: [
                { rateType: 'ACCOUNT', totalNetCharge: 125.00, currency: 'USD' }
              ]
            },
            {
              serviceType: 'INTERNATIONAL_PRIORITY',
              serviceName: 'FedEx International Priority',
              ratedShipmentDetails: [
                { rateType: 'ACCOUNT', totalNetCharge: 185.00, currency: 'USD' }
              ]
            }
          ]
        }
      };

      const shipmentData = {
        origin: { country: 'US' },
        destination: { country: 'CA' }
      };

      // Act
      const rates = fedexService.transformRates(fedexResponse, shipmentData);

      // Assert - Should include both international services regardless of selections
      expect(rates).toHaveLength(2);
      expect(rates[0].delivery_days).toBeNull(); // No delivery days for international
      expect(rates[0].estimated_delivery_date).toBeNull();
    });

    it('should prefer ACCOUNT rate over LIST rate', () => {
      // Arrange
      const fedexResponse = {
        output: {
          rateReplyDetails: [
            {
              serviceType: 'FEDEX_GROUND',
              serviceName: 'FedEx Ground',
              ratedShipmentDetails: [
                { rateType: 'LIST', totalNetCharge: 20.00, currency: 'USD' },
                { rateType: 'ACCOUNT', totalNetCharge: 15.50, currency: 'USD' }
              ]
            }
          ]
        }
      };

      const shipmentData = {
        origin: { country: 'US' },
        destination: { country: 'US' }
      };

      // Act
      const rates = fedexService.transformRates(fedexResponse, shipmentData);

      // Assert - Should use ACCOUNT rate (15.50), not LIST rate (20.00)
      expect(rates[0].rate_amount).toBe(15.50);
    });

    it('should fallback to first rate if no ACCOUNT rate', () => {
      // Arrange
      const fedexResponse = {
        output: {
          rateReplyDetails: [
            {
              serviceType: 'FEDEX_GROUND',
              serviceName: 'FedEx Ground',
              ratedShipmentDetails: [
                { rateType: 'LIST', totalNetCharge: 20.00, currency: 'USD' }
              ]
            }
          ]
        }
      };

      const shipmentData = {
        origin: { country: 'US' },
        destination: { country: 'US' }
      };

      // Act
      const rates = fedexService.transformRates(fedexResponse, shipmentData);

      // Assert
      expect(rates[0].rate_amount).toBe(20.00);
    });

    it('should skip rates without ratedShipmentDetails', () => {
      // Arrange
      const fedexResponse = {
        output: {
          rateReplyDetails: [
            {
              serviceType: 'FEDEX_GROUND',
              serviceName: 'FedEx Ground',
              ratedShipmentDetails: []
            }
          ]
        }
      };

      const shipmentData = {
        origin: { country: 'US' },
        destination: { country: 'US' }
      };

      // Act
      const rates = fedexService.transformRates(fedexResponse, shipmentData);

      // Assert
      expect(rates).toEqual([]);
    });

    it('should use totalBaseCharge if totalNetCharge not available', () => {
      // Arrange
      const fedexResponse = {
        output: {
          rateReplyDetails: [
            {
              serviceType: 'FEDEX_GROUND',
              serviceName: 'FedEx Ground',
              ratedShipmentDetails: [
                { rateType: 'ACCOUNT', totalBaseCharge: 18.00, currency: 'USD' }
              ]
            }
          ]
        }
      };

      const shipmentData = {
        origin: { country: 'US' },
        destination: { country: 'US' }
      };

      // Act
      const rates = fedexService.transformRates(fedexResponse, shipmentData);

      // Assert
      expect(rates[0].rate_amount).toBe(18.00);
    });
  });

  describe('#isInternationalShipment', () => {
    it('should return true when countries differ', () => {
      // Arrange
      const origin = { country: 'US' };
      const destination = { country: 'CA' };

      // Act
      const result = fedexService.isInternationalShipment(origin, destination);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when countries match', () => {
      // Arrange
      const origin = { country: 'US' };
      const destination = { country: 'US' };

      // Act
      const result = fedexService.isInternationalShipment(origin, destination);

      // Assert
      expect(result).toBe(false);
    });

    it('should default to US when country not specified', () => {
      // Arrange
      const origin = {};
      const destination = {};

      // Act
      const result = fedexService.isInternationalShipment(origin, destination);

      // Assert
      expect(result).toBe(false); // Both default to US
    });
  });

  describe('#extractTransitDays', () => {
    it('should extract transit days from commit.transitDays', () => {
      // Arrange
      const rate = {
        commit: {
          transitDays: { minimumTransitTime: 'THREE_DAYS' }
        }
      };

      // Act
      const transitDays = fedexService.extractTransitDays(rate);

      // Assert
      expect(transitDays).toBe(3);
    });

    it('should map all transit time strings correctly', () => {
      // Test various transit time strings
      const testCases = [
        { input: 'ONE_DAY', expected: 1 },
        { input: 'TWO_DAYS', expected: 2 },
        { input: 'THREE_DAYS', expected: 3 },
        { input: 'FOUR_DAYS', expected: 4 },
        { input: 'FIVE_DAYS', expected: 5 },
        { input: 'SIX_DAYS', expected: 6 },
        { input: 'SEVEN_DAYS', expected: 7 }
      ];

      testCases.forEach(({ input, expected }) => {
        const rate = { commit: { transitDays: { minimumTransitTime: input } } };
        expect(fedexService.extractTransitDays(rate)).toBe(expected);
      });
    });

    it('should fallback to estimateTransitDays when commit data not available', () => {
      // Arrange
      const rate = { serviceType: 'FEDEX_GROUND' };

      // Act
      const transitDays = fedexService.extractTransitDays(rate);

      // Assert
      expect(transitDays).toBe(5); // FEDEX_GROUND estimates to 5 days
    });

    it('should return null for unknown transit time', () => {
      // Arrange
      const rate = {
        serviceType: 'UNKNOWN_SERVICE',
        commit: {
          transitDays: { minimumTransitTime: 'UNKNOWN' }
        }
      };

      // Act
      const transitDays = fedexService.extractTransitDays(rate);

      // Assert
      expect(transitDays).toBeNull();
    });
  });

  describe('#estimateTransitDays', () => {
    it('should estimate transit days for known service types', () => {
      // Arrange & Act & Assert
      expect(fedexService.estimateTransitDays('STANDARD_OVERNIGHT')).toBe(1);
      expect(fedexService.estimateTransitDays('PRIORITY_OVERNIGHT')).toBe(1);
      expect(fedexService.estimateTransitDays('FIRST_OVERNIGHT')).toBe(1);
      expect(fedexService.estimateTransitDays('FEDEX_2_DAY')).toBe(2);
      expect(fedexService.estimateTransitDays('FEDEX_2_DAY_AM')).toBe(2);
      expect(fedexService.estimateTransitDays('FEDEX_EXPRESS_SAVER')).toBe(3);
      expect(fedexService.estimateTransitDays('FEDEX_GROUND')).toBe(5);
      expect(fedexService.estimateTransitDays('GROUND_HOME_DELIVERY')).toBe(5);
    });

    it('should return null for unknown service types', () => {
      // Act & Assert
      expect(fedexService.estimateTransitDays('UNKNOWN_SERVICE')).toBeNull();
      expect(fedexService.estimateTransitDays(null)).toBeNull();
      expect(fedexService.estimateTransitDays(undefined)).toBeNull();
    });
  });

  describe('#validateCredentials', () => {
    it('should return valid when authentication succeeds', async () => {
      // Arrange
      mockProxyInstance.authenticate.mockResolvedValue('mock_token');

      // Act
      const result = await fedexService.validateCredentials();

      // Assert
      expect(mockProxyInstance.authenticate).toHaveBeenCalledWith(mockDecryptedCredentials);
      expect(result.valid).toBe(true);
      expect(result.carrier).toBe('fedex');
    });

    it('should return invalid when authentication fails', async () => {
      // Arrange
      mockProxyInstance.authenticate.mockRejectedValue(
        new Error('Invalid credentials')
      );

      // Act
      const result = await fedexService.validateCredentials();

      // Assert
      expect(result.valid).toBe(false);
      expect(result.carrier).toBe('fedex');
      expect(result.error).toBe('Invalid credentials');
    });
  });

  describe('Constructor and initialization', () => {
    it('should initialize with carrier credential', () => {
      // Assert
      expect(fedexService.carrierName).toBe('fedex');
      expect(fedexService.decryptedCredentials.client_id).toBe('decrypted_encrypted_client_id');
      expect(fedexService.decryptedCredentials.account_number).toBe('123456789');
      expect(fedexService.services).toHaveLength(2);
    });

    it('should decrypt credentials using CryptoHelper', () => {
      // Assert
      expect(CryptoHelper.decrypt).toHaveBeenCalledWith('encrypted_client_id');
      expect(CryptoHelper.decrypt).toHaveBeenCalledWith('encrypted_client_secret');
    });
  });
});
