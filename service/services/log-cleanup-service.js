/* global logger */

const ApiRequestLogRepository = require('../repositories/api-request-log-repository');
const CarrierApiLogRepository = require('../repositories/carrier-api-log-repository');

/**
 * LogCleanupService
 *
 * Handles automatic cleanup of old API and carrier logs.
 * Deletes records based on last_queried_at timestamp (keeps frequently accessed data longer).
 *
 * Retention Strategy:
 * - Records are deleted based on last_queried_at, not created_at
 * - Frequently queried shipments stay in database longer
 * - Default retention: 90 days
 */
class LogCleanupService {
  /**
   * Delete logs older than specified days
   *
   * @param {number} daysToKeep - Number of days to retain logs (default: 90)
   * @returns {Promise<Object>} Cleanup results with counts
   */
  async cleanupOldLogs(daysToKeep = 90) {
    logger.info('[LogCleanupService] Starting log cleanup', { daysToKeep });

    try {
      const startTime = Date.now();

      // Delete old API request logs
      const apiLogsDeleted = await ApiRequestLogRepository.deleteOldRecords(daysToKeep);

      // Delete old carrier API logs
      const carrierLogsDeleted = await CarrierApiLogRepository.deleteOldRecords(daysToKeep);

      const duration = Date.now() - startTime;

      logger.info('[LogCleanupService] Cleanup completed successfully', {
        apiLogsDeleted,
        carrierLogsDeleted,
        totalDeleted: apiLogsDeleted + carrierLogsDeleted,
        daysToKeep,
        durationMs: duration
      });

      return {
        success: true,
        apiLogsDeleted,
        carrierLogsDeleted,
        totalDeleted: apiLogsDeleted + carrierLogsDeleted,
        durationMs: duration
      };

    } catch (error) {
      logger.error('[LogCleanupService] Cleanup failed', {
        error: error.message,
        stack: error.stack,
        daysToKeep
      });
      throw error;
    }
  }

  /**
   * Get statistics about logs before cleanup
   * Useful for monitoring and deciding retention periods
   *
   * @returns {Promise<Object>} Statistics about log counts and ages
   */
  async getCleanupStats() {
    try {
      const apiLogCount = await ApiRequestLogRepository.count();
      const carrierLogCount = await CarrierApiLogRepository.count();

      logger.info('[LogCleanupService] Cleanup statistics', {
        apiLogCount,
        carrierLogCount,
        totalLogs: apiLogCount + carrierLogCount
      });

      return {
        apiLogCount,
        carrierLogCount,
        totalLogs: apiLogCount + carrierLogCount
      };

    } catch (error) {
      logger.error('[LogCleanupService] Failed to get cleanup stats', {
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = new LogCleanupService();
