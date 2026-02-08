/* global logger */
const BaseCarrierRateService = require('./base-carrier-rate-service');
const UpsProxy = require('../../lib/carrier-proxies/ups-proxy');
const UpsRateRequestBuilder = require('../../lib/request-builders/ups-rate-request-builder');
const { CARRIERS } = require('@shipsmart/constants');

class UpsRateService extends BaseCarrierRateService {
  constructor(carrierCredential) {
    super(carrierCredential);
    // Pass carrier config to proxy if available (DB-driven approach)
    this.proxy = new UpsProxy(this.carrierConfig);
    this.carrierName = CARRIERS.UPS;
  }

  
  async getRates(shipmentData) {
    try {
      this.logRateFetch(shipmentData);

      // 1. Authenticate with UPS (cached per user)
      const token = await this.proxy.authenticate(this.decryptedCredentials, this.credential?.user_id);

      // 2. Build rate request
      const rateRequest = UpsRateRequestBuilder.buildRateRequest(
        shipmentData,
        this.decryptedCredentials
      );

      // 3. Fetch rates
      const response = await this.proxy.getRates(token, rateRequest);

      // 4. Transform and return rates
      return this.transformRates(response, shipmentData);
    } catch (error) {
      logger.error('[UpsRateService] Failed to get rates', { error: error.message });
      throw error;
    }
  }


  transformRates(response, shipmentData) {
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

    // Check if international shipment
    const isInternational = this.isInternationalShipment(shipmentData.origin, shipmentData.destination);

    // Get service codes from user's selected services
    const selectedServiceCodes = this.services.map(s => s.service_code);

    logger.info('[UpsRateService] Filtering rates', {
      totalRates: ratedShipments.length,
      selectedServices: selectedServiceCodes.length,
      selectedServiceCodes,
      isInternational
    });

    const formattedRates = ratedShipments
      .filter((rate) => {
        const serviceCode = rate.Service?.Code;
        // Filter: For international shipments, show all available services
        // For domestic shipments, only include rates for user's selected services
        if (!isInternational && selectedServiceCodes.length > 0 && !selectedServiceCodes.includes(serviceCode)) {
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

        // For international shipments, don't consider delivery dates
        const transitInfo = isInternational ? { deliveryDays: null, estimatedDeliveryDate: null } : this.extractTransitTime(rate);

        return this.formatRate({
          service_name: this.getServiceName(rate.Service?.Code),
          service_code: rate.Service?.Code,
          rate_amount: parseFloat(totalCharges?.MonetaryValue || 0),
          currency: totalCharges?.CurrencyCode || 'USD',
          delivery_days: transitInfo.deliveryDays,
          estimated_delivery_date: transitInfo.estimatedDeliveryDate,
          raw_response: rate,
        });
      });

    logger.info('[UpsRateService] Filtered rates', {
      inputCount: ratedShipments.length,
      outputCount: formattedRates.length
    });

    return formattedRates;
  }

  extractTransitTime(rate) {
    let deliveryDays = null;
    let estimatedDeliveryDate = null;

    if (rate.TimeInTransit?.ServiceSummary?.EstimatedArrival) {
      const estimatedArrival = rate.TimeInTransit.ServiceSummary.EstimatedArrival;
      deliveryDays = estimatedArrival.BusinessDaysInTransit
        ? parseInt(estimatedArrival.BusinessDaysInTransit)
        : null;
      estimatedDeliveryDate = estimatedArrival.Date || estimatedArrival.Arrival?.Date || null;
    } else if (rate.GuaranteedDelivery) {
      deliveryDays = rate.GuaranteedDelivery.BusinessDaysInTransit
        ? parseInt(rate.GuaranteedDelivery.BusinessDaysInTransit)
        : null;
      estimatedDeliveryDate = rate.GuaranteedDelivery.DeliveryByTime || null;
    }

    if (!deliveryDays) {
      deliveryDays = this.estimateTransitDays(rate.Service?.Code);
    }

    return { deliveryDays, estimatedDeliveryDate };
  }


  isInternationalShipment(origin, destination) {
    const originCountry = origin.country || 'US';
    const destinationCountry = destination.country || 'US';
    return originCountry !== destinationCountry;
  }


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

  
  async validateCredentials() {
    try {
      logger.info('[UpsRateService] Validating credentials');
      await this.proxy.authenticate(this.decryptedCredentials, this.credential?.user_id);
      return { valid: true, carrier: CARRIERS.UPS };
    } catch (error) {
      logger.error('[UpsRateService] Credential validation failed', { error: error.message });
      return { valid: false, carrier: CARRIERS.UPS, error: error.message };
    }
  }
}

module.exports = UpsRateService;
