/* global logger */
const BaseCarrierRateService = require('./base-carrier-rate-service');
const DhlProxy = require('../../lib/carrier-proxies/dhl-proxy');
const DhlRateRequestBuilder = require('../../lib/request-builders/dhl-rate-request-builder');
const { CARRIERS } = require('@shipsmart/constants');

class DhlRateService extends BaseCarrierRateService {
  constructor(carrierCredential) {
    super(carrierCredential);
    // Pass carrier config to proxy if available (DB-driven approach)
    this.proxy = new DhlProxy(this.carrierConfig);
    this.carrierName = CARRIERS.DHL;
  }

  /**
   * Fetches rates from DHL Express API
   * @param {Object} shipmentData - Shipment details
   * @returns {Array} Formatted rates array
   */
  async getRates(shipmentData) {
    try {
      this.logRateFetch(shipmentData);

      // 1. Authenticate with DHL (builds Basic Auth header)
      const authHeader = await this.proxy.authenticate(this.decryptedCredentials);

      // 2. Build rate request
      const rateRequest = DhlRateRequestBuilder.buildRateRequest(
        shipmentData,
        this.decryptedCredentials
      );

      // 3. Fetch rates
      const response = await this.proxy.getRates(authHeader, rateRequest);

      // 4. Transform and return rates
      return this.transformRates(response, shipmentData);
    } catch (error) {
      logger.error('[DhlRateService] Failed to get rates', { error: error.message });
      throw error;
    }
  }

  /**
   * Transforms DHL API response into standard rate format
   * @param {Object} response - Raw DHL API response
   * @param {Object} shipmentData - Original shipment data
   * @returns {Array} Formatted rates
   */
  transformRates(response, shipmentData) {
    const products = response.products || [];

    if (products.length === 0) {
      logger.warn('[DhlRateService] No rates returned from DHL');
      return [];
    }

    // Check if international shipment
    const isInternational = this.isInternationalShipment(shipmentData.origin, shipmentData.destination);

    // Get service codes from user's selected services
    const selectedServiceCodes = this.services.map(s => s.service_code);

    logger.info('[DhlRateService] Filtering rates', {
      totalProducts: products.length,
      selectedServices: selectedServiceCodes.length,
      selectedServiceCodes,
      isInternational
    });

    const formattedRates = [];

    products.forEach((product) => {
      // Map DHL product code to our internal service code
      const serviceCode = this.mapProductCodeToServiceCode(product.productCode);

      // Filter: For international shipments, show all available services
      // For domestic shipments, only include rates for user's selected services
      if (!isInternational && selectedServiceCodes.length > 0 && !selectedServiceCodes.includes(serviceCode)) {
        logger.debug('[DhlRateService] Skipping non-selected service', {
          productCode: product.productCode,
          serviceCode
        });
        return;
      }

      // Extract price from totalPrice array (use BILLC - billing currency)
      const billingPrice = product.totalPrice?.find(p => p.currencyType === 'BILLC');

      if (!billingPrice) {
        logger.warn('[DhlRateService] No billing price found for product', {
          productCode: product.productCode
        });
        return;
      }

      // For international shipments, don't consider delivery dates
      const transitDays = isInternational ? null : (product.deliveryCapabilities?.totalTransitDays || null);
      const deliveryDate = isInternational ? null : (product.deliveryCapabilities?.estimatedDeliveryDateAndTime || null);

      formattedRates.push(this.formatRate({
        service_name: product.productName || serviceCode,
        service_code: serviceCode,
        rate_amount: parseFloat(billingPrice.price || 0),
        currency: billingPrice.priceCurrency || 'USD',
        delivery_days: transitDays,
        estimated_delivery_date: deliveryDate,
        raw_response: product,
      }));
    });

    logger.info('[DhlRateService] Filtered rates', {
      inputCount: products.length,
      outputCount: formattedRates.length
    });

    return formattedRates;
  }

  /**
   * Maps DHL product code to our internal service code format
   * @param {string} productCode - DHL product code (e.g., 'N', 'P', 'K')
   * @returns {string} Internal service code (e.g., 'DHL_EXPRESS_DOMESTIC')
   */
  mapProductCodeToServiceCode(productCode) {
    const codeMap = {
      'N': 'DHL_EXPRESS_DOMESTIC',
      'P': 'DHL_EXPRESS_WORLDWIDE',
      'K': 'DHL_EXPRESS_9_00',
      'E': 'DHL_EXPRESS_10_30',
      'Y': 'DHL_EXPRESS_12_00',
      'U': 'DHL_EXPRESS_WORLDWIDE_EU',
      'T': 'DHL_EXPRESS_9_00_DOC',
      'D': 'DHL_EXPRESS_WORLDWIDE_DOC',
      '8': 'DHL_EXPRESS_EASY',
      'W': 'DHL_ECONOMY_SELECT',
      'Q': 'DHL_MEDICAL_EXPRESS',
      'G': 'DHL_DOMESTIC_ECONOMY_SELECT',
      'H': 'DHL_ECONOMY_SELECT_DOMESTIC',
    };

    return codeMap[productCode] || `DHL_PRODUCT_${productCode}`;
  }

  /**
   * Determines if shipment is international
   * @param {Object} origin - Origin address
   * @param {Object} destination - Destination address
   * @returns {boolean} True if international
   */
  isInternationalShipment(origin, destination) {
    const originCountry = origin.country || 'US';
    const destinationCountry = destination.country || 'US';
    return originCountry !== destinationCountry;
  }

  /**
   * Validates DHL credentials
   * @returns {Object} Validation result with valid flag and carrier name
   */
  async validateCredentials() {
    try {
      logger.info('[DhlRateService] Validating credentials');
      await this.proxy.authenticate(this.decryptedCredentials);
      return { valid: true, carrier: CARRIERS.DHL };
    } catch (error) {
      logger.error('[DhlRateService] Credential validation failed', { error: error.message });
      return { valid: false, carrier: CARRIERS.DHL, error: error.message };
    }
  }
}

module.exports = DhlRateService;
