/**
 * UPS API Mock Data
 *
 * Mock responses for UPS REST API endpoints.
 * Based on actual UPS API response structures.
 */

const AUTH_SUCCESS = {
  access_token: 'mock_ups_access_token_67890',
  token_type: 'Bearer',
  issued_at: '1609459200000',
  client_id: 'mock_client_id',
  expires_in: '14399',
  status: 'approved',
};

const AUTH_FAILURE = {
  response: {
    errors: [{
      code: '250003',
      message: 'Invalid client credentials',
    }],
  },
};

const RATE_SUCCESS = {
  RateResponse: {
    Response: {
      ResponseStatus: {
        Code: '1',
        Description: 'Success',
      },
      Alert: [],
      TransactionReference: {
        TransactionIdentifier: 'ups_transaction_123',
      },
    },
    RatedShipment: [
      {
        Service: {
          Code: '03',
          Description: 'UPS Ground',
        },
        RatedShipmentAlert: [],
        BillingWeight: {
          UnitOfMeasurement: {
            Code: 'LBS',
            Description: 'Pounds',
          },
          Weight: '10.0',
        },
        TransportationCharges: {
          CurrencyCode: 'USD',
          MonetaryValue: '14.50',
        },
        ServiceOptionsCharges: {
          CurrencyCode: 'USD',
          MonetaryValue: '0.00',
        },
        TotalCharges: {
          CurrencyCode: 'USD',
          MonetaryValue: '16.75',
        },
        NegotiatedRateCharges: {
          TotalCharge: {
            CurrencyCode: 'USD',
            MonetaryValue: '15.20',
          },
        },
        GuaranteedDelivery: {
          BusinessDaysInTransit: '3',
        },
        TimeInTransit: {
          ServiceSummary: {
            Service: {
              Description: 'UPS Ground',
            },
            EstimatedArrival: {
              Arrival: {
                Date: '20240208',
                Time: '23:00',
              },
              BusinessDaysInTransit: '3',
            },
          },
        },
      },
      {
        Service: {
          Code: '02',
          Description: 'UPS 2nd Day Air',
        },
        RatedShipmentAlert: [],
        BillingWeight: {
          UnitOfMeasurement: {
            Code: 'LBS',
          },
          Weight: '10.0',
        },
        TotalCharges: {
          CurrencyCode: 'USD',
          MonetaryValue: '48.50',
        },
        NegotiatedRateCharges: {
          TotalCharge: {
            CurrencyCode: 'USD',
            MonetaryValue: '45.00',
          },
        },
        GuaranteedDelivery: {
          BusinessDaysInTransit: '2',
        },
        TimeInTransit: {
          ServiceSummary: {
            EstimatedArrival: {
              Arrival: {
                Date: '20240206',
              },
              BusinessDaysInTransit: '2',
            },
          },
        },
      },
    ],
  },
};

const RATE_ERROR = {
  response: {
    errors: [{
      code: '111210',
      message: 'The postal code is invalid for the state',
      parameterList: [{
        name: 'postalCode',
        value: 'INVALID',
      }],
    }],
  },
};

const RATE_AUTHENTICATION_ERROR = {
  response: {
    errors: [{
      code: '250003',
      message: 'Invalid Access Token',
    }],
  },
};

const RATE_VALIDATION_ERROR = {
  response: {
    errors: [{
      code: '111100',
      message: 'Invalid origin address',
    }],
  },
};

const INTERNATIONAL_RATE_SUCCESS = {
  RateResponse: {
    Response: {
      ResponseStatus: {
        Code: '1',
        Description: 'Success',
      },
      TransactionReference: {
        TransactionIdentifier: 'ups_intl_transaction_123',
      },
    },
    RatedShipment: [
      {
        Service: {
          Code: '08',
          Description: 'UPS Worldwide Expedited',
        },
        TotalCharges: {
          CurrencyCode: 'USD',
          MonetaryValue: '132.00',
        },
        NegotiatedRateCharges: {
          TotalCharge: {
            CurrencyCode: 'USD',
            MonetaryValue: '125.50',
          },
        },
        GuaranteedDelivery: {
          BusinessDaysInTransit: '5',
        },
      },
      {
        Service: {
          Code: '07',
          Description: 'UPS Worldwide Express',
        },
        TotalCharges: {
          CurrencyCode: 'USD',
          MonetaryValue: '195.00',
        },
        NegotiatedRateCharges: {
          TotalCharge: {
            CurrencyCode: 'USD',
            MonetaryValue: '185.00',
          },
        },
        GuaranteedDelivery: {
          BusinessDaysInTransit: '3',
        },
      },
    ],
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
  INTERNATIONAL_RATE_SUCCESS,
};
