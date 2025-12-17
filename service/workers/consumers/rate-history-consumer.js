const { namespace } = require('../../models');
const RateHistoryRepository = require('../../repositories/rate-history-repository');
const logger = require('@shipsmart/logger').application('shipsmart-ai-api');

class RateHistoryConsumer {
  /**
   * Save rate history to database
   * @param {Object} job - Bull job object
   */
  static async perform(job) {
    const { userId, rates, shipmentData, requestId } = job.data;

    return namespace.run(async () => {
      namespace.set('requestId', requestId || 'rate-history-worker');

      try {
        logger.info('[RateHistoryConsumer] Processing rate history job', {
          userId,
          rateCount: rates.length,
        });

        const { origin, destination, package: pkg, service_type } = shipmentData;

        const historyRecords = rates.map(rate => ({
          user_id: userId,
          carrier: rate.carrier,
          service_name: rate.service_name,
          rate_amount: rate.rate_amount,
          currency: rate.currency,
          package_weight: pkg.weight,
          origin_zip: origin.postal_code,
          destination_zip: destination.postal_code,
          origin_country: origin.country || 'US',
          destination_country: destination.country || 'US',
          service_type: service_type || 'ground',
          fetched_at: new Date(),
        }));

        const repository = new RateHistoryRepository();
        await repository.bulkCreate(historyRecords);

        logger.info('[RateHistoryConsumer] Rate history saved successfully', {
          userId,
          recordCount: historyRecords.length,
        });

        return { success: true, recordCount: historyRecords.length };
      } catch (error) {
        logger.error('[RateHistoryConsumer] Failed to save rate history', {
          userId,
          error: error.message,
          stack: error.stack,
        });
        throw error;
      }
    });
  }
}

module.exports = RateHistoryConsumer;
