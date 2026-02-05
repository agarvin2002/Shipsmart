/**
 * DHL API Mock Data
 *
 * Placeholder mock responses for DHL API endpoints.
 * To be populated when DHL integration is implemented.
 */

const AUTH_SUCCESS = {
  access_token: 'mock_dhl_access_token_xyz123',
  token_type: 'Bearer',
  expires_in: 3600,
};

const AUTH_FAILURE = {
  error: 'invalid_client',
  error_description: 'Invalid client credentials',
};

const RATE_SUCCESS = {
  // Placeholder - to be populated with actual DHL response structure
  products: [],
};

const RATE_ERROR = {
  // Placeholder - to be populated with actual DHL error structure
  status: 400,
  title: 'Bad Request',
  detail: 'Invalid request parameters',
};

module.exports = {
  // Authentication
  AUTH_SUCCESS,
  AUTH_FAILURE,

  // Rates
  RATE_SUCCESS,
  RATE_ERROR,
};
