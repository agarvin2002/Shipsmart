const BaseCarrierRateService = require('./base-carrier-rate-service');
const UspsProxy = require('../../lib/carrier-proxies/usps-proxy');
const UspsRateRequestBuilder = require('../../lib/request-builders/usps-rate-request-builder');
const logger = require('@shipsmart/logger').application('shipsmart-ai-api');

class UspsRateService extends BaseCarrierRateService {
  constructor(carrierCredential) {
    super(carrierCredential);
    this.proxy = new UspsProxy();
    this.carrierName = 'usps';
  }

  /**
   * Get shipping rates from USPS
   * @param {Object} shipmentData - Shipment details
   * @returns {Promise<Array>} Array of rate objects
   */
  async getRates(shipmentData) {
    try {
      this.logRateFetch(shipmentData);

      // 1. Authenticate with OAuth 2.0
      const token = await this.proxy.authenticate(this.decryptedCredentials);

      // 2. Build rate request
      const rateRequest = UspsRateRequestBuilder.buildRateRequest(
        shipmentData,
        this.decryptedCredentials
      );

      // 3. Fetch rates
      const response = await this.proxy.getRates(token, rateRequest);

      // 4. Transform and return rates
      return this.transformRates(response);
    } catch (error) {
      logger.error('[UspsRateService] Failed to get rates', { error: error.message });
      throw error;
    }
  }

  /**
   * Transform USPS API response to standard format
   * @param {Object} response - USPS REST API response
   * @returns {Array} Array of standardized rate objects
   */
  transformRates(response) {
    const rates = response.rates || [];

    if (rates.length === 0) {
      logger.warn('[UspsRateService] No rates returned from USPS');
      return [];
    }

    return rates.map((rate) => {
      return this.formatRate({
        service_name: rate.description || UspsRateRequestBuilder.getServiceName(rate.mailClass),
        service_code: rate.mailClass,
        rate_amount: parseFloat(rate.price || 0),
        currency: 'USD',
        delivery_days: this.estimateTransitDays(rate.mailClass),
        estimated_delivery_date: null,
        raw_response: rate,
      });
    });
  }

  /**
   * Estimate transit days based on mail class
   * @param {string} mailClass - USPS mail class
   * @returns {number|null} Estimated transit days
   */
  estimateTransitDays(mailClass) {
    const transitDaysMap = {
      'PRIORITY_MAIL_EXPRESS': 1,
      'PRIORITY_MAIL': 3,
      'FIRST_CLASS': 3,
      'PARCEL_SELECT': 7,
      'PRIORITY_MAIL_INTERNATIONAL': 10,
    };

    return transitDaysMap[mailClass] || null;
  }

  /**
   * Validate USPS credentials
   * @returns {Promise<Object>} Validation result
   */
  async validateCredentials() {
    try {
      logger.info('[UspsRateService] Validating credentials');
      await this.proxy.authenticate(this.decryptedCredentials);
      return { valid: true, carrier: 'usps' };
    } catch (error) {
      logger.error('[UspsRateService] Credential validation failed', { error: error.message });
      return { valid: false, carrier: 'usps', error: error.message };
    }
  }
}

module.exports = UspsRateService;
