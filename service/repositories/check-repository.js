const { Check } = require('../models');

class CheckRepository {
  async findAll(userId, options = {}) {
    return await Check.findAll({
      where: { user_id: userId },  // CRITICAL: Multi-tenancy filter
      order: [['created_at', 'DESC']],
      ...options
    });
  }

  async findById(id, userId) {
    return await Check.findOne({
      where: { id, user_id: userId }  // CRITICAL: Multi-tenancy filter
    });
  }

  async create(checkData) {
    return await Check.create(checkData);
  }

  async update(id, userId, checkData) {
    const check = await this.findById(id, userId);
    if (!check) return null;
    return await check.update(checkData);
  }

  async delete(id, userId) {
    const check = await this.findById(id, userId);
    if (!check) return null;
    await check.destroy();
    return true;
  }
}

module.exports = CheckRepository;
