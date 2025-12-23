const BaseCarrierRateService = require('./base-carrier-rate-service');
const UpsProxy = require('../../lib/carrier-proxies/ups-proxy');
const UpsRateRequestBuilder = require('../../lib/request-builders/ups-rate-request-builder');
const logger = require('@shipsmart/logger').application('shipsmart-ai-api');

class UpsRateService extends BaseCarrierRateService {
  constructor(carrierCredential) {
    super(carrierCredential);
    // Pass carrier config to proxy if available (DB-driven approach)
    this.proxy = new UpsProxy(this.carrierConfig);
    this.carrierName = 'ups';
  }

  /**
   * Get shipping rates from UPS
   * @param {Object} shipmentData - Shipment details
   * @returns {Promise<Array>} Array of rate objects
   */
  async getRates(shipmentData) {
    try {
      this.logRateFetch(shipmentData);

      // 1. Authenticate with UPS
      const token = await this.proxy.authenticate(this.decryptedCredentials);

      // 2. Build rate request
      const rateRequest = UpsRateRequestBuilder.buildRateRequest(
        shipmentData,
        this.decryptedCredentials
      );

      // 3. Fetch rates
      const response = await this.proxy.getRates(token, rateRequest);

      // 4. Transform and return rates
      return this.transformRates(response);
    } catch (error) {
      logger.error('[UpsRateService] Failed to get rates', { error: error.message });
      throw error;
    }
  }

  /**
   * Transform UPS API response to standard format
   * @param {Object} response - UPS API response
   * @returns {Array} Array of standardized rate objects
   */
  transformRates(response) {
    // UPS can return RatedShipment as a single object or an array
    let ratedShipments = response.RateResponse?.RatedShipment || [];

    // Normalize to array if it's a single object
    if (!Array.isArray(ratedShipments)) {
      ratedShipments = [ratedShipments];
    }

    if (ratedShipments.length === 0) {
      logger.warn('[UpsRateService] No rates returned from UPS');
      return [];
    }

    // Get service codes from user's selected services
    const selectedServiceCodes = this.services.map(s => s.service_code);

    logger.info('[UpsRateService] Filtering rates', {
      totalRates: ratedShipments.length,
      selectedServices: selectedServiceCodes.length,
      selectedServiceCodes
    });

    const formattedRates = ratedShipments
      .filter((rate) => {
        const serviceCode = rate.Service?.Code;
        // Filter: Only include rates for user's selected services
        if (selectedServiceCodes.length > 0 && !selectedServiceCodes.includes(serviceCode)) {
          logger.debug('[UpsRateService] Skipping non-selected service', {
            serviceCode
          });
          return false;
        }
        return true;
      })
      .map((rate) => {
        // UPS may return NegotiatedRateCharges if account qualifies
        const negotiatedRate = rate.NegotiatedRateCharges?.TotalCharge;
        const totalCharges = negotiatedRate || rate.TotalCharges;

        return this.formatRate({
          service_name: this.getServiceName(rate.Service?.Code),
          service_code: rate.Service?.Code,
          rate_amount: parseFloat(totalCharges?.MonetaryValue || 0),
          currency: totalCharges?.CurrencyCode || 'USD',
          delivery_days: rate.GuaranteedDelivery?.BusinessDaysInTransit || this.estimateTransitDays(rate.Service?.Code),
          estimated_delivery_date: rate.GuaranteedDelivery?.DeliveryByTime || null,
          raw_response: rate,
        });
      });

    logger.info('[UpsRateService] Filtered rates', {
      inputCount: ratedShipments.length,
      outputCount: formattedRates.length
    });

    return formattedRates;
  }

  /**
   * Get UPS service name from code
   * @param {string} code - UPS service code
   * @returns {string} Service name
   */
  getServiceName(code) {
    const serviceNames = {
      '01': 'UPS Next Day Air',
      '02': 'UPS 2nd Day Air',
      '03': 'UPS Ground',
      '07': 'UPS Worldwide Express',
      '08': 'UPS Worldwide Expedited',
      '11': 'UPS Standard',
      '12': 'UPS 3 Day Select',
      '13': 'UPS Next Day Air Saver',
      '14': 'UPS Next Day Air Early AM',
      '59': 'UPS 2nd Day Air AM',
      '65': 'UPS Worldwide Saver',
    };

    return serviceNames[code] || `UPS Service ${code}`;
  }

  /**
   * Estimate transit days based on service code (fallback)
   * @param {string} code - UPS service code
   * @returns {number} Estimated transit days
   */
  estimateTransitDays(code) {
    const transitDaysMap = {
      '01': 1, // Next Day Air
      '02': 2, // 2nd Day Air
      '03': 5, // Ground
      '07': 1, // Worldwide Express
      '08': 3, // Worldwide Expedited
      '12': 3, // 3 Day Select
      '13': 1, // Next Day Air Saver
      '14': 1, // Next Day Air Early AM
      '59': 2, // 2nd Day Air AM
    };

    return transitDaysMap[code] || null;
  }

  /**
   * Validate UPS credentials
   * @returns {Promise<Object>} Validation result
   */
  async validateCredentials() {
    try {
      logger.info('[UpsRateService] Validating credentials');
      await this.proxy.authenticate(this.decryptedCredentials);
      return { valid: true, carrier: 'ups' };
    } catch (error) {
      logger.error('[UpsRateService] Credential validation failed', { error: error.message });
      return { valid: false, carrier: 'ups', error: error.message };
    }
  }
}

module.exports = UpsRateService;
