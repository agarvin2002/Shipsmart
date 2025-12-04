/* global logger */

/**
 * Middleware to log incoming requests and their completion
 */
function requestLogger(req, res, next) {
  const startTime = Date.now();

  // Log request start
  logger.info(`[${req.id}] Started ${req.method} ${req.originalUrl || req.url}`);

  // Log request body for POST/PUT/PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    logger.info(`[${req.id}] Request Body: ${JSON.stringify(req.body)}`);
  }

  // Capture the original res.send to intercept response
  const originalSend = res.send;

  res.send = function (data) {
    res.send = originalSend; // Restore original send

    const duration = Date.now() - startTime;
    logger.info(`[${req.id}] Completed ${req.method} ${req.originalUrl || req.url} with status ${res.statusCode} in ${duration}ms`);

    return originalSend.call(this, data);
  };

  next();
}

module.exports = requestLogger;
