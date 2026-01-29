/**
 * CarrierApiLogRepository
 *
 * Data access layer for carrier_api_logs table.
 * Implements UPSERT pattern: Update if shipment_id+carrier exists, insert if not.
 *
 * Key Methods:
 * - upsert(): Insert or update based on shipment_id + carrier composite key
 * - findByShipmentId(): Get all carrier logs for a shipment
 * - findByCarrier(): Get logs for specific carrier
 * - getStats(): Get performance statistics per carrier
 */

const { CarrierApiLog } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../models').sequelize;

class CarrierApiLogRepository {
  /**
   * UPSERT: Insert or Update based on shipment_id + carrier
   * If shipment_id + carrier exists, update with latest data and increment query_count
   * If not, insert new record
   *
   * @param {Object} logData - Log data to insert/update
   * @returns {Promise<CarrierApiLog>} The created or updated record
   */
  async upsert(logData) {
    const now = new Date();

    // Check if record exists for this shipment + carrier
    const existing = await CarrierApiLog.findOne({
      where: {
        shipment_id: logData.shipment_id,
        carrier: logData.carrier
      }
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
      return await CarrierApiLog.create({
        ...logData,
        query_count: 1,
        first_queried_at: now,
        last_queried_at: now
      });
    }
  }

  /**
   * Find all carrier logs for a shipment
   *
   * @param {string} shipmentId - The shipment ID to search for
   * @returns {Promise<CarrierApiLog[]>} Array of carrier logs for this shipment
   */
  async findByShipmentId(shipmentId) {
    return await CarrierApiLog.findAll({
      where: { shipment_id: shipmentId },
      order: [
        ['carrier', 'ASC'],
        ['last_queried_at', 'DESC']
      ]
    });
  }

  /**
   * Find logs for a specific carrier
   *
   * @param {string} carrier - The carrier name (fedex, ups, usps, dhl)
   * @param {Object} options - Query options (userId, startDate, endDate, limit)
   * @returns {Promise<CarrierApiLog[]>} Array of carrier logs
   */
  async findByCarrier(carrier, options = {}) {
    const { limit = 50, userId, startDate, endDate } = options;
    const where = { carrier };

    if (userId) where.user_id = userId;
    if (startDate || endDate) {
      where.last_queried_at = {};
      if (startDate) where.last_queried_at[Op.gte] = startDate;
      if (endDate) where.last_queried_at[Op.lte] = endDate;
    }

    return await CarrierApiLog.findAll({
      where,
      limit,
      order: [['last_queried_at', 'DESC']]
    });
  }

  /**
   * Find logs with errors (failed carrier requests)
   *
   * @param {Object} options - Query options (carrier, userId, limit)
   * @returns {Promise<CarrierApiLog[]>} Array of error logs
   */
  async findErrors(options = {}) {
    const { limit = 50, carrier, userId } = options;
    const where = { error_type: { [Op.ne]: null } };

    if (carrier) where.carrier = carrier;
    if (userId) where.user_id = userId;

    return await CarrierApiLog.findAll({
      where,
      limit,
      order: [['last_queried_at', 'DESC']]
    });
  }

  /**
   * Get performance statistics for a carrier
   *
   * @param {string} carrier - The carrier name
   * @param {Date} startDate - Optional start date filter
   * @param {Date} endDate - Optional end date filter
   * @returns {Promise<Array>} Statistics grouped by operation
   */
  async getStats(carrier, startDate, endDate) {
    const where = { carrier };

    if (startDate || endDate) {
      where.last_queried_at = {};
      if (startDate) where.last_queried_at[Op.gte] = startDate;
      if (endDate) where.last_queried_at[Op.lte] = endDate;
    }

    return await CarrierApiLog.findAll({
      where,
      attributes: [
        'operation',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_requests'],
        [sequelize.fn('AVG', sequelize.col('duration_ms')), 'avg_duration_ms'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN error_type IS NOT NULL THEN 1 END")), 'error_count']
      ],
      group: ['operation']
    });
  }

  /**
   * Delete old records based on last_queried_at
   * Keeps frequently queried carrier data longer
   *
   * @param {number} daysToKeep - Number of days to retain (default: 90)
   * @returns {Promise<number>} Number of records deleted
   */
  async deleteOldRecords(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    return await CarrierApiLog.destroy({
      where: {
        last_queried_at: { [Op.lt]: cutoffDate }
      }
    });
  }

  /**
   * Count total logs
   *
   * @param {Object} filters - Optional filters (userId, carrier, shipmentId)
   * @returns {Promise<number>} Total count
   */
  async count(filters = {}) {
    const where = {};

    if (filters.userId) where.user_id = filters.userId;
    if (filters.carrier) where.carrier = filters.carrier;
    if (filters.shipmentId) where.shipment_id = filters.shipmentId;

    return await CarrierApiLog.count({ where });
  }

  /**
   * Get most frequently queried carrier+shipment combinations
   *
   * @param {string} carrier - Optional carrier filter
   * @param {number} limit - Number of results to return
   * @returns {Promise<CarrierApiLog[]>} Array of logs sorted by query_count
   */
  async getMostQueried(carrier = null, limit = 10) {
    const where = {};
    if (carrier) where.carrier = carrier;

    return await CarrierApiLog.findAll({
      where,
      limit,
      order: [
        ['query_count', 'DESC'],
        ['last_queried_at', 'DESC']
      ]
    });
  }
}

module.exports = new CarrierApiLogRepository();
