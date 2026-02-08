/* global logger */
const { namespace } = require('../../models');
const ApiRequestLogRepository = require('../../repositories/api-request-log-repository');

/**
 * ApiLogConsumer
 *
 * Processes API request/response logs from the queue and stores them in the database.
 * Uses UPSERT pattern: Updates existing record if shipment_id exists, inserts if not.
 * Error handling: Logs failures but does NOT crash worker - graceful degradation.
 */
class ApiLogConsumer {
  static async perform(job) {
    const logData = job.data;

    try {
      return await namespace.run(async () => {
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

          // Return failure result instead of throwing - prevents worker crash
          return {
            success: false,
            shipmentId: logData.shipment_id,
            error: error.message
          };
        }
      });
    } catch (namespaceError) {
      // Catch any cls-hooked namespace errors - last line of defense
      logger.error('[ApiLogConsumer] Namespace error - gracefully handling', {
        shipmentId: logData.shipment_id,
        requestId: logData.request_id,
        error: namespaceError.message,
      });

      // Return failure without crashing worker
      return {
        success: false,
        shipmentId: logData.shipment_id,
        error: 'Namespace error'
      };
    }
  }
}

module.exports = ApiLogConsumer;
