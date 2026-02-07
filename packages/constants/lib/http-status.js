const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202, // NEW - for async operations
  NO_CONTENT: 204, // NEW - for successful deletes

  // Client errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405, // NEW
  CONFLICT: 409, // NEW - for duplicate resources
  UNPROCESSABLE_ENTITY: 422, // NEW - for validation errors
  TOO_MANY_REQUESTS: 429, // NEW - for rate limiting

  // Server errors
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501, // NEW
  BAD_GATEWAY: 502, // NEW - for carrier API failures
  SERVICE_UNAVAILABLE: 503, // NEW - for maintenance
  GATEWAY_TIMEOUT: 504, // NEW - for carrier timeouts
};

module.exports = {
  HTTP_STATUS,
};
