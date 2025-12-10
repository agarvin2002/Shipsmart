const { UserAddress } = require('../models');

class AddressRepository {
  async findById(id) {
    return await UserAddress.findByPk(id);
  }

  async findByUserId(userId) {
    return await UserAddress.findAll({
      where: { user_id: userId },
      order: [['is_default', 'DESC'], ['created_at', 'DESC']],
    });
  }

  async findDefaultByUserId(userId) {
    return await UserAddress.findOne({
      where: { user_id: userId, is_default: true },
    });
  }

  async findByIdAndUserId(id, userId) {
    return await UserAddress.findOne({
      where: { id, user_id: userId },
    });
  }

  async create(addressData) {
    return await UserAddress.create(addressData);
  }

  async update(id, addressData) {
    const address = await UserAddress.findByPk(id);
    if (!address) return null;
    return await address.update(addressData);
  }

  async delete(id) {
    const address = await UserAddress.findByPk(id);
    if (!address) return null;
    await address.destroy();
    return { message: 'Address deleted successfully' };
  }

  async unsetAllDefaults(userId) {
    return await UserAddress.update(
      { is_default: false },
      { where: { user_id: userId } }
    );
  }

  async setDefault(id, userId) {
    const sequelize = UserAddress.sequelize;
    return await sequelize.transaction(async (t) => {
      await UserAddress.update(
        { is_default: false },
        { where: { user_id: userId }, transaction: t }
      );

      const address = await UserAddress.findByPk(id, { transaction: t });
      if (!address) return null;
      return await address.update({ is_default: true }, { transaction: t });
    });
  }
}

module.exports = AddressRepository;
