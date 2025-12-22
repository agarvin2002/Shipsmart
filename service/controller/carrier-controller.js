/* global logger */
const { Carrier, CarrierService } = require('../models');
const ResponseFormatter = require('../helpers/response-formatter');

class CarrierController {
  static async getCarriers(req, res, next) {
    try {
      const carriers = await Carrier.findAll({
        where: { is_active: true },
        attributes: ['id', 'name', 'code', 'logo_url', 'auth_type', 'required_credentials'],
        order: [['name', 'ASC']]
      });

      logger.info(`Successfully fetched ${carriers.length} carriers`);

      const formattedCarriers = carriers.map(carrier => ({
        id: carrier.id,
        name: carrier.name,
        code: carrier.code,
        logo_url: carrier.logo_url,
        auth_type: carrier.auth_type,
        required_credentials: carrier.required_credentials
      }));

      res.status(200).send(ResponseFormatter.formatSuccess(formattedCarriers, req.id));
    } catch (error) {
      logger.error(`Exception in getCarriers: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async getCarrierById(req, res, next) {
    try {
      const carrierId = parseInt(req.params.id, 10);

      if (isNaN(carrierId)) {
        logger.warn(`Invalid carrier ID: ${req.params.id}`);
        return res.status(400).send(ResponseFormatter.formatError('Invalid carrier ID', req.id, 400));
      }

      const carrier = await Carrier.findOne({
        where: { id: carrierId, is_active: true },
        attributes: ['id', 'name', 'code', 'logo_url', 'auth_type', 'required_credentials']
      });

      if (!carrier) {
        logger.warn(`Carrier not found with id: ${carrierId}`);
        return res.status(404).send(ResponseFormatter.formatError('Carrier not found', req.id, 404));
      }

      logger.info(`Successfully fetched carrier with id: ${carrierId}`);

      const formattedCarrier = {
        id: carrier.id,
        name: carrier.name,
        code: carrier.code,
        logo_url: carrier.logo_url,
        auth_type: carrier.auth_type,
        required_credentials: carrier.required_credentials
      };

      res.status(200).send(ResponseFormatter.formatSuccess(formattedCarrier, req.id));
    } catch (error) {
      logger.error(`Exception in getCarrierById: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async getCarrierServices(req, res, next) {
    try {
      const carrierId = parseInt(req.params.id, 10);

      if (isNaN(carrierId)) {
        logger.warn(`Invalid carrier ID: ${req.params.id}`);
        return res.status(400).send(ResponseFormatter.formatError('Invalid carrier ID', req.id, 400));
      }

      const carrier = await Carrier.findOne({
        where: { id: carrierId, is_active: true }
      });

      if (!carrier) {
        logger.warn(`Carrier not found with id: ${carrierId}`);
        return res.status(404).send(ResponseFormatter.formatError('Carrier not found', req.id, 404));
      }

      const services = await CarrierService.findAll({
        where: {
          carrier_id: carrierId,
          is_active: true
        },
        attributes: ['id', 'service_code', 'service_name', 'description', 'category'],
        order: [['category', 'ASC'], ['service_name', 'ASC']]
      });

      logger.info(`Successfully fetched ${services.length} services for carrier: ${carrier.name}`);

      const formattedServices = services.map(service => ({
        id: service.id,
        service_code: service.service_code,
        service_name: service.service_name,
        description: service.description,
        category: service.category
      }));

      res.status(200).send(ResponseFormatter.formatSuccess({
        carrier: {
          id: carrier.id,
          name: carrier.name,
          code: carrier.code
        },
        services: formattedServices,
        total: formattedServices.length
      }, req.id));
    } catch (error) {
      logger.error(`Exception in getCarrierServices: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }
}

module.exports = CarrierController;
