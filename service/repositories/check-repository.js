const { Check } = require('../models');

class CheckRepository {
  async findAll(options = {}) {
    return await Check.findAll({
      order: [['created_at', 'DESC']],
      ...options
    });
  }

  async findById(id) {
    return await Check.findByPk(id);
  }

  async create(checkData) {
    return await Check.create(checkData);
  }

  async update(id, checkData) {
    const check = await this.findById(id);
    if (!check) return null;
    return await check.update(checkData);
  }

  async delete(id) {
    const check = await this.findById(id);
    if (!check) return null;
    await check.destroy();
    return true;
  }
}

module.exports = CheckRepository;
