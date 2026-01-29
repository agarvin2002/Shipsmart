/* global logger */
const { namespace } = require('../../models');
const CarrierRateOrchestrator = require('../../services/carriers/carrier-rate-orchestrator');

class RateCacheRefreshConsumer {
  
  static async perform(job) {
    const { userId, shipmentData, cacheKey, requestId } = job.data;

    return namespace.run(async () => {
      namespace.set('requestId', requestId || 'rate-cache-refresh-worker');

      try {
        logger.info('[RateCacheRefreshConsumer] Refreshing rate cache', {
          userId,
          cacheKey,
        });

        const orchestrator = new CarrierRateOrchestrator();
        const rateComparison = await orchestrator.getRatesForShipment(
          userId,
          shipmentData,
          { forceRefresh: true }
        );

        logger.info('[RateCacheRefreshConsumer] Cache refreshed successfully', {
          userId,
          cacheKey,
          rateCount: rateComparison.total_rates,
        });

        return { success: true, rateCount: rateComparison.total_rates };
      } catch (error) {
        logger.error('[RateCacheRefreshConsumer] Failed to refresh cache', {
          userId,
          cacheKey,
          error: error.message,
          stack: error.stack,
        });
        throw error;
      }
    });
  }
}

module.exports = RateCacheRefreshConsumer;
