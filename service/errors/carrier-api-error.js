class CarrierApiError extends Error {
  constructor(carrier, message, statusCode = 502) {
    super(message);
    this.name = 'CarrierApiError';
    this.carrier = carrier;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = CarrierApiError;
