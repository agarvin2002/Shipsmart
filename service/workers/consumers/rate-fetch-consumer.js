/* global logger */
const Joi = require('@hapi/joi');
const CarrierRateOrchestrator = require('../../services/carriers/carrier-rate-orchestrator');
const { namespace } = require('../../models');
const { rateFetchJobSchema } = require('../validation/rate-fetch-job-schema');

class RateFetchConsumer {
  static async perform(job) {
    return new Promise((resolve, reject) => {
      namespace.run(async () => {
        try {
          // Validate job data
          const { error, value } = Joi.validate(job.data, rateFetchJobSchema);

          if (error) {
            const errorMsg = `Invalid job data: ${error.message}`;
            logger.error(errorMsg, { jobId: job.id, validationError: error.details });
            return reject(new Error(errorMsg));
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

          resolve({ success: true, rates });
        } catch (error) {
          logger.error(`[${job.data?.requestId}] Error fetching rates: ${error.message}`, {
            stack: error.stack,
            userId: job.data?.userId,
          });
          reject(error);
        }
      });
    });
  }
}

module.exports = RateFetchConsumer;
