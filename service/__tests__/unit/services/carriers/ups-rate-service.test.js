/**
 * UpsRateService Unit Tests
 * Tests UPS-specific rate transformation and API integration
 */

// Mock all dependencies FIRST before any requires
jest.mock('../../../../lib/carrier-proxies/ups-proxy');
jest.mock('../../../../lib/request-builders/ups-rate-request-builder');
jest.mock('../../../../helpers/crypto-helper');
jest.mock('../../../../workers/utils/producer', () => ({
  getWorkerProducer: jest.fn(() => ({ publishMessage: jest.fn() })),
}));
jest.mock('cls-hooked', () => ({
  getNamespace: jest.fn(() => null),
}));

const UpsRateService = require('../../../../services/carriers/ups-rate-service');
const UpsProxy = require('../../../../lib/carrier-proxies/ups-proxy');
const UpsRateRequestBuilder = require('../../../../lib/request-builders/ups-rate-request-builder');
const CryptoHelper = require('../../../../helpers/crypto-helper');

describe('UpsRateService Unit Tests', () => {
  let upsService;
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
      carrier: 'ups',
      user_id: 'user-test-456',
      client_id_encrypted: 'encrypted_client_id',
      client_secret_encrypted: 'encrypted_client_secret',
      account_numbers: ['ABC123'],
      carrierConfig: {
        api_url: 'https://wwwcie.ups.com'
      },
      services: [
        { service_code: '03', service_name: 'UPS Ground' },
        { service_code: '02', service_name: 'UPS 2nd Day Air' }
      ]
    };

    mockDecryptedCredentials = {
      client_id: 'decrypted_encrypted_client_id',
      client_secret: 'decrypted_encrypted_client_secret',
      account_number: 'ABC123',
      account_numbers: ['ABC123']
    };

    // Mock proxy instance methods
    mockProxyInstance = {
      authenticate: jest.fn(),
      getRates: jest.fn()
    };

    // Mock UpsProxy constructor to return our mock instance
    UpsProxy.mockImplementation(() => mockProxyInstance);

    // Create service instance
    upsService = new UpsRateService(mockCarrierCredential);
  });

  describe('#getRates', () => {
    const shipmentData = {
      origin: { postal_code: '10001', country: 'US' },
      destination: { postal_code: '90210', country: 'US' },
      packages: [{ weight: 10, length: 12, width: 8, height: 6 }]
    };

    it('should successfully fetch and transform rates', async () => {
      // Arrange
      const mockToken = 'mock_ups_token';
      const mockRateRequest = { shipment: {}, accountNumber: {} };
      const mockUpsResponse = {
        RateResponse: {
          RatedShipment: [
            {
              Service: { Code: '03' },
              TotalCharges: { MonetaryValue: '12.50', CurrencyCode: 'USD' },
              TimeInTransit: {
                ServiceSummary: {
                  EstimatedArrival: {
                    BusinessDaysInTransit: '5',
                    Date: '2024-12-20'
                  }
                }
              }
            }
          ]
        }
      };

      mockProxyInstance.authenticate.mockResolvedValue(mockToken);
      mockProxyInstance.getRates.mockResolvedValue(mockUpsResponse);
      UpsRateRequestBuilder.buildRateRequest = jest.fn().mockReturnValue(mockRateRequest);

      // Act
      const rates = await upsService.getRates(shipmentData);

      // Assert
      expect(mockProxyInstance.authenticate).toHaveBeenCalledWith(mockDecryptedCredentials, 'user-test-456');
      expect(UpsRateRequestBuilder.buildRateRequest).toHaveBeenCalledWith(
        shipmentData,
        mockDecryptedCredentials
      );
      expect(mockProxyInstance.getRates).toHaveBeenCalledWith(mockToken, mockRateRequest);
      expect(rates).toHaveLength(1);
      expect(rates[0].carrier).toBe('ups');
      expect(rates[0].rate_amount).toBe(12.50);
    });

    it('should throw error when authentication fails', async () => {
      // Arrange
      mockProxyInstance.authenticate.mockRejectedValue(
        new Error('UPS authentication failed')
      );

      // Act & Assert
      await expect(upsService.getRates(shipmentData)).rejects.toThrow(
        'UPS authentication failed'
      );
    });

    it('should throw error when rate fetch fails', async () => {
      // Arrange
      const mockToken = 'mock_token';
      mockProxyInstance.authenticate.mockResolvedValue(mockToken);
      mockProxyInstance.getRates.mockRejectedValue(
        new Error('UPS API timeout')
      );
      UpsRateRequestBuilder.buildRateRequest = jest.fn().mockReturnValue({});

      // Act & Assert
      await expect(upsService.getRates(shipmentData)).rejects.toThrow('UPS API timeout');
    });
  });

  describe('#transformRates', () => {
    it('should transform UPS rates to standard format', () => {
      // Arrange
      const upsResponse = {
        RateResponse: {
          RatedShipment: [
            {
              Service: { Code: '03' },
              TotalCharges: { MonetaryValue: '12.50', CurrencyCode: 'USD' },
              TimeInTransit: {
                ServiceSummary: {
                  EstimatedArrival: {
                    BusinessDaysInTransit: '5',
                    Date: '2024-12-20'
                  }
                }
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
      const rates = upsService.transformRates(upsResponse, shipmentData);

      // Assert
      expect(rates).toHaveLength(1);
      expect(rates[0].carrier).toBe('ups');
      expect(rates[0].service_code).toBe('03');
      expect(rates[0].service_name).toBe('UPS Ground');
      expect(rates[0].rate_amount).toBe(12.50);
      expect(rates[0].currency).toBe('USD');
      expect(rates[0].delivery_days).toBe(5);
      expect(rates[0].estimated_delivery_date).toBe('2024-12-20');
    });

    it('should normalize single RatedShipment object to array', () => {
      // Arrange
      const upsResponse = {
        RateResponse: {
          RatedShipment: {
            Service: { Code: '03' },
            TotalCharges: { MonetaryValue: '12.50', CurrencyCode: 'USD' }
          }
        }
      };

      const shipmentData = {
        origin: { country: 'US' },
        destination: { country: 'US' }
      };

      // Act
      const rates = upsService.transformRates(upsResponse, shipmentData);

      // Assert
      expect(rates).toHaveLength(1);
      expect(rates[0].service_code).toBe('03');
    });

    it('should return empty array when no rates in response', () => {
      // Arrange
      const emptyResponse = { RateResponse: { RatedShipment: [] } };
      const shipmentData = {
        origin: { country: 'US' },
        destination: { country: 'US' }
      };

      // Act
      const rates = upsService.transformRates(emptyResponse, shipmentData);

      // Assert
      expect(rates).toEqual([]);
    });

    it('should filter rates by selected services for domestic shipments', () => {
      // Arrange
      const upsResponse = {
        RateResponse: {
          RatedShipment: [
            {
              Service: { Code: '03' },
              TotalCharges: { MonetaryValue: '12.50', CurrencyCode: 'USD' }
            },
            {
              Service: { Code: '01' },
              TotalCharges: { MonetaryValue: '45.00', CurrencyCode: 'USD' }
            }
          ]
        }
      };

      const shipmentData = {
        origin: { country: 'US' },
        destination: { country: 'US' }
      };

      // Act - Only '03' and '02' selected in services
      const rates = upsService.transformRates(upsResponse, shipmentData);

      // Assert - Should only include '03'
      expect(rates).toHaveLength(1);
      expect(rates[0].service_code).toBe('03');
    });

    it('should include all services for international shipments', () => {
      // Arrange
      const upsResponse = {
        RateResponse: {
          RatedShipment: [
            {
              Service: { Code: '07' },
              TotalCharges: { MonetaryValue: '125.00', CurrencyCode: 'USD' }
            },
            {
              Service: { Code: '08' },
              TotalCharges: { MonetaryValue: '85.00', CurrencyCode: 'USD' }
            }
          ]
        }
      };

      const shipmentData = {
        origin: { country: 'US' },
        destination: { country: 'CA' }
      };

      // Act
      const rates = upsService.transformRates(upsResponse, shipmentData);

      // Assert - Should include both international services
      expect(rates).toHaveLength(2);
      expect(rates[0].delivery_days).toBeNull(); // No delivery days for international
      expect(rates[0].estimated_delivery_date).toBeNull();
    });

    it('should prefer negotiated rates over standard rates', () => {
      // Arrange
      const upsResponse = {
        RateResponse: {
          RatedShipment: [
            {
              Service: { Code: '03' },
              TotalCharges: { MonetaryValue: '15.00', CurrencyCode: 'USD' },
              NegotiatedRateCharges: {
                TotalCharge: { MonetaryValue: '12.00', CurrencyCode: 'USD' }
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
      const rates = upsService.transformRates(upsResponse, shipmentData);

      // Assert - Should use negotiated rate (12.00), not standard rate (15.00)
      expect(rates[0].rate_amount).toBe(12.00);
    });

    it('should fallback to standard rate if no negotiated rate', () => {
      // Arrange
      const upsResponse = {
        RateResponse: {
          RatedShipment: [
            {
              Service: { Code: '03' },
              TotalCharges: { MonetaryValue: '15.00', CurrencyCode: 'USD' }
            }
          ]
        }
      };

      const shipmentData = {
        origin: { country: 'US' },
        destination: { country: 'US' }
      };

      // Act
      const rates = upsService.transformRates(upsResponse, shipmentData);

      // Assert
      expect(rates[0].rate_amount).toBe(15.00);
    });
  });

  describe('#extractTransitTime', () => {
    it('should extract transit time from TimeInTransit', () => {
      // Arrange
      const rate = {
        TimeInTransit: {
          ServiceSummary: {
            EstimatedArrival: {
              BusinessDaysInTransit: '3',
              Date: '2024-12-18'
            }
          }
        }
      };

      // Act
      const result = upsService.extractTransitTime(rate);

      // Assert
      expect(result.deliveryDays).toBe(3);
      expect(result.estimatedDeliveryDate).toBe('2024-12-18');
    });

    it('should extract transit time from GuaranteedDelivery', () => {
      // Arrange
      const rate = {
        Service: { Code: '01' },
        GuaranteedDelivery: {
          BusinessDaysInTransit: '1',
          DeliveryByTime: '10:30 AM'
        }
      };

      // Act
      const result = upsService.extractTransitTime(rate);

      // Assert
      expect(result.deliveryDays).toBe(1);
      expect(result.estimatedDeliveryDate).toBe('10:30 AM');
    });

    it('should fallback to estimateTransitDays when no transit info', () => {
      // Arrange
      const rate = {
        Service: { Code: '03' }
      };

      // Act
      const result = upsService.extractTransitTime(rate);

      // Assert
      expect(result.deliveryDays).toBe(5); // UPS Ground estimates to 5 days
    });

    it('should handle Arrival.Date in TimeInTransit', () => {
      // Arrange
      const rate = {
        TimeInTransit: {
          ServiceSummary: {
            EstimatedArrival: {
              BusinessDaysInTransit: '2',
              Arrival: { Date: '2024-12-19' }
            }
          }
        }
      };

      // Act
      const result = upsService.extractTransitTime(rate);

      // Assert
      expect(result.deliveryDays).toBe(2);
      expect(result.estimatedDeliveryDate).toBe('2024-12-19');
    });
  });

  describe('#isInternationalShipment', () => {
    it('should return true when countries differ', () => {
      // Arrange
      const origin = { country: 'US' };
      const destination = { country: 'CA' };

      // Act
      const result = upsService.isInternationalShipment(origin, destination);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when countries match', () => {
      // Arrange
      const origin = { country: 'US' };
      const destination = { country: 'US' };

      // Act
      const result = upsService.isInternationalShipment(origin, destination);

      // Assert
      expect(result).toBe(false);
    });

    it('should default to US when country not specified', () => {
      // Arrange
      const origin = {};
      const destination = {};

      // Act
      const result = upsService.isInternationalShipment(origin, destination);

      // Assert
      expect(result).toBe(false); // Both default to US
    });
  });

  describe('#getServiceName', () => {
    it('should map UPS service codes to names', () => {
      // Assert
      expect(upsService.getServiceName('01')).toBe('UPS Next Day Air');
      expect(upsService.getServiceName('02')).toBe('UPS 2nd Day Air');
      expect(upsService.getServiceName('03')).toBe('UPS Ground');
      expect(upsService.getServiceName('07')).toBe('UPS Worldwide Express');
      expect(upsService.getServiceName('08')).toBe('UPS Worldwide Expedited');
      expect(upsService.getServiceName('11')).toBe('UPS Standard');
      expect(upsService.getServiceName('12')).toBe('UPS 3 Day Select');
      expect(upsService.getServiceName('13')).toBe('UPS Next Day Air Saver');
      expect(upsService.getServiceName('14')).toBe('UPS Next Day Air Early AM');
      expect(upsService.getServiceName('59')).toBe('UPS 2nd Day Air AM');
      expect(upsService.getServiceName('65')).toBe('UPS Worldwide Saver');
    });

    it('should return default name for unknown codes', () => {
      // Assert
      expect(upsService.getServiceName('99')).toBe('UPS Service 99');
      expect(upsService.getServiceName(null)).toBe('UPS Service null');
    });
  });

  describe('#estimateTransitDays', () => {
    it('should estimate transit days for known service codes', () => {
      // Arrange & Act & Assert
      expect(upsService.estimateTransitDays('01')).toBe(1); // Next Day Air
      expect(upsService.estimateTransitDays('02')).toBe(2); // 2nd Day Air
      expect(upsService.estimateTransitDays('03')).toBe(5); // Ground
      expect(upsService.estimateTransitDays('07')).toBe(1); // Worldwide Express
      expect(upsService.estimateTransitDays('08')).toBe(3); // Worldwide Expedited
      expect(upsService.estimateTransitDays('12')).toBe(3); // 3 Day Select
      expect(upsService.estimateTransitDays('13')).toBe(1); // Next Day Air Saver
      expect(upsService.estimateTransitDays('14')).toBe(1); // Next Day Air Early AM
      expect(upsService.estimateTransitDays('59')).toBe(2); // 2nd Day Air AM
    });

    it('should return null for unknown service codes', () => {
      // Act & Assert
      expect(upsService.estimateTransitDays('99')).toBeNull();
      expect(upsService.estimateTransitDays(null)).toBeNull();
      expect(upsService.estimateTransitDays(undefined)).toBeNull();
    });
  });

  describe('#validateCredentials', () => {
    it('should return valid when authentication succeeds', async () => {
      // Arrange
      mockProxyInstance.authenticate.mockResolvedValue('mock_token');

      // Act
      const result = await upsService.validateCredentials();

      // Assert
      expect(mockProxyInstance.authenticate).toHaveBeenCalledWith(mockDecryptedCredentials, 'user-test-456');
      expect(result.valid).toBe(true);
      expect(result.carrier).toBe('ups');
    });

    it('should return invalid when authentication fails', async () => {
      // Arrange
      mockProxyInstance.authenticate.mockRejectedValue(
        new Error('Invalid credentials')
      );

      // Act
      const result = await upsService.validateCredentials();

      // Assert
      expect(result.valid).toBe(false);
      expect(result.carrier).toBe('ups');
      expect(result.error).toBe('Invalid credentials');
    });
  });

  describe('Constructor and initialization', () => {
    it('should initialize with carrier credential', () => {
      // Assert
      expect(upsService.carrierName).toBe('ups');
      expect(upsService.decryptedCredentials.client_id).toBe('decrypted_encrypted_client_id');
      expect(upsService.decryptedCredentials.account_number).toBe('ABC123');
      expect(upsService.services).toHaveLength(2);
    });

    it('should decrypt credentials using CryptoHelper', () => {
      // Assert
      expect(CryptoHelper.decrypt).toHaveBeenCalledWith('encrypted_client_id');
      expect(CryptoHelper.decrypt).toHaveBeenCalledWith('encrypted_client_secret');
    });
  });
});
