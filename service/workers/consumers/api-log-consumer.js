const { namespace } = require('../../models');
const ApiRequestLogRepository = require('../../repositories/api-request-log-repository');
const logger = require('@shipsmart/logger').application('shipsmart-ai-api');

/**
 * ApiLogConsumer
 *
 * Processes API request/response logs from the queue and stores them in the database.
 * Uses UPSERT pattern: Updates existing record if shipment_id exists, inserts if not.
 */
class ApiLogConsumer {
  static async perform(job) {
    const logData = job.data;

    return namespace.run(async () => {
      namespace.set('requestId', logData.request_id || 'api-log-worker');

      try {
        logger.info('[ApiLogConsumer] Processing API log job', {
          shipmentId: logData.shipment_id,
          requestId: logData.request_id,
          method: logData.method,
          path: logData.path,
        });

        // UPSERT: Update if shipment_id exists, insert if not
        const record = await ApiRequestLogRepository.upsert(logData);

        logger.info('[ApiLogConsumer] API log saved successfully', {
          shipmentId: logData.shipment_id,
          requestId: logData.request_id,
          method: logData.method,
          path: logData.path,
          status: logData.response_status,
          queryCount: record.query_count,
          isUpdate: record.query_count > 1, // Track if this was an update or insert
        });

        return {
          success: true,
          shipmentId: logData.shipment_id,
          queryCount: record.query_count,
          isUpdate: record.query_count > 1
        };
      } catch (error) {
        logger.error('[ApiLogConsumer] Failed to save API log', {
          shipmentId: logData.shipment_id,
          requestId: logData.request_id,
          error: error.message,
          stack: error.stack,
        });
        throw error;
      }
    });
  }
}

module.exports = ApiLogConsumer;
