/* global logger */
const axios = require('axios');
const cls = require('cls-hooked');
const { getWorkerProducer } = require('../../workers/utils/producer');
const { WorkerJobs, TIMEOUTS } = require('@shipsmart/constants');
const { RedisWrapper, RedisKeys } = require('@shipsmart/redis');

// Get the existing CLS namespace
const namespace = cls.getNamespace('shipsmart_sequel_trans');

class BaseCarrierProxy {
  constructor(carrierName, carrierConfig = null) {
    this.carrierName = carrierName;

    // Support both legacy (baseUrl, timeout) and new (carrierConfig) constructor signatures
    if (carrierConfig && typeof carrierConfig === 'object' && carrierConfig.base_url) {
      // New DB-driven approach
      this.baseUrl = carrierConfig.base_url;
      this.timeout = carrierConfig.timeout_ms || TIMEOUTS.CARRIER_API_DEFAULT;
      this.endpoints = carrierConfig.endpoints || {};
      this.headers = carrierConfig.headers || {};
    } else {
      // Legacy approach - carrierConfig is actually baseUrl
      this.baseUrl = carrierConfig || '';
      this.timeout = arguments[2] || TIMEOUTS.CARRIER_API_DEFAULT; // Third argument was timeout
      this.endpoints = {};
      this.headers = {};
    }
  }

  /**
   * Sanitizes headers to remove sensitive data (auth tokens, API keys)
   * @param {Object} headers - Request or response headers
   * @returns {Object} Sanitized headers
   */
  _sanitizeHeaders(headers) {
    if (!headers || typeof headers !== 'object') return headers;

    const sanitized = { ...headers };
    const sensitiveKeys = ['authorization', 'x-api-key', 'api-key', 'x-auth-token'];

    sensitiveKeys.forEach(key => {
      if (sanitized[key]) {
        sanitized[key] = '[REDACTED]';
      }
      // Also check lowercase versions
      const lowerKey = key.toLowerCase();
      if (sanitized[lowerKey]) {
        sanitized[lowerKey] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Logs carrier API request/response data for analytics and debugging
   * Queues log data for async processing via Bull queue
   *
   * @param {string} operation - Operation name (e.g., 'authenticate', 'get_rates')
   * @param {Object} requestData - Request metadata (endpoint, method, headers, body, startTime)
   * @param {Object} responseData - Response metadata (status, headers, body, endTime) - null if error
   * @param {Object} error - Error object if request failed - null if successful
   */
  async _logCarrierRequest(operation, requestData, responseData = null, error = null) {
    try {
      // Get context from CLS namespace
      const requestId = namespace ? namespace.get('requestId') : 'unknown';
      const userId = namespace ? namespace.get('userId') : null;
      const shipmentId = namespace ? namespace.get('shipmentId') : null;

      if (!shipmentId) {
        logger.warn(`[${this.carrierName}Proxy] No shipmentId in CLS context for carrier logging`, {
          operation,
          requestId
        });
        return; // Skip logging if no shipment_id (required for UPSERT)
      }

      const logData = {
        shipment_id: shipmentId, // CRITICAL for UPSERT pattern
        request_id: requestId,
        user_id: userId,
        carrier: this.carrierName.toLowerCase(),
        operation,
        endpoint: requestData.endpoint,
        http_method: requestData.method,
        request_headers: this._sanitizeHeaders(requestData.headers),
        request_body: requestData.body,
        request_body_size: requestData.body ? JSON.stringify(requestData.body).length : 0,
        request_started_at: requestData.startTime,
        attempt_number: requestData.attemptNumber || 1,
        max_attempts: requestData.maxAttempts || 1
      };

      // Add response data if successful
      if (responseData) {
        logData.response_status = responseData.status;
        logData.response_headers = this._sanitizeHeaders(responseData.headers);
        logData.response_body = responseData.body;
        logData.response_body_size = responseData.body ? JSON.stringify(responseData.body).length : 0;
        logData.request_completed_at = responseData.endTime;
        logData.duration_ms = responseData.endTime - requestData.startTime.getTime();
      }

      // Add error data if failed
      if (error) {
        logData.error_type = error.type || 'unknown_error';
        logData.error_message = error.message;
        logData.error_stack = error.stack;
        logData.request_completed_at = new Date();
        logData.duration_ms = Date.now() - requestData.startTime.getTime();
      }

      // Queue for async storage (non-blocking)
      const producer = getWorkerProducer(WorkerJobs.CARRIER_API_LOG);

      if (!producer) {
        logger.warn(`[${this.carrierName}Proxy] CARRIER_API_LOG producer not registered yet`);
        return;
      }

      await producer.publishMessage(logData);

    } catch (logError) {
      logger.error(`[${this.carrierName}Proxy] Failed to log carrier request`, {
        error: logError.message,
        operation
      });
      // Don't throw - logging failures shouldn't break the main flow
    }
  }

  async makeRequest(endpoint, options = {}) {
    const {
      method = 'POST',
      headers = {},
      data = null,
      params = null,
      timeout = this.timeout,
      operation = 'api_call', // NEW: operation name for logging
    } = options;

    const url = `${this.baseUrl}${endpoint}`;
    const startTime = new Date();

    // Capture request data for logging
    const requestData = {
      endpoint,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: data,
      startTime,
      attemptNumber: options.attemptNumber || 1,
      maxAttempts: options.maxAttempts || 1
    };

    try {
      logger.info(`[${this.carrierName}Proxy] Making ${method} request to ${endpoint} - Data: ${JSON.stringify(data)}`);

      const response = await axios({
        method,
        url,
        headers: requestData.headers,
        data,
        params,
        timeout,
      });

      const endTime = new Date();

      // Capture response data for logging
      const responseData = {
        status: response.status,
        headers: response.headers,
        body: response.data,
        endTime
      };

      logger.info(`[${this.carrierName}Proxy] Request successful`, {
        status: response.status,
        endpoint,
        duration: endTime - startTime
      });

      // Log successful request (async, non-blocking)
      this._logCarrierRequest(operation, requestData, responseData);

      return response.data;

    } catch (error) {
      // Determine error type for logging
      let errorType = 'unknown_error';
      if (error.code === 'ECONNABORTED') errorType = 'timeout';
      else if (error.response?.status === 401) errorType = 'auth_failed';
      else if (error.response?.status === 403) errorType = 'access_forbidden';
      else if (error.response?.status === 429) errorType = 'rate_limit';
      else if (error.response?.status >= 500) errorType = 'api_error';
      else if (!error.response) errorType = 'network_error';

      // Log failed request (async, non-blocking)
      this._logCarrierRequest(
        operation,
        requestData,
        null,
        { type: errorType, message: error.message, stack: error.stack }
      );

      // Re-throw error after logging
      return this.handleError(error, endpoint);
    }
  }

  handleError(error, endpoint) {
    if (error.code === 'ECONNABORTED') {
      logger.error(`[${this.carrierName}Proxy] Request timeout`, { endpoint, timeout: this.timeout });
      throw new Error(`${this.carrierName} API request timeout`);
    }

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      // Log full error details including response data
      logger.error(`[${this.carrierName}Proxy] API error - Status: ${status}, Endpoint: ${endpoint}, Error: ${JSON.stringify(data)}`);

      if (status === 401) {
        throw new Error(`${this.carrierName} authentication failed`);
      }

      if (status === 403) {
        throw new Error(`${this.carrierName} access forbidden - check credentials`);
      }

      if (status === 429) {
        throw new Error(`${this.carrierName} rate limit exceeded`);
      }

      if (status >= 500) {
        throw new Error(`${this.carrierName} service unavailable`);
      }

      throw new Error(data.message || `${this.carrierName} API error: ${status}`);
    }

    if (error.request) {
      logger.error(`[${this.carrierName}Proxy] No response received`, { endpoint });
      throw new Error(`${this.carrierName} API no response`);
    }

    logger.error(`[${this.carrierName}Proxy] Unexpected error`, { error: error.message, endpoint });
    throw new Error(`${this.carrierName} API error: ${error.message}`);
  }

  _buildTokenCacheKey(carrier, clientId, userId) {
    return RedisWrapper.getRedisKey(RedisKeys.CARRIER_TOKEN, {
      carrier,
      clientId,
      userId,
    });
  }

  async _getCachedToken(cacheKey) {
    try {
      const cachedToken = await RedisWrapper.get(cacheKey);

      if (cachedToken) {
        logger.info(`[${this.carrierName}Proxy] Token cache hit`, { cacheKey });
        return cachedToken;
      }

      logger.debug(`[${this.carrierName}Proxy] Token cache miss`, { cacheKey });
      return null;
    } catch (error) {
      logger.warn(`[${this.carrierName}Proxy] Token cache read failed, fetching fresh token`, {
        error: error.message,
        cacheKey,
      });
      return null;
    }
  }

  async _cacheToken(cacheKey, token, expiresIn) {
    try {
      const ttl = expiresIn - TIMEOUTS.TOKEN_CACHE_SAFETY_MARGIN_SECONDS;

      if (ttl <= 0) {
        logger.warn(`[${this.carrierName}Proxy] Token TTL too short, skipping cache`, { expiresIn });
        return;
      }

      await RedisWrapper.setWithExpiry(cacheKey, token, ttl);
      logger.info(`[${this.carrierName}Proxy] Token cached successfully`, { cacheKey, ttl });
    } catch (error) {
      logger.warn(`[${this.carrierName}Proxy] Token cache write failed`, {
        error: error.message,
        cacheKey,
      });
    }
  }
}

module.exports = BaseCarrierProxy;
