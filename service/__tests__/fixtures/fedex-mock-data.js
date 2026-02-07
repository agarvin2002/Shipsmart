/**
 * FedEx API Mock Data
 *
 * Mock responses for FedEx REST API endpoints.
 * Based on actual FedEx API response structures.
 */

const AUTH_SUCCESS = {
  access_token: 'mock_fedex_access_token_12345',
  token_type: 'bearer',
  expires_in: 3599,
  scope: 'CXS',
};

const AUTH_FAILURE = {
  errors: [{
    code: 'UNAUTHORIZED',
    message: 'Invalid client credentials',
  }],
};

const RATE_SUCCESS = {
  transactionId: 'transaction_123456',
  output: {
    rateReplyDetails: [
      {
        serviceType: 'FEDEX_GROUND',
        serviceName: 'FedEx Ground',
        packagingType: 'YOUR_PACKAGING',
        ratedShipmentDetails: [{
          rateType: 'ACCOUNT',
          totalNetCharge: 15.50,
          totalBaseCharge: 14.00,
          totalNetChargeWithDutiesAndTaxes: 15.50,
          currency: 'USD',
          shipmentRateDetail: {
            rateType: 'ACCOUNT',
            totalNetCharge: 15.50,
            totalBaseCharge: 14.00,
            surCharges: [{
              type: 'FUEL',
              description: 'Fuel surcharge',
              amount: 1.50,
            }],
          },
        }],
        commit: {
          transitDays: 'THREE_DAYS',
        },
        operationalDetail: {
          deliveryDate: '2024-02-08',
        },
      },
      {
        serviceType: 'FEDEX_2_DAY',
        serviceName: 'FedEx 2Day',
        packagingType: 'YOUR_PACKAGING',
        ratedShipmentDetails: [{
          rateType: 'ACCOUNT',
          totalNetCharge: 45.00,
          totalBaseCharge: 42.00,
          totalNetChargeWithDutiesAndTaxes: 45.00,
          currency: 'USD',
          shipmentRateDetail: {
            rateType: 'ACCOUNT',
            totalNetCharge: 45.00,
            totalBaseCharge: 42.00,
            surCharges: [{
              type: 'FUEL',
              description: 'Fuel surcharge',
              amount: 3.00,
            }],
          },
        }],
        commit: {
          transitDays: 'TWO_DAYS',
        },
        operationalDetail: {
          deliveryDate: '2024-02-06',
        },
      },
      {
        serviceType: 'PRIORITY_OVERNIGHT',
        serviceName: 'FedEx Priority Overnight',
        packagingType: 'YOUR_PACKAGING',
        ratedShipmentDetails: [{
          rateType: 'ACCOUNT',
          totalNetCharge: 85.00,
          totalBaseCharge: 80.00,
          totalNetChargeWithDutiesAndTaxes: 85.00,
          currency: 'USD',
          shipmentRateDetail: {
            rateType: 'ACCOUNT',
            totalNetCharge: 85.00,
            totalBaseCharge: 80.00,
            surCharges: [{
              type: 'FUEL',
              description: 'Fuel surcharge',
              amount: 5.00,
            }],
          },
        }],
        commit: {
          transitDays: 'ONE_DAY',
        },
        operationalDetail: {
          deliveryDate: '2024-02-05',
        },
      },
    ],
    alerts: [],
  },
};

const RATE_ERROR = {
  transactionId: 'transaction_error_123',
  errors: [{
    code: 'SHIPMENT.WEIGHT.INVALID',
    message: 'Weight exceeds maximum limit for this service',
    parameterList: [{
      key: 'weight',
      value: '150',
    }],
  }],
};

const RATE_AUTHENTICATION_ERROR = {
  errors: [{
    code: 'UNAUTHORIZED',
    message: 'Authentication failed',
  }],
};

const RATE_VALIDATION_ERROR = {
  transactionId: 'transaction_validation_123',
  errors: [{
    code: 'SYSTEM.UNEXPECTED.ERROR',
    message: 'Invalid origin postal code',
    parameterList: [{
      key: 'origin.postalCode',
      value: 'INVALID',
    }],
  }],
};

const RATE_TIMEOUT = null; // Used to simulate timeout

const INTERNATIONAL_RATE_SUCCESS = {
  transactionId: 'transaction_intl_123456',
  output: {
    rateReplyDetails: [
      {
        serviceType: 'INTERNATIONAL_ECONOMY',
        serviceName: 'FedEx International Economy',
        packagingType: 'YOUR_PACKAGING',
        ratedShipmentDetails: [{
          rateType: 'ACCOUNT',
          totalNetCharge: 125.50,
          totalBaseCharge: 115.00,
          totalNetChargeWithDutiesAndTaxes: 140.50,
          currency: 'USD',
          shipmentRateDetail: {
            rateType: 'ACCOUNT',
            totalNetCharge: 125.50,
            totalBaseCharge: 115.00,
            surCharges: [{
              type: 'FUEL',
              description: 'Fuel surcharge',
              amount: 10.50,
            }],
          },
        }],
        commit: {
          transitDays: 'FIVE_DAYS',
        },
        operationalDetail: {
          deliveryDate: '2024-02-09',
        },
      },
      {
        serviceType: 'INTERNATIONAL_PRIORITY',
        serviceName: 'FedEx International Priority',
        packagingType: 'YOUR_PACKAGING',
        ratedShipmentDetails: [{
          rateType: 'ACCOUNT',
          totalNetCharge: 185.00,
          totalBaseCharge: 170.00,
          totalNetChargeWithDutiesAndTaxes: 200.00,
          currency: 'USD',
          shipmentRateDetail: {
            rateType: 'ACCOUNT',
            totalNetCharge: 185.00,
            totalBaseCharge: 170.00,
            surCharges: [{
              type: 'FUEL',
              description: 'Fuel surcharge',
              amount: 15.00,
            }],
          },
        }],
        commit: {
          transitDays: 'THREE_DAYS',
        },
        operationalDetail: {
          deliveryDate: '2024-02-07',
        },
      },
    ],
    alerts: [],
  },
};

module.exports = {
  // Authentication
  AUTH_SUCCESS,
  AUTH_FAILURE,

  // Rates
  RATE_SUCCESS,
  RATE_ERROR,
  RATE_AUTHENTICATION_ERROR,
  RATE_VALIDATION_ERROR,
  RATE_TIMEOUT,
  INTERNATIONAL_RATE_SUCCESS,
};
