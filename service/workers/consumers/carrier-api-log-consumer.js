/* global logger */
const { namespace } = require('../../models');
const CarrierApiLogRepository = require('../../repositories/carrier-api-log-repository');

/**
 * CarrierApiLogConsumer
 *
 * Processes carrier API request/response logs from the queue and stores them in the database.
 * Uses UPSERT pattern: Updates existing record if (shipment_id + carrier) exists, inserts if not.
 * Error handling: Logs failures but does NOT crash worker - graceful degradation.
 */
class CarrierApiLogConsumer {
  static async perform(job) {
    const logData = job.data;

    try {
      return await namespace.run(async () => {
        namespace.set('requestId', logData.request_id || 'carrier-api-log-worker');

        try {
          logger.info('[CarrierApiLogConsumer] Processing carrier API log job', {
            shipmentId: logData.shipment_id,
            requestId: logData.request_id,
            carrier: logData.carrier,
            operation: logData.operation,
          });

          // UPSERT: Update if (shipment_id + carrier) exists, insert if not
          const record = await CarrierApiLogRepository.upsert(logData);

          logger.info('[CarrierApiLogConsumer] Carrier API log saved successfully', {
            shipmentId: logData.shipment_id,
            requestId: logData.request_id,
            carrier: logData.carrier,
            operation: logData.operation,
            status: logData.response_status,
            queryCount: record.query_count,
            isUpdate: record.query_count > 1, // Track if this was an update or insert
          });

          return {
            success: true,
            shipmentId: logData.shipment_id,
            carrier: logData.carrier,
            queryCount: record.query_count,
            isUpdate: record.query_count > 1
          };
        } catch (error) {
          logger.error('[CarrierApiLogConsumer] Failed to save carrier API log', {
            shipmentId: logData.shipment_id,
            requestId: logData.request_id,
            carrier: logData.carrier,
            error: error.message,
            stack: error.stack,
          });

          // Return failure result instead of throwing - prevents worker crash
          return {
            success: false,
            shipmentId: logData.shipment_id,
            carrier: logData.carrier,
            error: error.message
          };
        }
      });
    } catch (namespaceError) {
      // Catch any cls-hooked namespace errors - last line of defense
      logger.error('[CarrierApiLogConsumer] Namespace error - gracefully handling', {
        shipmentId: logData.shipment_id,
        requestId: logData.request_id,
        carrier: logData.carrier,
        error: namespaceError.message,
      });

      // Return failure without crashing worker
      return {
        success: false,
        shipmentId: logData.shipment_id,
        carrier: logData.carrier,
        error: 'Namespace error'
      };
    }
  }
}

module.exports = CarrierApiLogConsumer;
