class NotFoundError extends Error {
  constructor(resource, message) {
    super(message || `${resource} not found`);
    this.name = 'NotFoundError';
    this.resource = resource;
    this.statusCode = 404;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = NotFoundError;
