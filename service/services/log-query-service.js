/* global logger */

const ApiRequestLogRepository = require('../repositories/api-request-log-repository');
const CarrierApiLogRepository = require('../repositories/carrier-api-log-repository');

/**
 * LogQueryService
 *
 * Provides query methods for accessing API and carrier logs.
 * Primary use case: AI agents querying complete shipment traces.
 *
 * Key Features:
 * - Shipment-based queries (get all data for a shipment)
 * - Error analysis queries
 * - Performance statistics
 * - Complex searches combining both log tables
 */
class LogQueryService {
  /**
   * Get complete shipment trace (API request + all carrier requests)
   * Uses shipment_id as primary identifier
   *
   * @param {string} shipmentId - The shipment ID to query
   * @param {Object} context - Request context with currentUser
   * @returns {Promise<Object>} Complete trace data
   */
  async getShipmentTrace(shipmentId, context) {
    logger.info('[LogQueryService] Fetching shipment trace', {
      shipmentId,
      userId: context?.currentUser?.id,
      requestId: context?.requestId
    });

    try {
      // Get API request log for this shipment
      const apiLog = await ApiRequestLogRepository.findByShipmentId(shipmentId);

      // Get all carrier API logs for this shipment
      const carrierLogs = await CarrierApiLogRepository.findByShipmentId(shipmentId);

      // Build comprehensive trace
      const trace = {
        shipment_id: shipmentId,
        api_request: apiLog ? {
          request_id: apiLog.request_id,
          method: apiLog.method,
          path: apiLog.path,
          query_params: apiLog.query_params,
          request_body: apiLog.request_body,
          response_status: apiLog.response_status,
          response_body: apiLog.response_body,
          duration_ms: apiLog.duration_ms,
          error_message: apiLog.error_message,
          query_count: apiLog.query_count,
          first_queried_at: apiLog.first_queried_at,
          last_queried_at: apiLog.last_queried_at,
          created_at: apiLog.created_at
        } : null,
        carrier_requests: carrierLogs.map(log => ({
          carrier: log.carrier,
          operation: log.operation,
          request_id: log.request_id,
          endpoint: log.endpoint,
          http_method: log.http_method,
          request_body: log.request_body,
          response_status: log.response_status,
          response_body: log.response_body,
          duration_ms: log.duration_ms,
          error_type: log.error_type,
          error_message: log.error_message,
          attempt_number: log.attempt_number,
          query_count: log.query_count,
          first_queried_at: log.first_queried_at,
          last_queried_at: log.last_queried_at,
          created_at: log.created_at
        })),
        summary: {
          total_duration_ms: apiLog?.duration_ms || 0,
          carrier_count: carrierLogs.length,
          query_count: apiLog?.query_count || 0,
          first_queried_at: apiLog?.first_queried_at,
          last_queried_at: apiLog?.last_queried_at,
          has_errors: !!(apiLog?.error_message || carrierLogs.some(log => log.error_type))
        }
      };

      logger.info('[LogQueryService] Shipment trace retrieved', {
        shipmentId,
        carrierCount: trace.carrier_requests.length,
        hasApiLog: !!apiLog,
        hasErrors: trace.summary.has_errors
      });

      return trace;

    } catch (error) {
      logger.error('[LogQueryService] Failed to fetch shipment trace', {
        shipmentId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Find failed requests for analysis
   *
   * @param {Object} options - Query options
   * @param {number} options.userId - Filter by user (required for multi-tenancy)
   * @param {string} options.carrier - Filter by carrier (optional)
   * @param {Date} options.startDate - Filter from date (optional)
   * @param {Date} options.endDate - Filter to date (optional)
   * @param {number} options.limit - Max results (default: 50)
   * @returns {Promise<Object>} Failed requests from both tables
   */
  async getFailedRequests(options = {}) {
    const {
      userId,
      carrier,
      startDate,
      endDate,
      limit = 50
    } = options;

    logger.info('[LogQueryService] Fetching failed requests', {
      userId,
      carrier,
      startDate,
      endDate,
      limit
    });

    try {
      // Get API errors (HTTP errors from our API)
      const apiErrors = await ApiRequestLogRepository.findErrors({
        userId,
        startDate,
        endDate,
        limit
      });

      // Get carrier API errors
      const carrierErrors = await CarrierApiLogRepository.findErrors({
        userId,
        carrier,
        startDate,
        endDate,
        limit
      });

      logger.info('[LogQueryService] Failed requests retrieved', {
        apiErrorCount: apiErrors.length,
        carrierErrorCount: carrierErrors.length
      });

      return {
        api_errors: apiErrors.map(log => ({
          shipment_id: log.shipment_id,
          request_id: log.request_id,
          method: log.method,
          path: log.path,
          response_status: log.response_status,
          error_message: log.error_message,
          duration_ms: log.duration_ms,
          last_queried_at: log.last_queried_at,
          query_count: log.query_count
        })),
        carrier_errors: carrierErrors.map(log => ({
          shipment_id: log.shipment_id,
          request_id: log.request_id,
          carrier: log.carrier,
          operation: log.operation,
          error_type: log.error_type,
          error_message: log.error_message,
          response_status: log.response_status,
          duration_ms: log.duration_ms,
          last_queried_at: log.last_queried_at,
          query_count: log.query_count
        })),
        summary: {
          total_errors: apiErrors.length + carrierErrors.length,
          api_error_count: apiErrors.length,
          carrier_error_count: carrierErrors.length
        }
      };

    } catch (error) {
      logger.error('[LogQueryService] Failed to fetch failed requests', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get performance stats for carrier API
   *
   * @param {string} carrier - Carrier name ('fedex', 'ups', 'usps', 'dhl')
   * @param {Date} startDate - Start date for stats (optional)
   * @param {Date} endDate - End date for stats (optional)
   * @returns {Promise<Array>} Performance statistics by operation
   */
  async getCarrierStats(carrier, startDate = null, endDate = null) {
    logger.info('[LogQueryService] Fetching carrier stats', {
      carrier,
      startDate,
      endDate
    });

    try {
      const stats = await CarrierApiLogRepository.getStats(carrier, startDate, endDate);

      logger.info('[LogQueryService] Carrier stats retrieved', {
        carrier,
        operationCount: stats.length
      });

      return {
        carrier,
        period: {
          start: startDate,
          end: endDate
        },
        operations: stats.map(stat => ({
          operation: stat.operation,
          total_requests: parseInt(stat.total_requests, 10),
          avg_duration_ms: parseFloat(stat.avg_duration_ms).toFixed(2),
          error_count: parseInt(stat.error_count, 10),
          error_rate: (parseInt(stat.error_count, 10) / parseInt(stat.total_requests, 10) * 100).toFixed(2) + '%'
        }))
      };

    } catch (error) {
      logger.error('[LogQueryService] Failed to fetch carrier stats', {
        carrier,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Search logs for AI agent queries
   * Complex query combining both tables with multiple filters
   *
   * @param {Object} query - Search criteria
   * @param {number} query.userId - User ID (required for multi-tenancy)
   * @param {string} query.carrier - Filter by carrier (optional)
   * @param {string} query.operation - Filter by operation (optional)
   * @param {number} query.status - Filter by HTTP status (optional)
   * @param {Date} query.startDate - Filter from date (optional)
   * @param {Date} query.endDate - Filter to date (optional)
   * @param {boolean} query.errorOnly - Only return errors (default: false)
   * @param {number} query.limit - Max results (default: 100)
   * @returns {Promise<Array>} Search results
   */
  async searchLogs(query) {
    const {
      userId,
      carrier,
      operation,
      status,
      startDate,
      endDate,
      errorOnly = false,
      limit = 100
    } = query;

    logger.info('[LogQueryService] Searching logs', {
      userId,
      carrier,
      operation,
      status,
      errorOnly,
      limit
    });

    try {
      // Build options for repository queries
      const apiOptions = {
        userId,
        limit,
        startDate,
        endDate
      };

      const carrierOptions = {
        userId,
        carrier,
        startDate,
        endDate,
        limit
      };

      // Get logs based on filters
      let apiLogs;
      if (errorOnly) {
        apiLogs = await ApiRequestLogRepository.findErrors(apiOptions);
      } else {
        apiLogs = await ApiRequestLogRepository.findByUser(userId, apiOptions);
      }

      // Get carrier logs
      let carrierLogs;
      if (errorOnly) {
        carrierLogs = await CarrierApiLogRepository.findErrors(carrierOptions);
      } else if (carrier) {
        carrierLogs = await CarrierApiLogRepository.findByCarrier(carrier, carrierOptions);
      } else {
        // Get all carrier logs for the shipments we found
        const shipmentIds = apiLogs.map(log => log.shipment_id);
        carrierLogs = [];
        for (const shipmentId of shipmentIds) {
          const logs = await CarrierApiLogRepository.findByShipmentId(shipmentId);
          carrierLogs.push(...logs);
        }
      }

      // Filter carrier logs by operation if specified
      if (operation) {
        carrierLogs = carrierLogs.filter(log => log.operation === operation);
      }

      // Filter by status if specified
      if (status) {
        apiLogs = apiLogs.filter(log => log.response_status === status);
        carrierLogs = carrierLogs.filter(log => log.response_status === status);
      }

      // Combine results by shipment_id
      const results = apiLogs.map(apiLog => {
        const relatedCarrierLogs = carrierLogs.filter(
          carrierLog => carrierLog.shipment_id === apiLog.shipment_id
        );

        return {
          shipment_id: apiLog.shipment_id,
          request_id: apiLog.request_id,
          api_request: {
            method: apiLog.method,
            path: apiLog.path,
            response_status: apiLog.response_status,
            duration_ms: apiLog.duration_ms,
            error_message: apiLog.error_message,
            last_queried_at: apiLog.last_queried_at,
            query_count: apiLog.query_count
          },
          carrier_requests: relatedCarrierLogs.map(log => ({
            carrier: log.carrier,
            operation: log.operation,
            response_status: log.response_status,
            duration_ms: log.duration_ms,
            error_type: log.error_type,
            error_message: log.error_message,
            last_queried_at: log.last_queried_at,
            query_count: log.query_count
          })),
          has_errors: !!(apiLog.error_message || relatedCarrierLogs.some(log => log.error_type))
        };
      });

      logger.info('[LogQueryService] Search completed', {
        resultCount: results.length,
        withErrors: results.filter(r => r.has_errors).length
      });

      return results;

    } catch (error) {
      logger.error('[LogQueryService] Search failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get logs by user with pagination
   * Convenience method for listing a user's recent logs
   *
   * @param {number} userId - User ID
   * @param {Object} options - Pagination and filter options
   * @param {number} options.limit - Max results (default: 50)
   * @param {number} options.offset - Offset for pagination (default: 0)
   * @param {Date} options.startDate - Filter from date (optional)
   * @param {Date} options.endDate - Filter to date (optional)
   * @returns {Promise<Array>} User's API logs
   */
  async getLogsByUser(userId, options = {}) {
    logger.info('[LogQueryService] Fetching logs by user', {
      userId,
      options
    });

    try {
      const logs = await ApiRequestLogRepository.findByUser(userId, options);

      logger.info('[LogQueryService] User logs retrieved', {
        userId,
        count: logs.length
      });

      return logs.map(log => ({
        shipment_id: log.shipment_id,
        request_id: log.request_id,
        method: log.method,
        path: log.path,
        response_status: log.response_status,
        duration_ms: log.duration_ms,
        error_message: log.error_message,
        query_count: log.query_count,
        first_queried_at: log.first_queried_at,
        last_queried_at: log.last_queried_at,
        created_at: log.created_at
      }));

    } catch (error) {
      logger.error('[LogQueryService] Failed to fetch user logs', {
        userId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}

module.exports = new LogQueryService();
