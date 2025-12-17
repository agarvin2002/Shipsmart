const { Rate, Shipment } = require('../models');

class RateRepository {
  async create(rateData) {
    return await Rate.create(rateData);
  }

  async bulkCreate(ratesData) {
    return await Rate.bulkCreate(ratesData);
  }

  async findById(id) {
    return await Rate.findByPk(id);
  }

  async findByShipmentId(shipmentId) {
    return await Rate.findAll({
      where: { shipment_id: shipmentId },
      order: [['rate_amount', 'ASC']],
    });
  }

  async findByUserId(userId, options = {}) {
    const { limit = 50, offset = 0, carrier = null } = options;

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

  async delete(id, userId) {
    return await Rate.destroy({
      where: { id, user_id: userId },
    });
  }
}

module.exports = RateRepository;
