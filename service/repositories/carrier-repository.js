const { Carrier, CarrierService } = require('../models');

class CarrierRepository {
  
  async findAll(options = {}) {
    const where = {};

    if (options.active_only !== false) {
      where.is_active = true;
    }

    return await Carrier.findAll({
      where,
      attributes: ['id', 'name', 'code', 'logo_url', 'auth_type', 'required_credentials'],
      order: [['name', 'ASC']],
      limit: options.limit,
      offset: options.offset,
    });
  }

  
  async findById(id, activeOnly = true) {
    const where = { id };

    if (activeOnly) {
      where.is_active = true;
    }

    return await Carrier.findOne({
      where,
      attributes: ['id', 'name', 'code', 'logo_url', 'auth_type', 'required_credentials']
    });
  }

  
  async findByCode(code, activeOnly = true) {
    const where = { code };

    if (activeOnly) {
      where.is_active = true;
    }

    return await Carrier.findOne({
      where,
      attributes: ['id', 'name', 'code', 'logo_url', 'auth_type', 'required_credentials']
    });
  }

  
  async findServicesByCarrierId(carrierId, options = {}) {
    const where = { carrier_id: carrierId };

    if (options.active_only !== false) {
      where.is_active = true;
    }

    if (options.category) {
      where.category = options.category;
    }

    return await CarrierService.findAll({
      where,
      attributes: ['id', 'service_code', 'service_name', 'description', 'category'],
      order: [['category', 'ASC'], ['service_name', 'ASC']]
    });
  }

  
  async countActive() {
    return await Carrier.count({
      where: { is_active: true }
    });
  }
}

module.exports = CarrierRepository;
