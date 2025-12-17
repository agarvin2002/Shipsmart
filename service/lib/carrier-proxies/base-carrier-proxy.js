const axios = require('axios');
const logger = require('@shipsmart/logger').application('shipsmart-ai-api');

class BaseCarrierProxy {
  constructor(carrierName, baseUrl, timeout = 15000) {
    this.carrierName = carrierName;
    this.baseUrl = baseUrl;
    this.timeout = timeout;
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
      logger.info(`[${this.carrierName}Proxy] Making ${method} request to ${endpoint}`);

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

      logger.error(`[${this.carrierName}Proxy] API error`, {
        status,
        endpoint,
        error: data,
      });

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
