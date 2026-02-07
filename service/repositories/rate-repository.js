const { Rate, Shipment } = require('../models');
const { PAGINATION } = require('@shipsmart/constants');

class RateRepository {
  async create(rateData) {
    return await Rate.create(rateData);
  }

  async bulkCreate(ratesData) {
    return await Rate.bulkCreate(ratesData);
  }

  /**
   * Find rate by ID with user_id filtering (multi-tenancy security)
   * @param {number} id - Rate ID
   * @param {number} userId - User ID (for security filtering)
   * @returns {Promise<Rate|null>} Rate if found and belongs to user, null otherwise
   */
  async findById(id, userId) {
    return await Rate.findOne({
      where: {
        id,
        user_id: userId  // CRITICAL: Prevents cross-user data access
      }
    });
  }

  async findByShipmentId(shipmentId) {
    return await Rate.findAll({
      where: { shipment_id: shipmentId },
      order: [['rate_amount', 'ASC']],
    });
  }

  async findByUserId(userId, options = {}) {
    const { limit = PAGINATION.DEFAULT_LIMIT, offset = PAGINATION.DEFAULT_OFFSET, carrier = null } = options;

    const where = { user_id: userId };
    if (carrier) {
      where.carrier = carrier;
    }

    return await Rate.findAll({
      where,
      order: [['fetched_at', 'DESC']],
      limit,
      offset,
    });
  }

  async findRecentRates(userId, days = 7) {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    return await Rate.findAll({
      where: {
        user_id: userId,
        fetched_at: {
          [require('sequelize').Op.gte]: sinceDate,
        },
      },
      order: [['fetched_at', 'DESC']],
    });
  }

  /**
   * Delete rate by ID with user_id filtering (multi-tenancy security)
   * @param {number} id - Rate ID
   * @param {number} userId - User ID (for security filtering)
   * @returns {Promise<number|null>} Number of deleted rows, or null if no rows deleted
   */
  async delete(id, userId) {
    const deletedCount = await Rate.destroy({
      where: { id, user_id: userId },
    });

    // Return null if no rows were deleted (rate doesn't exist or doesn't belong to user)
    return deletedCount > 0 ? deletedCount : null;
  }
}

module.exports = RateRepository;
