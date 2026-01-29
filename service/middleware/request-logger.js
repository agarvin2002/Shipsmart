/* global logger */

function requestLogger(req, res, next) {
  const startTime = Date.now();

  // Log request start
  logger.info(`Started ${req.method} ${req.originalUrl || req.url}`);

  // Log request body for POST/PUT/PATCH requests (sanitized)
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    const sensitiveFields = [
      'password',
      'client_secret',
      'api_key',
      'token',
      'reset_token',
      'access_token',
      'refresh_token',
      'api_key_encrypted',
      'client_id_encrypted',
      'client_secret_encrypted'
    ];

    const sanitized = { ...req.body };
    sensitiveFields.forEach(field => delete sanitized[field]);

    logger.info('Request data', sanitized);
  }

  // Capture the original res.send to intercept response
  const originalSend = res.send;

  res.send = function (data) {
    res.send = originalSend; // Restore original send

    const duration = Date.now() - startTime;
    logger.info(`Completed ${req.method} ${req.originalUrl || req.url} with status ${res.statusCode} in ${duration}ms`);

    return originalSend.call(this, data);
  };

  next();
}

module.exports = requestLogger;
