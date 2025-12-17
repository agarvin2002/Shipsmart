const { CarrierCredential } = require('../models');
const FedexRateService = require('../services/carriers/fedex-rate-service');
const UpsRateService = require('../services/carriers/ups-rate-service');
const UspsRateService = require('../services/carriers/usps-rate-service');
const logger = require('@shipsmart/logger').application('shipsmart-ai-api');

class CarrierRouter {
  /**
   * Get available carriers for a user
   * @param {number} userId - User ID
   * @param {Object} shipmentData - Shipment details (optional, for filtering)
   * @returns {Promise<Array>} Array of active, validated carrier credentials
   */
  static async getAvailableCarriers(userId, shipmentData = null) {
    try {
      logger.info('[CarrierRouter] Getting available carriers', { userId });

      const credentials = await CarrierCredential.findAll({
        where: {
          user_id: userId,
          is_active: true,
          validation_status: 'valid',
        },
        order: [['carrier', 'ASC']],
      });

      if (credentials.length === 0) {
        logger.warn('[CarrierRouter] No active carriers found for user', { userId });
        return [];
      }

      // Filter carriers that support the route (if shipment data provided)
      if (shipmentData) {
        return credentials.filter(cred =>
          this.supportsRoute(cred.carrier, shipmentData)
        );
      }

      logger.info('[CarrierRouter] Found carriers', {
        userId,
        count: credentials.length,
        carriers: credentials.map(c => c.carrier),
      });

      return credentials;
    } catch (error) {
      logger.error('[CarrierRouter] Error getting carriers', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Check if carrier supports the route
   * @param {string} carrier - Carrier name
   * @param {Object} shipmentData - Shipment details
   * @returns {boolean} Whether carrier supports this route
   */
  static supportsRoute(carrier, shipmentData) {
    const { origin, destination, service_type } = shipmentData;

    // Check if international shipment
    const isInternational = origin?.country !== destination?.country;

    // Domestic carriers (simplified logic)
    if (carrier === 'usps' && !isInternational) {
      return true;
    }

    // International carriers
    if ((carrier === 'fedex' || carrier === 'ups' || carrier === 'dhl') && isInternational) {
      return true;
    }

    // All carriers support domestic US shipments
    if (!isInternational && (origin?.country === 'US' || !origin?.country)) {
      return true;
    }

    return true; // Default: allow all carriers
  }

  /**
   * Get carrier service instance
   * @param {string} carrierName - Carrier name (fedex, ups, usps, dhl)
   * @param {Object} credentials - Carrier credentials
   * @returns {Object} Carrier service instance
   */
  static getCarrierService(carrierName, credentials) {
    const serviceMap = {
      fedex: FedexRateService,
      ups: UpsRateService,
      usps: UspsRateService,
      // dhl: DhlRateService, // Future implementation
    };

    const ServiceClass = serviceMap[carrierName.toLowerCase()];

    if (!ServiceClass) {
      throw new Error(`Unsupported carrier: ${carrierName}`);
    }

    return new ServiceClass(credentials);
  }

  /**
   * Route request to appropriate carrier service
   * @param {string} carrierName - Carrier name
   * @param {Object} credentials - Carrier credentials
   * @param {Object} shipmentData - Shipment details
   * @returns {Promise<Array>} Rates from carrier
   */
  static async routeRateRequest(carrierName, credentials, shipmentData) {
    try {
      logger.info('[CarrierRouter] Routing rate request', { carrier: carrierName });

      const service = this.getCarrierService(carrierName, credentials);
      const rates = await service.getRates(shipmentData);

      logger.info('[CarrierRouter] Rate request completed', {
        carrier: carrierName,
        rateCount: rates.length,
      });

      return rates;
    } catch (error) {
      logger.error('[CarrierRouter] Rate request failed', {
        carrier: carrierName,
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = CarrierRouter;
