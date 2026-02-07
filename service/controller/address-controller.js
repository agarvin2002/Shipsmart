/* global logger */
const AddressService = require('../services/address-service');
const AddressValidator = require('../validators/address-validator');
const { ResponseFormatter } = require('@shipsmart/http');
const AddressPresenter = require('../presenters/address-presenter');

class AddressController {
  static async getAddresses(req, res, next) {
    try {
      const { type, default: isDefault } = req.query;
      const addressService = new AddressService();
      let result;
      let logMessage;

      // Get default source address
      if (isDefault === 'true') {
        const address = await addressService.getDefaultSourceAddress(req.user.userId);
        if (!address) {
          logger.warn(`No default source address found for user: ${req.user.userId}`);
          return res.status(404).send(ResponseFormatter.formatError('No default source address found', req.id, 404));
        }
        logMessage = 'default source address';
        result = AddressPresenter.present(address);
      }
      // Get addresses by type
      else if (type === 'source') {
        const addresses = await addressService.getSourceAddresses(req.user.userId);
        logMessage = `${addresses.length} source addresses`;
        result = AddressPresenter.presentCollection(addresses);
      } else if (type === 'destination') {
        const addresses = await addressService.getDestinationAddresses(req.user.userId);
        logMessage = `${addresses.length} destination addresses`;
        result = AddressPresenter.presentCollection(addresses);
      }
      // Get all addresses
      else {
        const addresses = await addressService.getAddressesByUserId(req.user.userId);
        logMessage = `${addresses.length} addresses`;
        result = AddressPresenter.presentCollection(addresses);
      }

      logger.info(`Successfully fetched ${logMessage} for user: ${req.user.userId}`);
      res.status(200).send(ResponseFormatter.formatSuccess(result, req.id));
    } catch (error) {
      logger.error(`Exception in getAddresses: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async getAddressById(req, res, next) {
    try {
      const addressValidator = new AddressValidator('get');
      addressValidator.validate({ id: parseInt(req.params.id, 10) });

      if (!addressValidator.isValid) {
        const validationErrors = ResponseFormatter.formatValidationError(addressValidator.error, req.id);
        logger.warn(`Validation failed for getAddressById: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      const addressService = new AddressService();
      const address = await addressService.getAddressById(req.params.id, req.user.userId);

      if (address.error) {
        logger.warn(`Address not found with id: ${req.params.id}`);
        return res.status(404).send(ResponseFormatter.formatError(address.error, req.id, 404));
      }

      logger.info(`Successfully fetched address with id: ${req.params.id}`);
      const response = AddressPresenter.present(address);
      res.status(200).send(ResponseFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in getAddressById: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async createAddress(req, res, next) {
    try {
      const addressValidator = new AddressValidator('create');
      addressValidator.validate(req.body);

      if (!addressValidator.isValid) {
        const validationErrors = ResponseFormatter.formatValidationError(addressValidator.error, req.id);
        logger.warn(`Validation failed for createAddress: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      const addressService = new AddressService();
      const address = await addressService.createAddress({
        ...addressValidator.value,
        user_id: req.user.userId,
      });

      logger.info(`Successfully created address for user: ${req.user.userId}`);
      const response = AddressPresenter.present(address);
      res.status(201).send(ResponseFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in createAddress: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async updateAddress(req, res, next) {
    try {
      const addressValidator = new AddressValidator('update');
      addressValidator.validate({ id: parseInt(req.params.id, 10), ...req.body });

      if (!addressValidator.isValid) {
        const validationErrors = ResponseFormatter.formatValidationError(addressValidator.error, req.id);
        logger.warn(`Validation failed for updateAddress: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      const addressService = new AddressService();
      const address = await addressService.updateAddress(req.params.id, req.user.userId, addressValidator.value);

      if (address.error) {
        logger.warn(`Address not found with id: ${req.params.id}`);
        return res.status(404).send(ResponseFormatter.formatError(address.error, req.id, 404));
      }

      logger.info(`Successfully updated address with id: ${req.params.id}`);
      const response = AddressPresenter.present(address);
      res.status(200).send(ResponseFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in updateAddress: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async deleteAddress(req, res, next) {
    try {
      const addressValidator = new AddressValidator('get');
      addressValidator.validate({ id: parseInt(req.params.id, 10) });

      if (!addressValidator.isValid) {
        const validationErrors = ResponseFormatter.formatValidationError(addressValidator.error, req.id);
        logger.warn(`Validation failed for deleteAddress: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      const addressService = new AddressService();
      const result = await addressService.deleteAddress(req.params.id, req.user.userId);

      if (result.error) {
        logger.warn(`Address not found with id: ${req.params.id}`);
        return res.status(404).send(ResponseFormatter.formatError(result.error, req.id, 404));
      }

      logger.info(`Successfully deleted address with id: ${req.params.id}`);
      const response = { message: 'Address deleted successfully' };
      res.status(200).send(ResponseFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in deleteAddress: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async setDefaultAddress(req, res, next) {
    try {
      const addressValidator = new AddressValidator('get');
      addressValidator.validate({ id: parseInt(req.params.id, 10) });

      if (!addressValidator.isValid) {
        const validationErrors = ResponseFormatter.formatValidationError(addressValidator.error, req.id);
        logger.warn(`Validation failed for setDefaultAddress: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      const addressService = new AddressService();
      const address = await addressService.setDefaultAddress(req.params.id, req.user.userId);

      if (address.error) {
        logger.warn(`Failed to set default address: ${address.error}`);
        return res.status(400).send(ResponseFormatter.formatError(address.error, req.id, 400));
      }

      logger.info(`Successfully set default address with id: ${req.params.id}`);
      const response = AddressPresenter.present(address);
      res.status(200).send(ResponseFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in setDefaultAddress: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }
}

module.exports = AddressController;
