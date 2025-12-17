const BaseCarrierProxy = require('./base-carrier-proxy');
const config = require('@shipsmart/env');
const logger = require('@shipsmart/logger').application('shipsmart-ai-api');

class FedexProxy extends BaseCarrierProxy {
  constructor() {
    const baseUrl = config.get('carriers:fedex:api_url') || 'https://apis-sandbox.fedex.com';
    const timeout = config.get('carriers:fedex:timeout') || 15000;
    super('FedEx', baseUrl, timeout);
  }

  /**
   * Authenticate with FedEx OAuth 2.0
   * @param {Object} credentials - { client_id, client_secret }
   * @returns {Promise<string>} Access token
   */
  async authenticate(credentials) {
    const { client_id, client_secret } = credentials;

    try {
      logger.info('[FedexProxy] Authenticating with OAuth 2.0');

      const response = await this.makeRequest('/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'x-customer-transaction-id': this.generateTransactionId(),
          'x-locale': 'en_US',
        },
        data: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id,
          client_secret,
        }).toString(),
      });

      logger.info('[FedexProxy] Authentication successful');
      return response.access_token;
    } catch (error) {
      logger.error('[FedexProxy] Authentication failed', { error: error.message });
      throw new Error(`FedEx authentication failed: ${error.message}`);
    }
  }

  /**
   * Get shipping rates from FedEx
   * @param {string} token - Access token
   * @param {Object} rateRequest - Rate request payload
   * @returns {Promise<Object>} Rate response
   */
  async getRates(token, rateRequest) {
    try {
      logger.info('[FedexProxy] Fetching rates');

      const response = await this.makeRequest('/rate/v1/rates/quotes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-customer-transaction-id': this.generateTransactionId(),
          'x-locale': 'en_US',
        },
        data: rateRequest,
      });

      logger.info('[FedexProxy] Rates fetched successfully', {
        rateCount: response.output?.rateReplyDetails?.length || 0,
      });

      return response;
    } catch (error) {
      logger.error('[FedexProxy] Rate fetch failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate unique transaction ID for FedEx API
   * @returns {string} Transaction ID
   */
  generateTransactionId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Validate FedEx credentials
   * @param {Object} credentials - { client_id, client_secret }
   * @returns {Promise<boolean>} Validation result
   */
  async validateCredentials(credentials) {
    try {
      await this.authenticate(credentials);
      return true;
    } catch (error) {
      logger.error('[FedexProxy] Credential validation failed', { error: error.message });
      return false;
    }
  }
}

module.exports = FedexProxy;
