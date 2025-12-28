const axios = require('axios');
const logger = require('@shipsmart/logger').application('shipsmart-ai-api');

class BaseCarrierProxy {
  constructor(carrierName, carrierConfig = null) {
    this.carrierName = carrierName;

    // Support both legacy (baseUrl, timeout) and new (carrierConfig) constructor signatures
    if (carrierConfig && typeof carrierConfig === 'object' && carrierConfig.base_url) {
      // New DB-driven approach
      this.baseUrl = carrierConfig.base_url;
      this.timeout = carrierConfig.timeout_ms || 15000;
      this.endpoints = carrierConfig.endpoints || {};
      this.headers = carrierConfig.headers || {};
    } else {
      // Legacy approach - carrierConfig is actually baseUrl
      this.baseUrl = carrierConfig || '';
      this.timeout = arguments[2] || 15000; // Third argument was timeout
      this.endpoints = {};
      this.headers = {};
    }
  }

  async makeRequest(endpoint, options = {}) {
    const {
      method = 'POST',
      headers = {},
      data = null,
      params = null,
      timeout = this.timeout,
    } = options;

    const url = `${this.baseUrl}${endpoint}`;

    try {
      logger.info(`[${this.carrierName}Proxy] Making ${method} request to ${endpoint} - Data: ${JSON.stringify(data)}`);
      const response = await axios({
        method,
        url,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        data,
        params,
        timeout,
      });

      logger.info(`[${this.carrierName}Proxy] Request successful`, {
        status: response.status,
        endpoint,
      });

      return response.data;
    } catch (error) {
      console.log("🚀✳️ ~ BaseCarrierProxy ~ makeRequest ~ error:", error)
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
}

module.exports = BaseCarrierProxy;
