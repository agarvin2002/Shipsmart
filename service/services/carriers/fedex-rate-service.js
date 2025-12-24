const BaseCarrierRateService = require('./base-carrier-rate-service');
const FedexProxy = require('../../lib/carrier-proxies/fedex-proxy');
const FedexRateRequestBuilder = require('../../lib/request-builders/fedex-rate-request-builder');
const logger = require('@shipsmart/logger').application('shipsmart-ai-api');

class FedexRateService extends BaseCarrierRateService {
  constructor(carrierCredential) {
    super(carrierCredential);
    // Pass carrier config to proxy if available (DB-driven approach)
    this.proxy = new FedexProxy(this.carrierConfig);
    this.carrierName = 'fedex';
  }

  
  async getRates(shipmentData) {
    try {
      this.logRateFetch(shipmentData);

      // 1. Authenticate with FedEx
      const token = await this.proxy.authenticate(this.decryptedCredentials);

      // 2. Build rate request
      const rateRequest = FedexRateRequestBuilder.buildRateRequest(
        shipmentData,
        this.decryptedCredentials
      );

      // 3. Fetch rates
      const response = await this.proxy.getRates(token, rateRequest);

      // 4. Transform and return rates
      return this.transformRates(response);
    } catch (error) {
      logger.error('[FedexRateService] Failed to get rates', { error: error.message });
      throw error;
    }
  }

  
  transformRates(response) {
    const rateReplyDetails = response.output?.rateReplyDetails || [];

    if (rateReplyDetails.length === 0) {
      logger.warn('[FedexRateService] No rates returned from FedEx');
      return [];
    }

    // Get service codes from user's selected services
    const selectedServiceCodes = this.services.map(s => s.service_code);

    logger.info('[FedexRateService] Filtering rates', {
      totalRates: rateReplyDetails.length,
      selectedServices: selectedServiceCodes.length,
      selectedServiceCodes
    });

    const formattedRates = [];

    rateReplyDetails.forEach((rate) => {
      // Filter: Only include rates for user's selected services
      if (selectedServiceCodes.length > 0 && !selectedServiceCodes.includes(rate.serviceType)) {
        logger.debug('[FedexRateService] Skipping non-selected service', {
          serviceType: rate.serviceType
        });
        return;
      }

      const ratedShipmentDetails = rate.ratedShipmentDetails || [];

      // FedEx returns multiple rate types: ACCOUNT and LIST
      // We'll use ACCOUNT rate if available, otherwise fall back to LIST
      const accountRate = ratedShipmentDetails.find(r => r.rateType === 'ACCOUNT');
      const ratedShipment = accountRate || ratedShipmentDetails[0];

      if (!ratedShipment) {
        logger.warn('[FedexRateService] No rated shipment details found', { serviceType: rate.serviceType });
        return;
      }

      const totalCharge = ratedShipment.totalNetCharge || ratedShipment.totalBaseCharge;

      formattedRates.push(this.formatRate({
        service_name: rate.serviceName || rate.serviceType,
        service_code: rate.serviceType,
        rate_amount: parseFloat(totalCharge),
        currency: ratedShipment.currency || 'USD',
        delivery_days: rate.commit?.transitDays || this.estimateTransitDays(rate.serviceType),
        estimated_delivery_date: rate.commit?.dateDetail?.date || null,
        raw_response: rate,
      }));
    });

    logger.info('[FedexRateService] Filtered rates', {
      inputCount: rateReplyDetails.length,
      outputCount: formattedRates.length
    });

    return formattedRates;
  }

  
  estimateTransitDays(serviceType) {
    const transitDaysMap = {
      STANDARD_OVERNIGHT: 1,
      PRIORITY_OVERNIGHT: 1,
      FIRST_OVERNIGHT: 1,
      FEDEX_2_DAY: 2,
      FEDEX_2_DAY_AM: 2,
      FEDEX_EXPRESS_SAVER: 3,
      FEDEX_GROUND: 5,
      GROUND_HOME_DELIVERY: 5,
    };

    return transitDaysMap[serviceType] || null;
  }

  
  async validateCredentials() {
    try {
      logger.info('[FedexRateService] Validating credentials');
      await this.proxy.authenticate(this.decryptedCredentials);
      return { valid: true, carrier: 'fedex' };
    } catch (error) {
      logger.error('[FedexRateService] Credential validation failed', { error: error.message });
      return { valid: false, carrier: 'fedex', error: error.message };
    }
  }
}

module.exports = FedexRateService;
