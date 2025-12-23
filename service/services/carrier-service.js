/* global logger */
const CarrierRepository = require('../repositories/carrier-repository');

class CarrierService {
  constructor() {
    this.carrierRepository = new CarrierRepository();
  }

  /**
   * Get all carriers
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of carriers
   */
  async getCarriers(options = {}) {
    try {
      const carriers = await this.carrierRepository.findAll(options);
      return carriers.map(c => c.toJSON());
    } catch (error) {
      logger.error(`Error fetching carriers: ${error.stack}`);
      throw error;
    }
  }

  /**
   * Get carrier by ID
   * @param {number} id - Carrier ID
   * @returns {Promise<Object>} Carrier or error object
   */
  async getCarrierById(id) {
    try {
      const carrier = await this.carrierRepository.findById(id);

      if (!carrier) {
        return { error: 'Carrier not found' };
      }

      return carrier.toJSON();
    } catch (error) {
      logger.error(`Error fetching carrier ${id}: ${error.stack}`);
      throw error;
    }
  }

  /**
   * Get carrier by code
   * @param {string} code - Carrier code
   * @returns {Promise<Object>} Carrier or error object
   */
  async getCarrierByCode(code) {
    try {
      const carrier = await this.carrierRepository.findByCode(code);

      if (!carrier) {
        return { error: 'Carrier not found' };
      }

      return carrier.toJSON();
    } catch (error) {
      logger.error(`Error fetching carrier with code ${code}: ${error.stack}`);
      throw error;
    }
  }

  /**
   * Get carrier services
   * @param {number} carrierId - Carrier ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Object with carrier and services or error
   */
  async getCarrierServices(carrierId, options = {}) {
    try {
      // First check if carrier exists
      const carrier = await this.carrierRepository.findById(carrierId);

      if (!carrier) {
        return { error: 'Carrier not found' };
      }

      // Get services for this carrier
      const services = await this.carrierRepository.findServicesByCarrierId(carrierId, options);

      return {
        carrier: carrier.toJSON(),
        services: services.map(s => s.toJSON()),
        total: services.length
      };
    } catch (error) {
      logger.error(`Error fetching services for carrier ${carrierId}: ${error.stack}`);
      throw error;
    }
  }

  /**
   * Get count of active carriers
   * @returns {Promise<number>} Count of active carriers
   */
  async getActiveCarriersCount() {
    try {
      return await this.carrierRepository.countActive();
    } catch (error) {
      logger.error(`Error counting active carriers: ${error.stack}`);
      throw error;
    }
  }
}

module.exports = CarrierService;
