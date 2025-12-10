/* global logger */
const CarrierCredentialService = require('../services/carrier-credential-service');
const CarrierCredentialValidator = require('../validators/carrier-credential-validator');
const ErrorFormatter = require('../helpers/error-formatter');
const CarrierCredentialPresenter = require('../presenters/carrier-credential-presenter');

class CarrierCredentialController {
  static async getCredentials(req, res, next) {
    try {
      if (!req.user || !req.user.userId) {
        logger.warn(`Get credentials failed: no user in request`);
        return res.status(401).send(ErrorFormatter.formatError('Unauthorized', req.id, 401));
      }

      const credentialService = new CarrierCredentialService();
      const credentials = await credentialService.getCredentialsByUserId(req.user.userId);

      logger.info(`Successfully fetched ${credentials.length} credentials for user: ${req.user.userId}`);
      const response = CarrierCredentialPresenter.presentCollection(credentials);
      res.status(200).send(ErrorFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in getCredentials: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async getCredentialById(req, res, next) {
    try {
      if (!req.user || !req.user.userId) {
        logger.warn(`Get credential failed: no user in request`);
        return res.status(401).send(ErrorFormatter.formatError('Unauthorized', req.id, 401));
      }

      const credentialValidator = new CarrierCredentialValidator('get');
      credentialValidator.validate({ id: parseInt(req.params.id, 10) });

      if (!credentialValidator.isValid) {
        const validationErrors = ErrorFormatter.formatValidationError(credentialValidator.error, req.id);
        logger.warn(`Validation failed for getCredentialById: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      const credentialService = new CarrierCredentialService();
      const credential = await credentialService.getCredentialById(req.params.id, req.user.userId);

      if (credential.error) {
        logger.warn(`Credential not found with id: ${req.params.id}`);
        return res.status(404).send(ErrorFormatter.formatError(credential.error, req.id, 404));
      }

      logger.info(`Successfully fetched credential with id: ${req.params.id}`);
      const response = CarrierCredentialPresenter.presentWithCredentials(credential);
      res.status(200).send(ErrorFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in getCredentialById: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async createCredential(req, res, next) {
    try {
      if (!req.user || !req.user.userId) {
        logger.warn(`Create credential failed: no user in request`);
        return res.status(401).send(ErrorFormatter.formatError('Unauthorized', req.id, 401));
      }

      const credentialValidator = new CarrierCredentialValidator('create');
      credentialValidator.validate(req.body);

      if (!credentialValidator.isValid) {
        const validationErrors = ErrorFormatter.formatValidationError(credentialValidator.error, req.id);
        logger.warn(`Validation failed for createCredential: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      const credentialService = new CarrierCredentialService();
      const credential = await credentialService.createCredential({
        ...credentialValidator.value,
        user_id: req.user.userId,
      });

      if (credential.error) {
        logger.warn(`Create credential failed: ${credential.error}`);
        return res.status(400).send(ErrorFormatter.formatError(credential.error, req.id, 400));
      }

      logger.info(`Successfully created ${credential.carrier} credential for user: ${req.user.userId}`);
      const response = CarrierCredentialPresenter.presentWithCredentials(credential);
      res.status(201).send(ErrorFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in createCredential: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async updateCredential(req, res, next) {
    try {
      if (!req.user || !req.user.userId) {
        logger.warn(`Update credential failed: no user in request`);
        return res.status(401).send(ErrorFormatter.formatError('Unauthorized', req.id, 401));
      }

      const credentialValidator = new CarrierCredentialValidator('update');
      credentialValidator.validate({ id: parseInt(req.params.id, 10), ...req.body });

      if (!credentialValidator.isValid) {
        const validationErrors = ErrorFormatter.formatValidationError(credentialValidator.error, req.id);
        logger.warn(`Validation failed for updateCredential: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      const credentialService = new CarrierCredentialService();
      const credential = await credentialService.updateCredential(req.params.id, req.user.userId, credentialValidator.value);

      if (credential.error) {
        logger.warn(`Credential not found with id: ${req.params.id}`);
        return res.status(404).send(ErrorFormatter.formatError(credential.error, req.id, 404));
      }

      logger.info(`Successfully updated credential with id: ${req.params.id}`);
      const response = CarrierCredentialPresenter.presentWithCredentials(credential);
      res.status(200).send(ErrorFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in updateCredential: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async deleteCredential(req, res, next) {
    try {
      if (!req.user || !req.user.userId) {
        logger.warn(`Delete credential failed: no user in request`);
        return res.status(401).send(ErrorFormatter.formatError('Unauthorized', req.id, 401));
      }

      const credentialValidator = new CarrierCredentialValidator('get');
      credentialValidator.validate({ id: parseInt(req.params.id, 10) });

      if (!credentialValidator.isValid) {
        const validationErrors = ErrorFormatter.formatValidationError(credentialValidator.error, req.id);
        logger.warn(`Validation failed for deleteCredential: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      const credentialService = new CarrierCredentialService();
      const result = await credentialService.deleteCredential(req.params.id, req.user.userId);

      if (result.error) {
        logger.warn(`Credential not found with id: ${req.params.id}`);
        return res.status(404).send(ErrorFormatter.formatError(result.error, req.id, 404));
      }

      logger.info(`Successfully deleted credential with id: ${req.params.id}`);
      const response = { message: 'Credential deleted successfully' };
      res.status(200).send(ErrorFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in deleteCredential: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async validateCredential(req, res, next) {
    try {
      if (!req.user || !req.user.userId) {
        logger.warn(`Validate credential failed: no user in request`);
        return res.status(401).send(ErrorFormatter.formatError('Unauthorized', req.id, 401));
      }

      const credentialValidator = new CarrierCredentialValidator('get');
      credentialValidator.validate({ id: parseInt(req.params.id, 10) });

      if (!credentialValidator.isValid) {
        const validationErrors = ErrorFormatter.formatValidationError(credentialValidator.error, req.id);
        logger.warn(`Validation failed for validateCredential: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      const credentialService = new CarrierCredentialService();
      const result = await credentialService.validateCredential(req.params.id, req.user.userId);

      if (result.error) {
        logger.warn(`Credential not found with id: ${req.params.id}`);
        return res.status(404).send(ErrorFormatter.formatError(result.error, req.id, 404));
      }

      logger.info(`Successfully validated credential with id: ${req.params.id}`);
      const response = {
        is_valid: result.is_valid,
        message: result.message || 'Credential validation completed'
      };
      res.status(200).send(ErrorFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in validateCredential: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }
}

module.exports = CarrierCredentialController;
