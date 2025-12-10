/* global logger */
const AddressRepository = require('../repositories/address-repository');

class AddressService {
  constructor() {
    this.addressRepository = new AddressRepository();
  }

  async getAddressesByUserId(userId) {
    try {
      const addresses = await this.addressRepository.findByUserId(userId);
      return addresses;
    } catch (error) {
      logger.error(`Error fetching addresses for user ${userId}: ${error.stack}`);
      throw error;
    }
  }

  async getAddressById(id, userId) {
    try {
      const address = await this.addressRepository.findByIdAndUserId(id, userId);
      if (!address) {
        return { error: 'Address not found' };
      }
      return address;
    } catch (error) {
      logger.error(`Error fetching address ${id}: ${error.stack}`);
      throw error;
    }
  }

  async createAddress(data) {
    try {
      if (data.is_default) {
        await this.addressRepository.unsetAllDefaults(data.user_id);
      }

      const address = await this.addressRepository.create(data);
      return address;
    } catch (error) {
      logger.error(`Error creating address: ${error.stack}`);
      throw error;
    }
  }

  async updateAddress(id, userId, data) {
    try {
      const address = await this.addressRepository.findByIdAndUserId(id, userId);
      if (!address) {
        return { error: 'Address not found' };
      }

      if (data.is_default) {
        await this.addressRepository.unsetAllDefaults(userId);
      }

      const updatedAddress = await this.addressRepository.update(id, data);
      return updatedAddress;
    } catch (error) {
      logger.error(`Error updating address ${id}: ${error.stack}`);
      throw error;
    }
  }

  async deleteAddress(id, userId) {
    try {
      const address = await this.addressRepository.findByIdAndUserId(id, userId);
      if (!address) {
        return { error: 'Address not found' };
      }

      return await this.addressRepository.delete(id);
    } catch (error) {
      logger.error(`Error deleting address ${id}: ${error.stack}`);
      throw error;
    }
  }

  async setDefaultAddress(id, userId) {
    try {
      const address = await this.addressRepository.findByIdAndUserId(id, userId);
      if (!address) {
        return { error: 'Address not found' };
      }

      const result = await this.addressRepository.setDefault(id, userId);
      return result;
    } catch (error) {
      logger.error(`Error setting default address ${id}: ${error.stack}`);
      throw error;
    }
  }
}

module.exports = AddressService;
