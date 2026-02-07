/**
 * USPS API Mock Data
 *
 * Mock responses for USPS REST API endpoints.
 * Based on actual USPS API response structures.
 */

const AUTH_SUCCESS = {
  access_token: 'mock_usps_access_token_abcdef',
  token_type: 'Bearer',
  issued_at: '2024-01-01 12:00:00',
  expires_in: '3599',
  status: 'approved',
  scope: '/prices /labels',
  issuer: 'api.usps.com',
  client_id: 'mock_usps_client_id',
  application_name: 'shipsmart-api',
};

const AUTH_FAILURE = {
  apiVersion: 'v3',
  error: {
    code: 'UNAUTHORIZED',
    message: 'Invalid client credentials',
    errors: [{
      status: '401',
      title: 'Authorization Unsuccessful',
      detail: 'Invalid client credentials provided',
    }],
  },
};

const RATE_SUCCESS = {
  rateOptions: [
    {
      totalBasePrice: 11.50,
      totalPrice: 12.50,
      rates: [{
        description: 'USPS Ground Advantage',
        priceType: 'COMMERCIAL',
        price: 12.50,
        weight: 10.0,
        dimWeight: 0.0,
        fees: [],
        startDate: '2024-01-10',
        endDate: '',
        mailClass: 'GROUND_ADVANTAGE',
        zone: '4',
        SKU: 'DEXR0XXXXC0100',
      }],
      totalWeight: 10.0,
      totalDeclaredValue: 0.0,
      SKU: 'DEXR0XXXXC0100',
      destinationZIP: '90210',
    },
    {
      totalBasePrice: 14.20,
      totalPrice: 15.20,
      rates: [{
        description: 'Priority Mail',
        priceType: 'COMMERCIAL',
        price: 15.20,
        weight: 10.0,
        dimWeight: 0.0,
        fees: [],
        mailClass: 'PRIORITY_MAIL',
        zone: '4',
        deliveryDay: 'FEB 06 2024',
        estimatedDeliveryDate: '2024-02-06',
      }],
      totalWeight: 10.0,
      SKU: 'DVXR0XXXXC0010',
      destinationZIP: '90210',
    },
    {
      totalBasePrice: 28.50,
      totalPrice: 30.50,
      rates: [{
        description: 'Priority Mail Express',
        priceType: 'COMMERCIAL',
        price: 30.50,
        weight: 10.0,
        dimWeight: 0.0,
        fees: [],
        mailClass: 'PRIORITY_MAIL_EXPRESS',
        zone: '4',
        deliveryDay: 'FEB 05 2024',
        estimatedDeliveryDate: '2024-02-05',
      }],
      totalWeight: 10.0,
      SKU: 'DXXR0XXXXC0010',
      destinationZIP: '90210',
    },
  ],
  page: {
    size: 3,
    totalElements: 3,
    totalPages: 1,
    number: 1,
  },
};

const RATE_ERROR = {
  apiVersion: 'v3',
  error: {
    code: 'INVALID_REQUEST',
    message: 'Validation failed',
    errors: [{
      status: '400',
      title: 'Weight Exceeded',
      detail: 'Package weight exceeds maximum limit for USPS services',
    }],
  },
};

const RATE_AUTHENTICATION_ERROR = {
  apiVersion: 'v3',
  error: {
    code: 'UNAUTHORIZED',
    message: 'Invalid or expired access token',
    errors: [{
      status: '401',
      title: 'Authorization Unsuccessful',
      detail: 'Access token is invalid or expired',
    }],
  },
};

const RATE_VALIDATION_ERROR = {
  apiVersion: 'v3',
  error: {
    code: 'INVALID_REQUEST',
    message: 'Invalid postal code',
    errors: [{
      status: '400',
      title: 'Invalid Origin Postal Code',
      detail: 'The origin postal code provided is invalid',
    }],
  },
};

const INTERNATIONAL_RATE_SUCCESS = {
  rateOptions: [
    {
      totalBasePrice: 45.00,
      totalPrice: 48.50,
      rates: [{
        description: 'Priority Mail International',
        priceType: 'COMMERCIAL',
        price: 48.50,
        weight: 10.0,
        fees: [],
        mailClass: 'PRIORITY_MAIL_INTERNATIONAL',
        deliveryDay: 'FEB 12 2024',
        estimatedDeliveryDate: '2024-02-12',
      }],
      totalWeight: 10.0,
      destinationCountry: 'CA',
    },
    {
      totalBasePrice: 75.00,
      totalPrice: 80.00,
      rates: [{
        description: 'Priority Mail Express International',
        priceType: 'COMMERCIAL',
        price: 80.00,
        weight: 10.0,
        fees: [],
        mailClass: 'PRIORITY_MAIL_EXPRESS_INTERNATIONAL',
        deliveryDay: 'FEB 08 2024',
        estimatedDeliveryDate: '2024-02-08',
      }],
      totalWeight: 10.0,
      destinationCountry: 'CA',
    },
  ],
  page: {
    size: 2,
    totalElements: 2,
    totalPages: 1,
    number: 1,
  },
};

// Transit time response
const TRANSIT_TIME_SUCCESS = {
  serviceStandards: [
    {
      mailClass: 'GROUND_ADVANTAGE',
      serviceStandard: '3',
      serviceStandardMessage: '3 Days',
    },
    {
      mailClass: 'PRIORITY_MAIL',
      serviceStandard: '2',
      serviceStandardMessage: '2 Days',
    },
    {
      mailClass: 'PRIORITY_MAIL_EXPRESS',
      serviceStandard: '1',
      serviceStandardMessage: 'Next Day',
    },
  ],
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

  // Transit Times
  TRANSIT_TIME_SUCCESS,
};
