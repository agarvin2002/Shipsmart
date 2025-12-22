const BaseCarrierProxy = require('./base-carrier-proxy');
const config = require('@shipsmart/env');
const logger = require('@shipsmart/logger').application('shipsmart-ai-api');

class UspsProxy extends BaseCarrierProxy {
  constructor(carrierConfig = null) {
    // If carrierConfig is provided, use it (DB-driven approach)
    // Otherwise fall back to environment config (legacy approach)
    if (carrierConfig) {
      super('USPS', carrierConfig);
    } else {
      const baseUrl = config.get('carriers:usps:api_url') || 'https://apis-tem.usps.com';
      const timeout = config.get('carriers:usps:timeout') || 15000;
      super('USPS', baseUrl, timeout);
    }
  }

  /**
   * Authenticate with USPS OAuth 2.0
   * @param {Object} credentials - { client_id, client_secret }
   * @returns {Promise<string>} Access token
   */
  async authenticate(credentials) {
    const { client_id, client_secret } = credentials;

    try {
      logger.info('[UspsProxy] Authenticating with OAuth 2.0');

      const response = await this.makeRequest('/oauth2/v3/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          client_id,
          client_secret,
          grant_type: 'client_credentials',
        },
      });

      logger.info('[UspsProxy] Authentication successful');
      return response.access_token;
    } catch (error) {
      logger.error('[UspsProxy] Authentication failed', { error: error.message });
      throw new Error(`USPS authentication failed: ${error.message}`);
    }
  }

  /**
   * Get shipping rates from USPS
   * @param {string} token - Access token
   * @param {Object} rateRequest - Rate request payload
   * @returns {Promise<Object>} Rate response
   */
  async getRates(token, rateRequest) {
    try {
      logger.info('[UspsProxy] Fetching rates');

      const response = await this.makeRequest('/prices/v3/base-rates/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: rateRequest,
      });

      logger.info('[UspsProxy] Rates fetched successfully', {
        rateCount: response.rates?.length || 0,
      });

      return response;
    } catch (error) {
      logger.error('[UspsProxy] Rate fetch failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate USPS credentials
   * @param {Object} credentials - { client_id, client_secret }
   * @returns {Promise<boolean>} Validation result
   */
  async validateCredentials(credentials) {
    try {
      await this.authenticate(credentials);
      return true;
    } catch (error) {
      logger.error('[UspsProxy] Credential validation failed', { error: error.message });
      return false;
    }
  }
}

module.exports = UspsProxy;
