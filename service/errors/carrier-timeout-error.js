class CarrierTimeoutError extends Error {
  constructor(carrier, message = 'Request timeout') {
    super(`${carrier} ${message}`);
    this.name = 'CarrierTimeoutError';
    this.carrier = carrier;
    this.statusCode = 408;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = CarrierTimeoutError;
