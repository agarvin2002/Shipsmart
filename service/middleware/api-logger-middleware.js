/* global logger */

const cls = require('cls-hooked');
const { getWorkerProducer } = require('../workers/utils/producer');
const { WorkerJobs } = require('@shipsmart/constants');

// Get the existing CLS namespace
const namespace = cls.getNamespace('shipsmart_sequel_trans');

/**
 * Sanitizes sensitive data from headers
 * Removes authorization tokens, cookies, and API keys
 */
function sanitizeHeaders(headers) {
  const sanitized = { ...headers };
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];

  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  });

  return sanitized;
}

/**
 * Sanitizes sensitive data from request/response body
 * Removes passwords, tokens, API keys, client secrets
 */
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;

  const sanitized = JSON.parse(JSON.stringify(body)); // Deep clone
  const sensitiveFields = [
    'password',
    'password_confirmation',
    'current_password',
    'new_password',
    'client_secret',
    'api_key',
    'token',
    'access_token',
    'refresh_token',
    'reset_token',
    'verification_token'
  ];

  // Recursive sanitization for nested objects
  function sanitizeRecursive(obj) {
    if (!obj || typeof obj !== 'object') return;

    Object.keys(obj).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeRecursive(obj[key]);
      }
    });
  }

  sanitizeRecursive(sanitized);
  return sanitized;
}

/**
 * Calculate size of body in bytes
 */
function calculateBodySize(body) {
  if (!body) return 0;
  try {
    return JSON.stringify(body).length;
  } catch (error) {
    return 0;
  }
}

/**
 * Extract shipment_id from request body
 * Checks multiple possible locations in the request
 */
function extractShipmentId(req) {
  // Check direct shipment_id field
  if (req.body?.shipment_id) {
    return req.body.shipment_id;
  }

  // Check nested data object
  if (req.body?.data?.shipment_id) {
    return req.body.data.shipment_id;
  }

  // Check if it's an array of shipments (take first one)
  if (Array.isArray(req.body?.shipments) && req.body.shipments[0]?.shipment_id) {
    return req.body.shipments[0].shipment_id;
  }

  // If no shipment_id found, generate a fallback using request ID
  return `unknown-${req.id}`;
}

/**
 * API Logging Middleware
 *
 * CRITICAL: Extracts shipment_id from request and stores in CLS context
 * Captures request/response data and queues for async database storage
 *
 * Data Flow:
 * 1. Extract shipment_id from request body
 * 2. Store shipment_id in CLS context (for carrier logging)
 * 3. Capture request metadata
 * 4. Intercept response
 * 5. Queue log data for background processing (non-blocking)
 */
function apiLogger() {
  return async (req, res, next) => {
    const startTime = Date.now();
    const requestStartedAt = new Date();

    // CRITICAL: Extract shipment_id from request body for UPSERT pattern
    const shipmentId = extractShipmentId(req);

    // Store shipment_id in CLS context for carrier logging
    if (namespace && shipmentId) {
      namespace.set('shipmentId', shipmentId);
    }

    // Capture request data
    const logData = {
      shipment_id: shipmentId, // CRITICAL: Primary identifier for UPSERT
      request_id: req.id, // From express-request-id middleware
      user_id: req.user?.userId || null,
      method: req.method,
      path: req.path,
      query_params: req.query,
      headers: sanitizeHeaders(req.headers),
      request_body: sanitizeBody(req.body),
      request_body_size: calculateBodySize(req.body),
      request_started_at: requestStartedAt,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    };

    // Intercept response to capture response data
    const originalSend = res.send;
    const originalJson = res.json;

    function captureResponse(body) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      logData.response_status = res.statusCode;
      logData.response_body = typeof body === 'string' ? (() => {
        try {
          return JSON.parse(body);
        } catch {
          return body;
        }
      })() : body;
      logData.response_body_size = calculateBodySize(logData.response_body);
      logData.response_headers = sanitizeHeaders(res.getHeaders());
      logData.request_completed_at = new Date();
      logData.duration_ms = duration;

      // Queue for async storage (non-blocking)
      queueLogData(logData);
    }

    // Override res.send
    res.send = function(body) {
      captureResponse(body);
      return originalSend.call(this, body);
    };

    // Override res.json
    res.json = function(body) {
      captureResponse(body);
      return originalJson.call(this, body);
    };

    // Capture errors that occur before response is sent
    res.on('finish', () => {
      if (res.statusCode >= 400 && !logData.response_body) {
        // Error occurred before response was sent
        logData.response_status = res.statusCode;
        logData.request_completed_at = new Date();
        logData.duration_ms = Date.now() - startTime;

        queueLogData(logData);
      }
    });

    next();
  };
}

/**
 * Queue log data for async processing
 * Uses Bull queue producer to avoid blocking API responses
 */
function queueLogData(logData) {
  try {
    const producer = getWorkerProducer(WorkerJobs.API_LOG);

    if (!producer) {
      logger.warn('[ApiLoggerMiddleware] API_LOG producer not registered yet');
      return;
    }

    producer.publishMessage(logData).catch(err => {
      logger.error('[ApiLoggerMiddleware] Failed to queue log', {
        error: err.message,
        shipmentId: logData.shipment_id,
        requestId: logData.request_id
      });
    });
  } catch (error) {
    logger.error('[ApiLoggerMiddleware] Producer error', {
      error: error.message,
      shipmentId: logData.shipment_id,
      requestId: logData.request_id
    });
  }
}

module.exports = apiLogger;
