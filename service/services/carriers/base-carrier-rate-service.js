const logger = require('@shipsmart/logger').application('shipsmart-ai-api');
const CryptoHelper = require('../../helpers/crypto-helper');

class BaseCarrierRateService {
  constructor(carrierCredential) {
    this.carrierName = carrierCredential?.carrier || 'unknown';
    this.credential = carrierCredential;

    // Decrypt credentials if provided
    if (carrierCredential) {
      this.decryptedCredentials = {
        client_id: CryptoHelper.decrypt(carrierCredential.client_id_encrypted),
        client_secret: CryptoHelper.decrypt(carrierCredential.client_secret_encrypted),
        account_number: carrierCredential.account_numbers
          ? JSON.parse(carrierCredential.account_numbers)[0]
          : null,
        account_numbers: carrierCredential.account_numbers
          ? JSON.parse(carrierCredential.account_numbers)
          : [],
      };
    }
  }

  /**
   * Abstract method - must be implemented by child classes
   * @param {Object} shipmentData - Shipment details
   * @returns {Promise<Array>} Array of rate objects
   */
  async getRates(shipmentData) {
    throw new Error(`getRates() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Abstract method - must be implemented by child classes
   * @returns {Promise<boolean>} Validation result
   */
  async validateCredentials() {
    throw new Error(`validateCredentials() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Handle errors from carrier APIs
   * @param {Error} error - Error object
   * @returns {Object} Standardized error response
   */
  handleError(error) {
    logger.error(`[${this.carrierName}RateService] Error:`, {
      message: error.message,
      stack: error.stack,
    });

    return {
      success: false,
      carrier: this.carrierName,
      error: error.message || 'Unknown error occurred',
    };
  }

  /**
   * Log rate fetch attempt
   * @param {Object} shipmentData - Shipment details
   */
  logRateFetch(shipmentData) {
    logger.info(`[${this.carrierName}RateService] Fetching rates`, {
      origin: shipmentData.origin?.postal_code,
      destination: shipmentData.destination?.postal_code,
      weight: shipmentData.package?.weight,
    });
  }

  /**
   * Format rate object to standard structure
   * @param {Object} rawRate - Raw rate data from carrier
   * @returns {Object} Standardized rate object
   */
  formatRate(rawRate) {
    return {
      carrier: this.carrierName,
      service_name: rawRate.service_name,
      service_code: rawRate.service_code,
      rate_amount: parseFloat(rawRate.rate_amount),
      currency: rawRate.currency || 'USD',
      delivery_days: rawRate.delivery_days,
      estimated_delivery_date: rawRate.estimated_delivery_date,
      raw_response: rawRate.raw_response,
    };
  }
}

module.exports = BaseCarrierRateService;
