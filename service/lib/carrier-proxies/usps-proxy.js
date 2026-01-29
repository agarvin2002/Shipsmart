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
        operation: 'authenticate', // For carrier API logging
      });

      logger.info('[UspsProxy] Authentication successful');
      return response.access_token;
    } catch (error) {
      logger.error('[UspsProxy] Authentication failed', { error: error.message });
      throw new Error(`USPS authentication failed: ${error.message}`);
    }
  }


  async getRates(token, rateRequest, isInternational = false) {
    try {
      const endpoint = isInternational
        ? '/international-prices/v3/base-rates-list/search'
        : '/prices/v3/base-rates-list/search';

      logger.info('[UspsProxy] Fetching rates', { endpoint, isInternational });

      const response = await this.makeRequest(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: rateRequest,
        operation: 'get_rates', // For carrier API logging
      });

      logger.info('[UspsProxy] Rates fetched successfully', {
        rateCount: response.rateOptions?.length || 0,
      });

      return response;
    } catch (error) {
      logger.error('[UspsProxy] Rate fetch failed', { error: error.message });
      throw error;
    }
  }

  async getTransitTime(token, transitTimeRequest) {
    try {
      logger.info('[UspsProxy] Fetching transit times');

      const { originZIPCode, destinationZIPCode } = transitTimeRequest;

      const response = await this.makeRequest(
        `/service-standards/v3/estimates?originZIPCode=${originZIPCode}&destinationZIPCode=${destinationZIPCode}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          operation: 'get_transit_time', // For carrier API logging
        }
      );

      logger.info('[UspsProxy] Transit times fetched successfully', {
        serviceCount: Array.isArray(response) ? response.length : 0,
      });

      return response;
    } catch (error) {
      logger.error('[UspsProxy] Transit time fetch failed', { error: error.message });
      throw error;
    }
  }

  
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
