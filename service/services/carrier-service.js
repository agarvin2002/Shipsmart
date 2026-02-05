/* global logger */
const CarrierRepository = require('../repositories/carrier-repository');
const NotFoundError = require('../errors/not-found-error');

class CarrierService {
  constructor() {
    this.carrierRepository = new CarrierRepository();
  }

  
  async getCarriers(options = {}) {
    try {
      const carriers = await this.carrierRepository.findAll(options);
      return carriers.map(c => c.toJSON());
    } catch (error) {
      logger.error(`Error fetching carriers: ${error.stack}`);
      throw error;
    }
  }

  
  async getCarrierById(id) {
    try {
      const carrier = await this.carrierRepository.findById(id);

      if (!carrier) {
        throw new NotFoundError('Carrier', 'Carrier not found');
      }

      return carrier.toJSON();
    } catch (error) {
      logger.error(`Error fetching carrier ${id}: ${error.stack}`);
      throw error;
    }
  }

  
  async getCarrierByCode(code) {
    try {
      const carrier = await this.carrierRepository.findByCode(code);

      if (!carrier) {
        throw new NotFoundError('Carrier', 'Carrier not found');
      }

      return carrier.toJSON();
    } catch (error) {
      logger.error(`Error fetching carrier with code ${code}: ${error.stack}`);
      throw error;
    }
  }

  
  async getCarrierServices(carrierId, options = {}) {
    try {
      // First check if carrier exists
      const carrier = await this.carrierRepository.findById(carrierId);

      if (!carrier) {
        throw new NotFoundError('Carrier', 'Carrier not found');
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
