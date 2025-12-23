const CarrierRateOrchestrator = require('../services/carriers/carrier-rate-orchestrator');
const RateValidator = require('../validators/rate-validator');
const RatePresenter = require('../presenters/rate-presenter');
const RateHistoryRepository = require('../repositories/rate-history-repository');
const ResponseFormatter = require('../helpers/response-formatter');
const logger = require('@shipsmart/logger').application('shipsmart-ai-api');

class RateController {
  /**
   * Get shipping rates from all carriers
   * POST /api/shipments/rates
   */
  static async getRates(req, res, next) {
    try {
      const userId = req.user.userId;
      const requestData = req.body;

      logger.info('[RateController] Get rates request', { userId, requestData });

      // Validate request
      const validation = RateValidator.validateGetRates(requestData);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          request_id: req.id,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: validation.errors
          }
        });
      }

      // Get rates from orchestrator
      const orchestrator = new CarrierRateOrchestrator();
      const rateComparison = await orchestrator.getRatesForShipment(userId, validation.value);

      // Present response
      const response = RatePresenter.presentComparison(rateComparison);

      logger.info('[RateController] Rates fetched successfully', {
        userId,
        totalRates: response.summary.total_rates,
        cached: response.summary.cached,
      });

      res.status(200).json(ResponseFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error('[RateController] Failed to get rates', {
        userId: req.user?.userId,
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  }

  /**
   * Get rate comparison with detailed analysis
   * POST /api/shipments/rates/compare
   */
  static async compareRates(req, res, next) {
    try {
      const userId = req.user.userId;
      const requestData = req.body;

      logger.info('[RateController] Compare rates request', { userId });

      // Validate request
      const validation = RateValidator.validateGetRates(requestData);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          request_id: req.id,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: validation.errors
          }
        });
      }

      // Force refresh (don't use cache)
      const orchestrator = new CarrierRateOrchestrator();
      const rateComparison = await orchestrator.getRatesForShipment(
        userId,
        validation.value,
        { forceRefresh: true }
      );

      // Present response
      const response = RatePresenter.presentComparison(rateComparison);

      res.status(200).json(ResponseFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error('[RateController] Failed to compare rates', {
        userId: req.user?.userId,
        error: error.message,
      });
      next(error);
    }
  }

  /**
   * Get rate history for a specific route
   * GET /api/shipments/rates/history
   */
  static async getRateHistory(req, res, next) {
    try {
      const userId = req.user.userId;
      const { origin_zip, destination_zip, carrier, days = 30 } = req.query;

      logger.info('[RateController] Get rate history request', {
        userId,
        origin_zip,
        destination_zip,
        carrier,
      });

      if (!origin_zip || !destination_zip) {
        return res.status(400).json(ResponseFormatter.formatError(
          'origin_zip and destination_zip are required',
          req.id,
          400
        ));
      }

      const repository = new RateHistoryRepository();
      const history = await repository.findByRoute(origin_zip, destination_zip, {
        carrier,
        days: parseInt(days),
      });

      const response = RatePresenter.presentHistory(history);

      res.status(200).json(ResponseFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error('[RateController] Failed to get rate history', {
        userId: req.user?.userId,
        error: error.message,
      });
      next(error);
    }
  }
}

module.exports = RateController;
