/* global logger */

function requestLogger(req, res, next) {
  const startTime = Date.now();

  // Log request start
  logger.info(`Started ${req.method} ${req.originalUrl || req.url}`);

  // Log request body for POST/PUT/PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    logger.info(`Request Body: ${JSON.stringify(req.body)}`);
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
