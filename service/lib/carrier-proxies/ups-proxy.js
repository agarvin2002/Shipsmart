/* global logger */
const BaseCarrierProxy = require('./base-carrier-proxy');
const config = require('@shipsmart/env');
const { CARRIERS, TIMEOUTS } = require('@shipsmart/constants');

class UpsProxy extends BaseCarrierProxy {
  constructor(carrierConfig = null) {
    // If carrierConfig is provided, use it (DB-driven approach)
    // Otherwise fall back to environment config (legacy approach)
    if (carrierConfig) {
      super('UPS', carrierConfig);
    } else {
      const baseUrl = config.get('carriers:ups:api_url') || 'https://wwwcie.ups.com';
      const timeout = config.get('carriers:ups:timeout') || 15000;
      super('UPS', baseUrl, timeout);
    }
  }

  
  async authenticate(credentials, userId = null) {
    const { client_id, client_secret, merchant_id, account_number, account_numbers } = credentials;

    // Check cache if userId is provided
    if (userId) {
      const cacheKey = this._buildTokenCacheKey(CARRIERS.UPS, client_id, userId);
      const cachedToken = await this._getCachedToken(cacheKey);
      if (cachedToken) {
        return cachedToken;
      }
    }

    try {
      logger.info('[UpsProxy] Authenticating with OAuth 2.0');

      const authString = Buffer.from(`${client_id}:${client_secret}`).toString('base64');

      if (!account_number) {
        throw new Error('UPS merchant_id is required in credentials');
      }

      const response = await this.makeRequest('/security/v1/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authString}`,
          'x-merchant-id': account_number,
        },
        data: new URLSearchParams({
          grant_type: 'client_credentials',
        }).toString(),
        operation: 'authenticate',
      });

      const token = response.access_token;

      // Cache token if userId is provided
      if (userId) {
        const cacheKey = this._buildTokenCacheKey(CARRIERS.UPS, client_id, userId);
        const expiresIn = response.expires_in || TIMEOUTS.CACHE_CARRIER_TOKENS;
        await this._cacheToken(cacheKey, token, expiresIn);
      }

      logger.info('[UpsProxy] Authentication successful');
      return token;
    } catch (error) {
      logger.error('[UpsProxy] Authentication failed', { error: error.message });
      throw new Error(`UPS authentication failed: ${error.message}`);
    }
  }

  
  async getRates(token, rateRequest) {
    try {
      logger.info('[UpsProxy] Fetching rates');

      const response = await this.makeRequest('/api/rating/v2/Shoptimeintransit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'transId': this.generateTransactionId(),
          'transactionSrc': 'ShipSmartAI',
        },
        data: rateRequest,
        operation: 'get_rates', // For carrier API logging
      });

      logger.info('[UpsProxy] Rates fetched successfully', {
        rateCount: Array.isArray(response.RateResponse?.RatedShipment)
          ? response.RateResponse.RatedShipment.length
          : (response.RateResponse?.RatedShipment ? 1 : 0),
      });

      return response;
    } catch (error) {
      logger.error('[UpsProxy] Rate fetch failed', { error: error.message });
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
      logger.error('[UpsProxy] Credential validation failed', { error: error.message });
      return false;
    }
  }
}

module.exports = UpsProxy;
