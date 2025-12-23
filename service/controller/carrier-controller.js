/* global logger */
const CarrierService = require('../services/carrier-service');
const CarrierValidator = require('../validators/carrier-validator');
const CarrierPresenter = require('../presenters/carrier-presenter');
const ResponseFormatter = require('../helpers/response-formatter');

class CarrierController {
  /**
   * Get all carriers
   * GET /api/carriers
   */
  static async getCarriers(req, res, next) {
    try {
      // Validate query parameters
      const carrierValidator = new CarrierValidator('getCarriers');
      carrierValidator.validate(req.query);

      if (!carrierValidator.isValid) {
        const validationErrors = ResponseFormatter.formatValidationError(carrierValidator.error, req.id);
        logger.warn(`Validation failed for getCarriers: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      // Call service
      const carrierService = new CarrierService();
      const carriers = await carrierService.getCarriers(carrierValidator.value);

      // Present response
      logger.info(`Successfully fetched ${carriers.length} carriers`);
      const response = CarrierPresenter.presentCollection(carriers);
      res.status(200).send(ResponseFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in getCarriers: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  /**
   * Get carrier by ID
   * GET /api/carriers/:id
   */
  static async getCarrierById(req, res, next) {
    try {
      // Validate parameters
      const carrierValidator = new CarrierValidator('getCarrierById');
      carrierValidator.validate({ id: parseInt(req.params.id, 10) });

      if (!carrierValidator.isValid) {
        const validationErrors = ResponseFormatter.formatValidationError(carrierValidator.error, req.id);
        logger.warn(`Validation failed for getCarrierById: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      // Call service
      const carrierService = new CarrierService();
      const result = await carrierService.getCarrierById(carrierValidator.value.id);

      // Check for errors
      if (result.error) {
        logger.warn(`Carrier not found with id: ${carrierValidator.value.id}`);
        return res.status(404).send(ResponseFormatter.formatError(result.error, req.id, 404));
      }

      // Present response
      logger.info(`Successfully fetched carrier with id: ${carrierValidator.value.id}`);
      const response = CarrierPresenter.presentCarrier(result);
      res.status(200).send(ResponseFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in getCarrierById: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  /**
   * Get carrier services
   * GET /api/carriers/:id/services
   */
  static async getCarrierServices(req, res, next) {
    try {
      // Validate parameters
      const carrierValidator = new CarrierValidator('getCarrierServices');
      carrierValidator.validate({
        id: parseInt(req.params.id, 10),
        ...req.query
      });

      if (!carrierValidator.isValid) {
        const validationErrors = ResponseFormatter.formatValidationError(carrierValidator.error, req.id);
        logger.warn(`Validation failed for getCarrierServices: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      // Call service
      const carrierService = new CarrierService();
      const result = await carrierService.getCarrierServices(
        carrierValidator.value.id,
        {
          category: carrierValidator.value.category,
          active_only: carrierValidator.value.active_only
        }
      );

      // Check for errors
      if (result.error) {
        logger.warn(`Carrier not found with id: ${carrierValidator.value.id}`);
        return res.status(404).send(ResponseFormatter.formatError(result.error, req.id, 404));
      }

      // Present response
      logger.info(`Successfully fetched ${result.total} services for carrier: ${result.carrier.name}`);
      const response = CarrierPresenter.presentCarrierWithServices(result);
      res.status(200).send(ResponseFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in getCarrierServices: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }
}

module.exports = CarrierController;
