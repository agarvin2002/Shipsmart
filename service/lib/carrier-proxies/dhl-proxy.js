/* global logger */
const BaseCarrierProxy = require('./base-carrier-proxy');
const config = require('@shipsmart/env');

class DhlProxy extends BaseCarrierProxy {
  constructor(carrierConfig = null) {
    // If carrierConfig is provided, use it (DB-driven approach)
    // Otherwise fall back to environment config (legacy approach)
    if (carrierConfig) {
      super('DHL', carrierConfig);
    } else {
      const baseUrl = config.get('carriers:dhl:api_url') || 'https://express.api.dhl.com/mydhlapi/test';
      const timeout = config.get('carriers:dhl:timeout') || 15000;
      super('DHL', baseUrl, timeout);
    }
  }

  /**
   * Authenticates with DHL using Basic Auth
   * Unlike other carriers, DHL doesn't use OAuth - it uses Basic Auth directly on every request
   * @param {Object} credentials - Contains client_id (username) and client_secret (password)
   * @returns {string} Base64-encoded Basic Auth credentials string
   */
  async authenticate(credentials) {
    const { client_id, client_secret } = credentials;

    try {
      logger.info('[DhlProxy] Building Basic Auth credentials');

      // Validate credentials
      if (!client_id || !client_secret) {
        throw new Error('DHL credentials are required (client_id and client_secret)');
      }

      // DHL uses Basic Auth: encode username:password in base64
      const authString = Buffer.from(`${client_id}:${client_secret}`).toString('base64');

      logger.info('[DhlProxy] Basic Auth credentials built successfully');
      return authString;
    } catch (error) {
      logger.error('[DhlProxy] Failed to build auth credentials', { error: error.message });
      throw new Error(`DHL authentication failed: ${error.message}`);
    }
  }

  /**
   * Fetches rates from DHL Express API
   * @param {string} authHeader - Base64-encoded Basic Auth string from authenticate()
   * @param {Object} rateRequest - DHL rate request payload
   * @returns {Object} DHL rate response with products array
   */
  async getRates(authHeader, rateRequest) {
    try {
      logger.info('[DhlProxy] Fetching rates');

      const response = await this.makeRequest('/rates', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
        data: rateRequest,
        operation: 'get_rates', // For carrier API logging
      });

      logger.info('[DhlProxy] Rates fetched successfully', {
        productCount: response.products?.length || 0,
      });

      return response;
    } catch (error) {
      logger.error('[DhlProxy] Rate fetch failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Validates DHL credentials by attempting to fetch rates
   * @param {Object} credentials - Contains client_id, client_secret, account_number
   * @returns {boolean} True if credentials are valid
   */
  async validateCredentials(credentials) {
    try {
      // Build auth header
      const authHeader = await this.authenticate(credentials);

      // Make a lightweight rate request to test credentials
      const testRequest = {
        unitOfMeasurement: 'imperial',
        packages: [{
          weight: 1,
          dimensions: { length: 1, width: 1, height: 1 }
        }],
        customerDetails: {
          shipperDetails: {
            cityName: 'NEW YORK',
            countryCode: 'US',
            postalCode: '10001'
          },
          receiverDetails: {
            cityName: 'LOS ANGELES',
            countryCode: 'US',
            postalCode: '90001'
          }
        },
        accounts: [{
          number: credentials.account_number || '123456789',
          typeCode: 'shipper'
        }],
        productTypeCode: 'all',
        plannedShippingDateAndTime: new Date(Date.now() + 86400000).toISOString().replace(/\.\d{3}Z$/, ' GMT+00:00')
      };

      await this.getRates(authHeader, testRequest);
      return true;
    } catch (error) {
      logger.error('[DhlProxy] Credential validation failed', { error: error.message });
      return false;
    }
  }
}

module.exports = DhlProxy;
