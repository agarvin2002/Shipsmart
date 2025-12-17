const { Shipment, UserAddress, Rate } = require('../models');

class ShipmentRepository {
  async create(shipmentData) {
    return await Shipment.create(shipmentData);
  }

  async findById(id) {
    return await Shipment.findByPk(id, {
      include: [
        { model: UserAddress, as: 'originAddress' },
        { model: UserAddress, as: 'destinationAddress' },
        { model: Rate, as: 'rates' },
      ],
    });
  }

  async findByUserId(userId, options = {}) {
    const { limit = 50, offset = 0, status = null } = options;

    const where = { user_id: userId };
    if (status) {
      where.status = status;
    }

    return await Shipment.findAll({
      where,
      include: [
        { model: UserAddress, as: 'originAddress' },
        { model: UserAddress, as: 'destinationAddress' },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });
  }

  async update(id, userId, updateData) {
    const [updatedCount] = await Shipment.update(updateData, {
      where: { id, user_id: userId },
    });
    return updatedCount > 0;
  }

  async updateStatus(id, userId, status) {
    return await this.update(id, userId, { status });
  }

  async delete(id, userId) {
    return await Shipment.destroy({
      where: { id, user_id: userId },
    });
  }

  async findByIdAndUserId(id, userId) {
    return await Shipment.findOne({
      where: { id, user_id: userId },
      include: [
        { model: UserAddress, as: 'originAddress' },
        { model: UserAddress, as: 'destinationAddress' },
        { model: Rate, as: 'rates' },
      ],
    });
  }
}

module.exports = ShipmentRepository;
