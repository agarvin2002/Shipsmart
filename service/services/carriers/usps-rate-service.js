/* global logger */
const BaseCarrierRateService = require('./base-carrier-rate-service');
const UspsProxy = require('../../lib/carrier-proxies/usps-proxy');
const UspsRateRequestBuilder = require('../../lib/request-builders/usps-rate-request-builder');
const { CARRIERS } = require('@shipsmart/constants');

class UspsRateService extends BaseCarrierRateService {
  constructor(carrierCredential) {
    super(carrierCredential);
    // Pass carrier config to proxy if available (DB-driven approach)
    this.proxy = new UspsProxy(this.carrierConfig);
    this.carrierName = CARRIERS.USPS;
  }


  async getRates(shipmentData) {
    try {
      this.logRateFetch(shipmentData);

      // Check if international shipment
      const isInternational = this.isInternationalShipment(shipmentData.origin, shipmentData.destination);

      // 1. Authenticate with OAuth 2.0 (cached per user)
      const token = await this.proxy.authenticate(this.decryptedCredentials, this.credential?.user_id);

      // 2. Build rate request
      const rateRequest = UspsRateRequestBuilder.buildRateRequest(shipmentData);

      // 3. Fetch rates (skip transit time API for international)
      let ratesResponse;
      let transitTimesResponse = [];

      if (isInternational) {
        // For international, only fetch rates (no transit time API available)
        ratesResponse = await this.proxy.getRates(token, rateRequest, true);
      } else {
        // For domestic, fetch both rates and transit times in parallel
        const transitTimeRequest = UspsRateRequestBuilder.buildTransitTimeRequest(shipmentData);
        [ratesResponse, transitTimesResponse] = await Promise.all([
          this.proxy.getRates(token, rateRequest, false),
          this.proxy.getTransitTime(token, transitTimeRequest).catch(err => {
            logger.warn('[UspsRateService] Transit time fetch failed, continuing without it', { error: err.message });
            return [];
          }),
        ]);
      }

      // 4. Transform and return rates with transit time data
      return this.transformRates(ratesResponse, transitTimesResponse, shipmentData);
    } catch (error) {
      logger.error('[UspsRateService] Failed to get rates', { error: error.message });
      throw error;
    }
  }


  transformRates(ratesResponse, transitTimesResponse = [], shipmentData) {
    const rateOptions = ratesResponse.rateOptions || [];

    if (rateOptions.length === 0) {
      logger.warn('[UspsRateService] No rates returned from USPS');
      return [];
    }

    // Check if international shipment
    const isInternational = this.isInternationalShipment(shipmentData.origin, shipmentData.destination);

    const transitTimeMap = this.buildTransitTimeMap(transitTimesResponse);

    const selectedServiceCodes = this.services.map(s => s.service_code);

    logger.info('[UspsRateService] Filtering rates', {
      totalRateOptions: rateOptions.length,
      selectedServices: selectedServiceCodes.length,
      selectedServiceCodes,
      isInternational,
      transitTimeServices: Object.keys(transitTimeMap).length
    });

    const formattedRates = [];
    const processedMailClasses = new Set();

    rateOptions.forEach((rateOption) => {
      if (!rateOption.rates || rateOption.rates.length === 0) {
        return;
      }

      // For international: filter by INTERNATIONAL_SERVICE_CENTER
      // For domestic: filter by NONE
      const expectedFacilityType = isInternational ? 'INTERNATIONAL_SERVICE_CENTER' : 'NONE';

      const standardRate = rateOption.rates.find(rate =>
        rate.rateIndicator === 'SP' &&
        rate.processingCategory === 'MACHINABLE' &&
        rate.destinationEntryFacilityType === expectedFacilityType
      );

      if (!standardRate) {
        return;
      }

      const mailClass = standardRate.mailClass;

      if (processedMailClasses.has(mailClass)) {
        return;
      }

      // Filter: For international shipments, show all available services
      // For domestic shipments, only include rates for user's selected services
      if (!isInternational && selectedServiceCodes.length > 0 && !selectedServiceCodes.includes(mailClass)) {
        logger.debug('[UspsRateService] Skipping non-selected service', { mailClass });
        return;
      }

      processedMailClasses.add(mailClass);

      // For international shipments, don't consider delivery dates
      const deliveryDays = isInternational ? null : (
        transitTimeMap[mailClass]?.serviceStandard
          ? parseInt(transitTimeMap[mailClass].serviceStandard)
          : this.estimateTransitDays(mailClass)
      );

      const estimatedDeliveryDate = isInternational ? null : (transitTimeMap[mailClass]?.scheduledDeliveryDateTime || null);

      formattedRates.push(this.formatRate({
        service_name: standardRate.productName || standardRate.description || UspsRateRequestBuilder.getServiceName(mailClass),
        service_code: mailClass,
        rate_amount: parseFloat(standardRate.price || 0),
        currency: 'USD',
        delivery_days: deliveryDays,
        estimated_delivery_date: estimatedDeliveryDate,
        raw_response: rateOption,
      }));
    });

    logger.info('[UspsRateService] Filtered rates', {
      inputCount: rateOptions.length,
      outputCount: formattedRates.length
    });

    return formattedRates;
  }

  buildTransitTimeMap(transitTimesResponse) {
    const transitTimeMap = {};

    if (!Array.isArray(transitTimesResponse)) {
      return transitTimeMap;
    }

    transitTimesResponse.forEach((transit) => {
      if (transit.mailClass) {
        transitTimeMap[transit.mailClass] = {
          serviceStandard: transit.serviceStandard,
          serviceStandardMessage: transit.serviceStandardMessage,
          scheduledDeliveryDateTime: transit.delivery?.scheduledDeliveryDateTime,
          guaranteedDelivery: transit.delivery?.guaranteedDelivery,
        };
      }
    });

    return transitTimeMap;
  }


  estimateTransitDays(mailClass) {
    const transitDaysMap = {
      'PRIORITY_MAIL_EXPRESS': 2,
      'PRIORITY_MAIL_EXPRESS_FOR_LIVES': 3,
      'PRIORITY_MAIL': 3,
      'USPS_GROUND_ADVANTAGE': 3,
      'FIRST_CLASS_MAIL_LETTERS': 3,
      'FIRST_CLASS_MAIL_FLATS': 3,
      'FIRST-CLASS_MAIL_LETTERS': 3,
      'FIRST-CLASS_MAIL_FLATS': 3,
      'FIRST-CLASS_MAIL_CARDS': 3,
      'PARCEL_SELECT': 3,
      'MEDIA_MAIL': 5,
      'LIBRARY_MAIL': 5,
      'BOUND_PRINTED_MATTER': 5,
      'PRIORITY_MAIL_INTERNATIONAL': 10,
    };

    return transitDaysMap[mailClass] || null;
  }

  isInternationalShipment(origin, destination) {
    const originCountry = origin.country || 'US';
    const destinationCountry = destination.country || 'US';
    return originCountry !== destinationCountry;
  }

  
  async validateCredentials() {
    try {
      logger.info('[UspsRateService] Validating credentials');
      await this.proxy.authenticate(this.decryptedCredentials, this.credential?.user_id);
      return { valid: true, carrier: CARRIERS.USPS };
    } catch (error) {
      logger.error('[UspsRateService] Credential validation failed', { error: error.message });
      return { valid: false, carrier: CARRIERS.USPS, error: error.message };
    }
  }
}

module.exports = UspsRateService;
