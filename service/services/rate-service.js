/* global logger */
const CarrierRateOrchestrator = require('./carriers/carrier-rate-orchestrator');
const RateHistoryRepository = require('../repositories/rate-history-repository');

class RateService {
  constructor() {
    this.rateHistoryRepository = new RateHistoryRepository();
    this.orchestrator = new CarrierRateOrchestrator();
  }

  /**
   * Get shipping rates from all carriers
   * @param {number} userId - User ID
   * @param {Object} rateRequest - Rate request data
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Rate comparison results
   */
  async getRates(userId, rateRequest, options = {}) {
    try {
      const rateComparison = await this.orchestrator.getRatesForShipment(
        userId,
        rateRequest,
        options
      );

      logger.info(`Successfully fetched rates for user ${userId}`, {
        totalRates: rateComparison.total_rates,
        cached: rateComparison.cached || false,
      });

      return rateComparison;
    } catch (error) {
      logger.error(`Error fetching rates for user ${userId}: ${error.stack}`);
      throw error;
    }
  }

  /**
   * Get rate comparison with fresh data (no cache)
   * @param {number} userId - User ID
   * @param {Object} rateRequest - Rate request data
   * @returns {Promise<Object>} Rate comparison results
   */
  async compareRates(userId, rateRequest) {
    try {
      const rateComparison = await this.orchestrator.getRatesForShipment(
        userId,
        rateRequest,
        { forceRefresh: true }
      );

      logger.info(`Successfully compared rates for user ${userId}`, {
        totalRates: rateComparison.total_rates,
      });

      return rateComparison;
    } catch (error) {
      logger.error(`Error comparing rates for user ${userId}: ${error.stack}`);
      throw error;
    }
  }

  /**
   * Get rate history for a specific route
   * @param {Object} queryParams - Query parameters (origin_zip, destination_zip, carrier, days)
   * @returns {Promise<Array>} Rate history records
   */
  async getRateHistory(queryParams) {
    try {
      const { origin_zip, destination_zip, carrier, days } = queryParams;

      const history = await this.rateHistoryRepository.findByRoute(
        origin_zip,
        destination_zip,
        {
          carrier,
          days: parseInt(days),
        }
      );

      logger.info(`Successfully fetched rate history`, {
        origin_zip,
        destination_zip,
        carrier,
        recordCount: history.length,
      });

      return history;
    } catch (error) {
      logger.error(`Error fetching rate history: ${error.stack}`);
      throw error;
    }
  }

  /**
   * Get user's rate history
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Rate history records
   */
  async getUserRateHistory(userId, options = {}) {
    try {
      const history = await this.rateHistoryRepository.findByUserId(userId, options);

      logger.info(`Successfully fetched user rate history for user ${userId}`, {
        recordCount: history.length,
      });

      return history;
    } catch (error) {
      logger.error(`Error fetching user rate history for user ${userId}: ${error.stack}`);
      throw error;
    }
  }
}

module.exports = RateService;
