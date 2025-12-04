/* global logger */
const { Check } = require('../models');

class CheckService {
  async getAllChecks() {
    try {
      const checks = await Check.findAll({
        order: [['created_at', 'DESC']],
      });
      return checks;
    } catch (error) {
      logger.error(`Error fetching all checks: ${error.stack}`);
      throw error;
    }
  }

  async getCheckById(id) {
    try {
      const check = await Check.findByPk(id);
      if (!check) {
        return { error: 'Check not found' };
      }
      return check;
    } catch (error) {
      logger.error(`Error fetching check by id ${id}: ${error.stack}`);
      throw error;
    }
  }

  async createCheck(data) {
    try {
      const check = await Check.create({
        name: data.name,
        description: data.description,
        status: data.status || 'active',
      });
      return check;
    } catch (error) {
      logger.error(`Error creating check: ${error.stack}`);
      throw error;
    }
  }

  async updateCheck(id, data) {
    try {
      const check = await Check.findByPk(id);
      if (!check) {
        return { error: 'Check not found' };
      }

      await check.update({
        name: data.name !== undefined ? data.name : check.name,
        description: data.description !== undefined ? data.description : check.description,
        status: data.status !== undefined ? data.status : check.status,
      });

      return check;
    } catch (error) {
      logger.error(`Error updating check ${id}: ${error.stack}`);
      throw error;
    }
  }

  async deleteCheck(id) {
    try {
      const check = await Check.findByPk(id);
      if (!check) {
        return { error: 'Check not found' };
      }

      await check.destroy();
      return { message: 'Check deleted successfully' };
    } catch (error) {
      logger.error(`Error deleting check ${id}: ${error.stack}`);
      throw error;
    }
  }
}

module.exports = CheckService;
