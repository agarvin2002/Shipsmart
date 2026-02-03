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

  async getSourceAddresses(userId) {
    try {
      const addresses = await this.addressRepository.findByUserIdAndType(userId, 'source');
      return addresses;
    } catch (error) {
      logger.error(`Error fetching source addresses for user ${userId}: ${error.stack}`);
      throw error;
    }
  }

  async getDestinationAddresses(userId) {
    try {
      const addresses = await this.addressRepository.findByUserIdAndType(userId, 'destination');
      return addresses;
    } catch (error) {
      logger.error(`Error fetching destination addresses for user ${userId}: ${error.stack}`);
      throw error;
    }
  }

  async getDefaultSourceAddress(userId) {
    try {
      const address = await this.addressRepository.findDefaultSource(userId);
      return address;
    } catch (error) {
      logger.error(`Error fetching default source address for user ${userId}: ${error.stack}`);
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
      // Only source addresses can be set as default
      if (data.is_default && data.address_type === 'source') {
        await this.addressRepository.unsetAllDefaultsForType(data.user_id, 'source');
      } else if (data.is_default && data.address_type === 'destination') {
        // Destination addresses cannot have default
        data.is_default = false;
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

      // Only source addresses can be set as default
      if (data.is_default && address.address_type === 'source') {
        await this.addressRepository.unsetAllDefaultsForType(userId, 'source');
      } else if (data.is_default && address.address_type === 'destination') {
        // Destination addresses cannot have default
        data.is_default = false;
      }

      const updatedAddress = await this.addressRepository.update(id, userId, data);
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

      return await this.addressRepository.delete(id, userId);
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

      // Only source addresses can be set as default
      if (address.address_type !== 'source') {
        return { error: 'Only source addresses can be set as default' };
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
