/* global logger */
const BaseCarrierProxy = require('./base-carrier-proxy');
const config = require('@shipsmart/env');
const { CARRIERS, TIMEOUTS } = require('@shipsmart/constants');

class FedexProxy extends BaseCarrierProxy {
  constructor(carrierConfig = null) {
    // If carrierConfig is provided, use it (DB-driven approach)
    // Otherwise fall back to environment config (legacy approach)
    if (carrierConfig) {
      super('FedEx', carrierConfig);
    } else {
      const baseUrl = config.get('carriers:fedex:api_url') || 'https://apis-sandbox.fedex.com';
      const timeout = config.get('carriers:fedex:timeout') || 15000;
      super('FedEx', baseUrl, timeout);
    }
  }

  
  async authenticate(credentials, userId = null) {
    const { client_id, client_secret } = credentials;

    // Check cache if userId is provided
    if (userId) {
      const cacheKey = this._buildTokenCacheKey(CARRIERS.FEDEX, client_id, userId);
      const cachedToken = await this._getCachedToken(cacheKey);
      if (cachedToken) {
        return cachedToken;
      }
    }

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
        operation: 'authenticate',
      });

      const token = response.access_token;

      // Cache token if userId is provided
      if (userId) {
        const cacheKey = this._buildTokenCacheKey(CARRIERS.FEDEX, client_id, userId);
        const expiresIn = response.expires_in || TIMEOUTS.CACHE_CARRIER_TOKENS;
        await this._cacheToken(cacheKey, token, expiresIn);
      }

      logger.info('[FedexProxy] Authentication successful');
      return token;
    } catch (error) {
      logger.error('[FedexProxy] Authentication failed', { error: error.message });
      throw new Error(`FedEx authentication failed: ${error.message}`);
    }
  }

  
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
        operation: 'get_rates', // For carrier API logging
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

  
  generateTransactionId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  
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
