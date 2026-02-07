/**
 * ApiRequestLogRepository
 *
 * Data access layer for api_request_logs table.
 * Implements UPSERT pattern: Update if shipment_id exists, insert if not.
 *
 * Key Methods:
 * - upsert(): Insert or update based on shipment_id
 * - findByShipmentId(): Get complete trace for a shipment
 * - findByUser(): Get all logs for a user
 * - findErrors(): Find failed requests for analysis
 */

const { ApiRequestLog } = require('../models');
const { Op } = require('sequelize');

class ApiRequestLogRepository {
  /**
   * UPSERT: Insert or Update based on shipment_id
   * If shipment_id exists, update with latest data and increment query_count
   * If not, insert new record
   *
   * @param {Object} logData - Log data to insert/update
   * @returns {Promise<ApiRequestLog>} The created or updated record
   */
  async upsert(logData) {
    const now = new Date();

    // Check if record exists
    const existing = await ApiRequestLog.findOne({
      where: { shipment_id: logData.shipment_id }
    });

    if (existing) {
      // UPDATE existing record
      await existing.update({
        ...logData,
        query_count: existing.query_count + 1,
        last_queried_at: now,
        updated_at: now
        // first_queried_at remains unchanged
      });
      return existing;
    } else {
      // INSERT new record
      return await ApiRequestLog.create({
        ...logData,
        query_count: 1,
        first_queried_at: now,
        last_queried_at: now
      });
    }
  }

  /**
   * Find log by shipment ID with related carrier logs
   *
   * @param {string} shipmentId - The shipment ID to search for
   * @returns {Promise<ApiRequestLog|null>} The log with related carrier logs
   */
  async findByShipmentId(shipmentId) {
    return await ApiRequestLog.findOne({
      where: { shipment_id: shipmentId },
      include: [{
        association: 'CarrierApiLogs',
        order: [['last_queried_at', 'DESC']]
      }]
    });
  }

  /**
   * Find logs for a specific user
   *
   * @param {number} userId - The user ID
   * @param {Object} options - Query options (limit, offset, dates)
   * @returns {Promise<ApiRequestLog[]>} Array of logs
   */
  async findByUser(userId, options = {}) {
    const { limit = 50, offset = 0, startDate, endDate } = options;
    const where = { user_id: userId };

    if (startDate || endDate) {
      where.last_queried_at = {};
      if (startDate) where.last_queried_at[Op.gte] = startDate;
      if (endDate) where.last_queried_at[Op.lte] = endDate;
    }

    return await ApiRequestLog.findAll({
      where,
      limit,
      offset,
      order: [['last_queried_at', 'DESC']]
    });
  }

  /**
   * Find logs with errors (failed requests)
   *
   * @param {Object} options - Query options (userId, startDate, limit)
   * @returns {Promise<ApiRequestLog[]>} Array of error logs
   */
  async findErrors(options = {}) {
    const { limit = 50, userId, startDate } = options;
    const where = { error_message: { [Op.ne]: null } };

    if (userId) where.user_id = userId;
    if (startDate) where.last_queried_at = { [Op.gte]: startDate };

    return await ApiRequestLog.findAll({
      where,
      limit,
      order: [['last_queried_at', 'DESC']]
    });
  }

  /**
   * Delete old records based on last_queried_at
   * Keeps frequently queried shipments longer
   *
   * @param {number} daysToKeep - Number of days to retain (default: 90)
   * @returns {Promise<number>} Number of records deleted
   */
  async deleteOldRecords(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    return await ApiRequestLog.destroy({
      where: {
        last_queried_at: { [Op.lt]: cutoffDate }
      }
    });
  }

  /**
   * Count total logs
   *
   * @param {Object} filters - Optional filters (userId, shipmentId)
   * @returns {Promise<number>} Total count
   */
  async count(filters = {}) {
    const where = {};

    if (filters.userId) where.user_id = filters.userId;
    if (filters.shipmentId) where.shipment_id = filters.shipmentId;

    return await ApiRequestLog.count({ where });
  }

  /**
   * Get most frequently queried shipments for a specific user
   *
   * @param {string} userId - User ID to filter by
   * @param {number} limit - Number of results to return
   * @returns {Promise<ApiRequestLog[]>} Array of logs sorted by query_count
   */
  async getMostQueried(userId, limit = 10) {
    return await ApiRequestLog.findAll({
      where: { user_id: userId },  // CRITICAL: Multi-tenancy filter
      limit,
      order: [['query_count', 'DESC'], ['last_queried_at', 'DESC']]
    });
  }
}

module.exports = new ApiRequestLogRepository();
