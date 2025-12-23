const { Carrier, CarrierService } = require('../models');

class CarrierRepository {
  /**
   * Find all carriers
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of carriers
   */
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

  /**
   * Find carrier by ID
   * @param {number} id - Carrier ID
   * @param {boolean} activeOnly - Only return active carriers
   * @returns {Promise<Object|null>} Carrier or null
   */
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

  /**
   * Find carrier by code
   * @param {string} code - Carrier code (e.g., 'ups', 'fedex')
   * @param {boolean} activeOnly - Only return active carriers
   * @returns {Promise<Object|null>} Carrier or null
   */
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

  /**
   * Find carrier services by carrier ID
   * @param {number} carrierId - Carrier ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of carrier services
   */
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

  /**
   * Count active carriers
   * @returns {Promise<number>} Count of active carriers
   */
  async countActive() {
    return await Carrier.count({
      where: { is_active: true }
    });
  }
}

module.exports = CarrierRepository;
