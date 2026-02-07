/* global logger */
const { CarrierCredential, Carrier, CarrierService } = require('../models');
const FedexRateService = require('../services/carriers/fedex-rate-service');
const UpsRateService = require('../services/carriers/ups-rate-service');
const UspsRateService = require('../services/carriers/usps-rate-service');
const { CARRIERS } = require('@shipsmart/constants');

class CarrierRouter {
  
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

      // Enrich credentials with carrier config and selected services
      const enrichedCredentials = await Promise.all(
        credentials.map(async (credential) => {
          // Get carrier configuration from DB
          const carrier = await Carrier.findOne({
            where: { code: credential.carrier, is_active: true }
          });

          if (!carrier) {
            logger.warn('[CarrierRouter] Carrier config not found', { carrier: credential.carrier });
            return null;
          }

          // Get user's selected services or all services if none selected
          let services;
          if (credential.selected_service_ids && credential.selected_service_ids.length > 0) {
            // User has selected specific services
            services = await CarrierService.findAll({
              where: {
                id: credential.selected_service_ids,
                carrier_id: carrier.id,
                is_active: true
              }
            });
          } else {
            // No selection = fetch all services (backward compatible)
            services = await CarrierService.findAll({
              where: {
                carrier_id: carrier.id,
                is_active: true
              }
            });
          }

          // Attach carrier config and services to credential
          const enrichedCredential = credential.toJSON();
          enrichedCredential.carrierConfig = carrier;
          enrichedCredential.services = services;

          return enrichedCredential;
        })
      );

      // Filter out null entries (carriers without config)
      const validCredentials = enrichedCredentials.filter(c => c !== null);

      // Filter carriers that support the route (if shipment data provided)
      const filteredCredentials = shipmentData
        ? validCredentials.filter(cred =>
            this.supportsRoute(cred.carrier, shipmentData)
          )
        : validCredentials;

      logger.info('[CarrierRouter] Found carriers with config', {
        userId,
        count: filteredCredentials.length,
        carriers: filteredCredentials.map(c => ({
          carrier: c.carrier,
          serviceCount: c.services.length
        })),
      });

      return filteredCredentials;
    } catch (error) {
      logger.error('[CarrierRouter] Error getting carriers', { error: error.message, userId });
      throw error;
    }
  }

  
  static supportsRoute(carrier, shipmentData) {
    const { origin, destination, service_type } = shipmentData;

    // Check if international shipment
    const isInternational = origin?.country !== destination?.country;

    // Domestic carriers (simplified logic)
    if (carrier === CARRIERS.USPS && !isInternational) {
      return true;
    }

    // International carriers
    if ((carrier === CARRIERS.FEDEX || carrier === CARRIERS.UPS || carrier === CARRIERS.DHL) && isInternational) {
      return true;
    }

    // All carriers support domestic US shipments
    if (!isInternational && (origin?.country === 'US' || !origin?.country)) {
      return true;
    }

    return true; // Default: allow all carriers
  }

  
  static getCarrierService(carrierName, credentials) {
    const serviceMap = {
      [CARRIERS.FEDEX]: FedexRateService,
      [CARRIERS.UPS]: UpsRateService,
      [CARRIERS.USPS]: UspsRateService,
      // [CARRIERS.DHL]: DhlRateService, // Future implementation
    };

    const ServiceClass = serviceMap[carrierName.toLowerCase()];

    if (!ServiceClass) {
      throw new Error(`Unsupported carrier: ${carrierName}`);
    }

    return new ServiceClass(credentials);
  }

  
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
