/* global logger */
const Joi = require('@hapi/joi');
const CarrierRateOrchestrator = require('../../services/carriers/carrier-rate-orchestrator');
const { namespace } = require('../../models');
const { rateFetchJobSchema } = require('../validation/rate-fetch-job-schema');

class RateFetchConsumer {
  static async perform(job) {
    try {
      return await namespace.run(async () => {
        try {
          // Validate job data
          const { error, value } = Joi.validate(job.data, rateFetchJobSchema);

          if (error) {
            const errorMsg = `Invalid job data: ${error.message}`;
            logger.error(errorMsg, { jobId: job.id, validationError: error.details });

            // Return error result instead of throwing - prevents worker crash
            return { success: false, error: errorMsg };
          }

          const { shipmentData, userId, requestId, options = {} } = value;

          namespace.set('requestId', requestId);

          logger.info(`[${requestId}] Processing rate fetch job for user ${userId}`);

          const orchestrator = new CarrierRateOrchestrator();
          const rates = await orchestrator.getRatesForShipment(userId, shipmentData, {
            ...options,
            forceRefresh: options.forceRefresh ?? true,  // Default true, but configurable
          });

          logger.info(`[${requestId}] Successfully fetched rates from ${rates.total_carriers} carriers`);

          return { success: true, rates };
        } catch (error) {
          logger.error(`[${job.data?.requestId}] Error fetching rates: ${error.message}`, {
            stack: error.stack,
            userId: job.data?.userId,
          });

          // Return error result instead of throwing - prevents worker crash
          return { success: false, error: error.message };
        }
      });
    } catch (namespaceError) {
      // Catch any cls-hooked namespace errors - last line of defense
      logger.error('[RateFetchConsumer] Namespace error - gracefully handling', {
        jobId: job.id,
        requestId: job.data?.requestId,
        error: namespaceError.message,
      });

      // Return failure without crashing worker
      return {
        success: false,
        error: 'Namespace error'
      };
    }
  }
}

module.exports = RateFetchConsumer;
