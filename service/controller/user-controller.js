/* global logger */
const UserService = require('../services/user-service');
const UserValidator = require('../validators/user-validator');
const ErrorFormatter = require('../helpers/error-formatter');
const UserPresenter = require('../presenters/user-presenter');

class UserController {
  static async getProfile(req, res, next) {
    try {
      if (!req.user || !req.user.userId) {
        logger.warn(`Get profile failed: no user in request`);
        return res.status(401).send(ErrorFormatter.formatError('Unauthorized', req.id, 401));
      }

      const userService = new UserService();
      const user = await userService.getUserById(req.user.userId);

      if (user.error) {
        logger.warn(`User not found with id: ${req.user.userId}`);
        return res.status(404).send(ErrorFormatter.formatError(user.error, req.id, 404));
      }

      logger.info(`Successfully fetched profile for user: ${req.user.userId}`);
      const response = UserPresenter.present(user);
      res.status(200).send(ErrorFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in getProfile: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      if (!req.user || !req.user.userId) {
        logger.warn(`Update profile failed: no user in request`);
        return res.status(401).send(ErrorFormatter.formatError('Unauthorized', req.id, 401));
      }

      const userValidator = new UserValidator('update');
      userValidator.validate(req.body);

      if (!userValidator.isValid) {
        const validationErrors = ErrorFormatter.formatValidationError(userValidator.error, req.id);
        logger.warn(`Validation failed for updateProfile: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      const userService = new UserService();
      const user = await userService.updateUser(req.user.userId, userValidator.value);

      if (user.error) {
        logger.warn(`User not found with id: ${req.user.userId}`);
        return res.status(404).send(ErrorFormatter.formatError(user.error, req.id, 404));
      }

      logger.info(`Successfully updated profile for user: ${req.user.userId}`);
      const response = UserPresenter.present(user);
      res.status(200).send(ErrorFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in updateProfile: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async changePassword(req, res, next) {
    try {
      if (!req.user || !req.user.userId) {
        logger.warn(`Change password failed: no user in request`);
        return res.status(401).send(ErrorFormatter.formatError('Unauthorized', req.id, 401));
      }

      const userValidator = new UserValidator('changePassword');
      userValidator.validate(req.body);

      if (!userValidator.isValid) {
        const validationErrors = ErrorFormatter.formatValidationError(userValidator.error, req.id);
        logger.warn(`Validation failed for changePassword: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      const userService = new UserService();
      const result = await userService.changePassword(
        req.user.userId,
        userValidator.value.current_password,
        userValidator.value.new_password
      );

      if (result.error) {
        logger.warn(`Password change failed: ${result.error}`);
        return res.status(400).send(ErrorFormatter.formatError(result.error, req.id, 400));
      }

      logger.info(`Successfully changed password for user: ${req.user.userId}`);
      const response = { message: 'Password changed successfully' };
      res.status(200).send(ErrorFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in changePassword: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async deleteAccount(req, res, next) {
    try {
      if (!req.user || !req.user.userId) {
        logger.warn(`Delete account failed: no user in request`);
        return res.status(401).send(ErrorFormatter.formatError('Unauthorized', req.id, 401));
      }

      const userService = new UserService();
      const result = await userService.deleteUser(req.user.userId);

      if (result.error) {
        logger.warn(`User not found with id: ${req.user.userId}`);
        return res.status(404).send(ErrorFormatter.formatError(result.error, req.id, 404));
      }

      logger.info(`Successfully deleted account for user: ${req.user.userId}`);
      const response = { message: 'Account deleted successfully' };
      res.status(200).send(ErrorFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in deleteAccount: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }
}

module.exports = UserController;
