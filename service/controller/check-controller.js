/* global logger */
const CheckService = require('../services/check-service');
const CheckValidator = require('../validators/check-validator');
const ErrorFormatter = require('../helpers/error-formatter');
const { WorkerJobs } = require('@shipsmart/constants');
const { getWorkerProducer } = require('../workers/utils/producer');

class CheckController {
  static async getAllChecks(req, res, next) {
    try {
      const checkService = new CheckService();
      const checks = await checkService.getAllChecks();
      logger.info(`[${req.id}] Successfully fetched ${checks.length} checks`);
      res.status(200).send(ErrorFormatter.formatSuccess(checks, req.id));
    } catch (error) {
      logger.error(`[${req.id}] Exception in getAllChecks: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async getCheckById(req, res, next) {
    try {
      const checkValidator = new CheckValidator('get');
      checkValidator.validate({ id: parseInt(req.params.id, 10) });

      if (!checkValidator.isValid) {
        const validationErrors = ErrorFormatter.formatValidationError(checkValidator.error, req.id);
        logger.warn(`[${req.id}] Validation failed for getCheckById: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      const checkService = new CheckService();
      const check = await checkService.getCheckById(req.params.id);

      if (check.error) {
        logger.warn(`[${req.id}] Check not found with id: ${req.params.id}`);
        return res.status(404).send(ErrorFormatter.formatError(check.error, req.id, 404));
      }

      logger.info(`[${req.id}] Successfully fetched check with id: ${req.params.id}`);
      res.status(200).send(ErrorFormatter.formatSuccess(check, req.id));
    } catch (error) {
      logger.error(`[${req.id}] Exception in getCheckById: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async createCheck(req, res, next) {
    try {
      const checkValidator = new CheckValidator('create');
      checkValidator.validate(req.body);

      if (!checkValidator.isValid) {
        const validationErrors = ErrorFormatter.formatValidationError(checkValidator.error, req.id);
        logger.warn(`[${req.id}] Validation failed for createCheck: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      const CheckWorker = getWorkerProducer(WorkerJobs.CHECK_CREATION);
      const job = await CheckWorker.publishMessage({
        checkData: checkValidator.value,
        requestId: req.id,
      });

      logger.info(`[${req.id}] Check creation job queued with job id: ${job.id}`);
      res.status(202).send(ErrorFormatter.formatSuccess({
        message: 'Check creation job queued',
        job_id: job.id,
      }, req.id));
    } catch (error) {
      logger.error(`[${req.id}] Exception in createCheck: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async updateCheck(req, res, next) {
    try {
      const checkValidator = new CheckValidator('update');
      checkValidator.validate({ id: parseInt(req.params.id, 10), ...req.body });

      if (!checkValidator.isValid) {
        const validationErrors = ErrorFormatter.formatValidationError(checkValidator.error, req.id);
        logger.warn(`[${req.id}] Validation failed for updateCheck: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      const checkService = new CheckService();
      const check = await checkService.updateCheck(req.params.id, checkValidator.value);

      if (check.error) {
        logger.warn(`[${req.id}] Check not found with id: ${req.params.id}`);
        return res.status(404).send(ErrorFormatter.formatError(check.error, req.id, 404));
      }

      logger.info(`[${req.id}] Successfully updated check with id: ${req.params.id}`);
      res.status(200).send(ErrorFormatter.formatSuccess(check, req.id));
    } catch (error) {
      logger.error(`[${req.id}] Exception in updateCheck: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async deleteCheck(req, res, next) {
    try {
      const checkValidator = new CheckValidator('get');
      checkValidator.validate({ id: parseInt(req.params.id, 10) });

      if (!checkValidator.isValid) {
        const validationErrors = ErrorFormatter.formatValidationError(checkValidator.error, req.id);
        logger.warn(`[${req.id}] Validation failed for deleteCheck: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      const checkService = new CheckService();
      const result = await checkService.deleteCheck(req.params.id);

      if (result.error) {
        logger.warn(`[${req.id}] Check not found with id: ${req.params.id}`);
        return res.status(404).send(ErrorFormatter.formatError(result.error, req.id, 404));
      }

      logger.info(`[${req.id}] Successfully deleted check with id: ${req.params.id}`);
      res.status(200).send(ErrorFormatter.formatSuccess(result, req.id));
    } catch (error) {
      logger.error(`[${req.id}] Exception in deleteCheck: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }
}

module.exports = CheckController;
