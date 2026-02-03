/* global logger */

/**
 * Recursively sanitizes an object by removing sensitive fields
 * @param {*} obj - Object to sanitize
 * @param {Array<string>} sensitiveFields - List of sensitive field names
 * @returns {*} Sanitized object
 */
function sanitizeObject(obj, sensitiveFields) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, sensitiveFields));
  }

  // Handle objects
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Check if field is sensitive (case-insensitive)
      const isSensitive = sensitiveFields.some(
        field => key.toLowerCase().includes(field.toLowerCase())
      );

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value, sensitiveFields);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  // Primitive values
  return obj;
}

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
      'authorization',
      'auth',
      'secret',
      'key',
      'api_key_encrypted',
      'client_id_encrypted',
      'client_secret_encrypted',
      'credential'
    ];

    const sanitized = sanitizeObject(req.body, sensitiveFields);

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
