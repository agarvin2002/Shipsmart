/* global logger */
const AddressService = require('../services/address-service');
const AddressValidator = require('../validators/address-validator');
const ErrorFormatter = require('../helpers/error-formatter');
const AddressPresenter = require('../presenters/address-presenter');

class AddressController {
  static async getAddresses(req, res, next) {
    try {
      if (!req.user || !req.user.userId) {
        logger.warn(`Get addresses failed: no user in request`);
        return res.status(401).send(ErrorFormatter.formatError('Unauthorized', req.id, 401));
      }

      const addressService = new AddressService();
      const addresses = await addressService.getAddressesByUserId(req.user.userId);

      logger.info(`Successfully fetched ${addresses.length} addresses for user: ${req.user.userId}`);
      const response = AddressPresenter.presentCollection(addresses);
      res.status(200).send(ErrorFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in getAddresses: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async getAddressById(req, res, next) {
    try {
      if (!req.user || !req.user.userId) {
        logger.warn(`Get address failed: no user in request`);
        return res.status(401).send(ErrorFormatter.formatError('Unauthorized', req.id, 401));
      }

      const addressValidator = new AddressValidator('get');
      addressValidator.validate({ id: parseInt(req.params.id, 10) });

      if (!addressValidator.isValid) {
        const validationErrors = ErrorFormatter.formatValidationError(addressValidator.error, req.id);
        logger.warn(`Validation failed for getAddressById: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      const addressService = new AddressService();
      const address = await addressService.getAddressById(req.params.id, req.user.userId);

      if (address.error) {
        logger.warn(`Address not found with id: ${req.params.id}`);
        return res.status(404).send(ErrorFormatter.formatError(address.error, req.id, 404));
      }

      logger.info(`Successfully fetched address with id: ${req.params.id}`);
      const response = AddressPresenter.present(address);
      res.status(200).send(ErrorFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in getAddressById: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async createAddress(req, res, next) {
    try {
      if (!req.user || !req.user.userId) {
        logger.warn(`Create address failed: no user in request`);
        return res.status(401).send(ErrorFormatter.formatError('Unauthorized', req.id, 401));
      }

      const addressValidator = new AddressValidator('create');
      addressValidator.validate(req.body);

      if (!addressValidator.isValid) {
        const validationErrors = ErrorFormatter.formatValidationError(addressValidator.error, req.id);
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
      res.status(201).send(ErrorFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in createAddress: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async updateAddress(req, res, next) {
    try {
      if (!req.user || !req.user.userId) {
        logger.warn(`Update address failed: no user in request`);
        return res.status(401).send(ErrorFormatter.formatError('Unauthorized', req.id, 401));
      }

      const addressValidator = new AddressValidator('update');
      addressValidator.validate({ id: parseInt(req.params.id, 10), ...req.body });

      if (!addressValidator.isValid) {
        const validationErrors = ErrorFormatter.formatValidationError(addressValidator.error, req.id);
        logger.warn(`Validation failed for updateAddress: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      const addressService = new AddressService();
      const address = await addressService.updateAddress(req.params.id, req.user.userId, addressValidator.value);

      if (address.error) {
        logger.warn(`Address not found with id: ${req.params.id}`);
        return res.status(404).send(ErrorFormatter.formatError(address.error, req.id, 404));
      }

      logger.info(`Successfully updated address with id: ${req.params.id}`);
      const response = AddressPresenter.present(address);
      res.status(200).send(ErrorFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in updateAddress: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async deleteAddress(req, res, next) {
    try {
      if (!req.user || !req.user.userId) {
        logger.warn(`Delete address failed: no user in request`);
        return res.status(401).send(ErrorFormatter.formatError('Unauthorized', req.id, 401));
      }

      const addressValidator = new AddressValidator('get');
      addressValidator.validate({ id: parseInt(req.params.id, 10) });

      if (!addressValidator.isValid) {
        const validationErrors = ErrorFormatter.formatValidationError(addressValidator.error, req.id);
        logger.warn(`Validation failed for deleteAddress: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      const addressService = new AddressService();
      const result = await addressService.deleteAddress(req.params.id, req.user.userId);

      if (result.error) {
        logger.warn(`Address not found with id: ${req.params.id}`);
        return res.status(404).send(ErrorFormatter.formatError(result.error, req.id, 404));
      }

      logger.info(`Successfully deleted address with id: ${req.params.id}`);
      const response = { message: 'Address deleted successfully' };
      res.status(200).send(ErrorFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in deleteAddress: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async setDefaultAddress(req, res, next) {
    try {
      if (!req.user || !req.user.userId) {
        logger.warn(`Set default address failed: no user in request`);
        return res.status(401).send(ErrorFormatter.formatError('Unauthorized', req.id, 401));
      }

      const addressValidator = new AddressValidator('get');
      addressValidator.validate({ id: parseInt(req.params.id, 10) });

      if (!addressValidator.isValid) {
        const validationErrors = ErrorFormatter.formatValidationError(addressValidator.error, req.id);
        logger.warn(`Validation failed for setDefaultAddress: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      const addressService = new AddressService();
      const address = await addressService.setDefaultAddress(req.params.id, req.user.userId);

      if (address.error) {
        logger.warn(`Address not found with id: ${req.params.id}`);
        return res.status(404).send(ErrorFormatter.formatError(address.error, req.id, 404));
      }

      logger.info(`Successfully set default address with id: ${req.params.id}`);
      const response = AddressPresenter.present(address);
      res.status(200).send(ErrorFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in setDefaultAddress: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }
}

module.exports = AddressController;
