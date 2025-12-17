/* global logger */
const AuthService = require('../services/auth-service');
const UserValidator = require('../validators/user-validator');
const ResponseFormatter = require('../helpers/response-formatter');
const AuthPresenter = require('../presenters/auth-presenter');

class AuthController {
  static async register(req, res, next) {
    try {
      const userValidator = new UserValidator('register');
      userValidator.validate(req.body);

      if (!userValidator.isValid) {
        const validationErrors = ResponseFormatter.formatValidationError(userValidator.error, req.id);
        logger.warn(`Validation failed for register: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      const authService = new AuthService();
      const result = await authService.register(userValidator.value);

      if (result.error) {
        logger.warn(`Registration failed: ${result.error}`);
        return res.status(400).send(ResponseFormatter.formatError(result.error, req.id, 400));
      }

      logger.info(`User registered successfully: ${result.email}`);
      const response = AuthPresenter.presentRegisterResponse(result);
      res.status(201).send(ResponseFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in register: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const userValidator = new UserValidator('login');
      userValidator.validate(req.body);

      if (!userValidator.isValid) {
        const validationErrors = ResponseFormatter.formatValidationError(userValidator.error, req.id);
        logger.warn(`Validation failed for login: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      const authService = new AuthService();
      const result = await authService.login(
        userValidator.value.email,
        userValidator.value.password,
        req.ip,
        req.headers['user-agent']
      );

      if (result.error) {
        logger.warn(`Login failed: ${result.error}`);
        return res.status(401).send(ResponseFormatter.formatError(result.error, req.id, 401));
      }

      logger.info(`User logged in successfully: ${result.user.email}`);
      const response = AuthPresenter.presentLoginResponse(result);
      res.status(200).send(ResponseFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in login: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async refreshToken(req, res, next) {
    try {
      const userValidator = new UserValidator('refreshToken');
      userValidator.validate(req.body);

      if (!userValidator.isValid) {
        const validationErrors = ResponseFormatter.formatValidationError(userValidator.error, req.id);
        logger.warn(`Validation failed for refreshToken: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      const authService = new AuthService();
      const result = await authService.refreshToken(userValidator.value.refresh_token);

      if (result.error) {
        logger.warn(`Token refresh failed: ${result.error}`);
        return res.status(401).send(ResponseFormatter.formatError(result.error, req.id, 401));
      }

      logger.info(`Token refreshed successfully`);
      const response = AuthPresenter.presentRefreshResponse(result);
      res.status(200).send(ResponseFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in refreshToken: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async logout(req, res, next) {
    try {
      if (!req.user || !req.user.jti) {
        logger.warn(`Logout failed: no JWT found`);
        return res.status(401).send(ResponseFormatter.formatError('Unauthorized', req.id, 401));
      }

      const authService = new AuthService();
      await authService.logout(req.user.jti);

      logger.info(`User logged out successfully`);
      const response = AuthPresenter.presentLogoutResponse();
      res.status(200).send(ResponseFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in logout: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async forgotPassword(req, res, next) {
    try {
      const userValidator = new UserValidator('forgotPassword');
      userValidator.validate(req.body);

      if (!userValidator.isValid) {
        const validationErrors = ResponseFormatter.formatValidationError(userValidator.error, req.id);
        logger.warn(`Validation failed for forgotPassword: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      const authService = new AuthService();
      await authService.forgotPassword(userValidator.value.email);

      logger.info(`Forgot password request processed`);
      const response = AuthPresenter.presentPasswordResetRequest();
      res.status(200).send(ResponseFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in forgotPassword: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async resetPassword(req, res, next) {
    try {
      const userValidator = new UserValidator('resetPassword');
      userValidator.validate(req.body);

      if (!userValidator.isValid) {
        const validationErrors = ResponseFormatter.formatValidationError(userValidator.error, req.id);
        logger.warn(`Validation failed for resetPassword: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      const authService = new AuthService();
      const result = await authService.resetPassword(
        userValidator.value.token,
        userValidator.value.new_password
      );

      if (result.error) {
        logger.warn(`Password reset failed: ${result.error}`);
        return res.status(400).send(ResponseFormatter.formatError(result.error, req.id, 400));
      }

      logger.info(`Password reset successfully`);
      const response = AuthPresenter.presentPasswordResetSuccess();
      res.status(200).send(ResponseFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in resetPassword: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async verifyEmail(req, res, next) {
    try {
      const token = req.params.token;

      if (!token) {
        logger.warn(`Email verification failed: no token provided`);
        return res.status(400).send(ResponseFormatter.formatError('Token is required', req.id, 400));
      }

      const authService = new AuthService();
      const result = await authService.verifyEmail(token);

      if (result.error) {
        logger.warn(`Email verification failed: ${result.error}`);
        return res.status(400).send(ResponseFormatter.formatError(result.error, req.id, 400));
      }

      logger.info(`Email verified successfully`);
      const response = AuthPresenter.presentEmailVerificationSuccess();
      res.status(200).send(ResponseFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in verifyEmail: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }
}

module.exports = AuthController;
