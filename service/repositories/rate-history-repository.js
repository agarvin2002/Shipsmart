const { RateHistory } = require('../models');
const { Op } = require('sequelize');
const { PAGINATION } = require('@shipsmart/constants');

class RateHistoryRepository {
  async create(historyData) {
    return await RateHistory.create(historyData);
  }

  async bulkCreate(historyDataArray) {
    return await RateHistory.bulkCreate(historyDataArray);
  }

  async findByRoute(originZip, destinationZip, userId, options = {}) {
    const { carrier = null, limit = PAGINATION.RATE_HISTORY_LIMIT, days = 30 } = options;

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const where = {
      user_id: userId,  // CRITICAL: Multi-tenancy filter
      origin_zip: originZip,
      destination_zip: destinationZip,
      fetched_at: { [Op.gte]: sinceDate },
    };

    if (carrier) {
      where.carrier = carrier;
    }

    return await RateHistory.findAll({
      where,
      order: [['fetched_at', 'DESC']],
      limit,
    });
  }

  async getAverageRate(originZip, destinationZip, carrier, serviceName, userId, days = 30) {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const result = await RateHistory.findOne({
      attributes: [
        [require('sequelize').fn('AVG', require('sequelize').col('rate_amount')), 'avg_rate'],
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
      ],
      where: {
        user_id: userId,  // CRITICAL: Multi-tenancy filter
        origin_zip: originZip,
        destination_zip: destinationZip,
        carrier,
        service_name: serviceName,
        fetched_at: { [Op.gte]: sinceDate },
      },
      raw: true,
    });

    return result;
  }

  async findByUserId(userId, options = {}) {
    const { limit = PAGINATION.RATE_HISTORY_LIMIT, offset = PAGINATION.DEFAULT_OFFSET, days = 30 } = options;

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    return await RateHistory.findAll({
      where: {
        user_id: userId,
        fetched_at: { [Op.gte]: sinceDate },
      },
      order: [['fetched_at', 'DESC']],
      limit,
      offset,
    });
  }

  async deleteOldRecords(days = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return await RateHistory.destroy({
      where: {
        fetched_at: { [Op.lt]: cutoffDate },
      },
    });
  }
}

module.exports = RateHistoryRepository;
