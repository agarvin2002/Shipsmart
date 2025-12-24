/* global logger */
const RateService = require('../services/rate-service');
const RateValidator = require('../validators/rate-validator');
const RatePresenter = require('../presenters/rate-presenter');
const ResponseFormatter = require('../helpers/response-formatter');

class RateController {
  /**
   * Get shipping rates from all carriers
   * POST /api/shipments/rates
   */
  static async getRates(req, res, next) {
    try {
      // Validate request
      const rateValidator = new RateValidator('getRates');
      rateValidator.validate(req.body);

      if (!rateValidator.isValid) {
        const validationErrors = ResponseFormatter.formatValidationError(rateValidator.error, req.id);
        logger.warn(`Validation failed for getRates: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      // Call service
      const rateService = new RateService();
      const rateComparison = await rateService.getRates(req.user.userId, rateValidator.value);

      // Present response
      logger.info(`Successfully fetched ${rateComparison.total_rates} rates for user: ${req.user.userId}`);
      const response = RatePresenter.presentComparison(rateComparison);
      res.status(200).send(ResponseFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in getRates: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  /**
   * Get rate comparison with detailed analysis
   * POST /api/shipments/rates/compare
   */
  static async compareRates(req, res, next) {
    try {
      // Validate request
      const rateValidator = new RateValidator('getRates');
      rateValidator.validate(req.body);

      if (!rateValidator.isValid) {
        const validationErrors = ResponseFormatter.formatValidationError(rateValidator.error, req.id);
        logger.warn(`Validation failed for compareRates: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      // Call service
      const rateService = new RateService();
      const rateComparison = await rateService.compareRates(req.user.userId, rateValidator.value);

      // Present response
      logger.info(`Successfully compared rates for user: ${req.user.userId}`);
      const response = RatePresenter.presentComparison(rateComparison);
      res.status(200).send(ResponseFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in compareRates: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  /**
   * Get rate history for a specific route
   * GET /api/shipments/rates/history
   */
  static async getRateHistory(req, res, next) {
    try {
      // Validate query parameters
      const rateValidator = new RateValidator('getRateHistory');
      rateValidator.validate(req.query);

      if (!rateValidator.isValid) {
        const validationErrors = ResponseFormatter.formatValidationError(rateValidator.error, req.id);
        logger.warn(`Validation failed for getRateHistory: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      // Call service
      const rateService = new RateService();
      const history = await rateService.getRateHistory(rateValidator.value);

      // Present response
      logger.info(`Successfully fetched rate history for user: ${req.user.userId}`);
      const response = RatePresenter.presentHistory(history);
      res.status(200).send(ResponseFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in getRateHistory: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }
}

module.exports = RateController;
