/* global logger */
const CheckService = require('../services/check-service');
const CheckValidator = require('../validators/check-validator');
const ResponseFormatter = require('../helpers/response-formatter');
const { WorkerJobs } = require('@shipsmart/constants');
const { getWorkerProducer } = require('../workers/utils/producer');

class CheckController {
  static async getAllChecks(req, res, next) {
    try {
      const checkService = new CheckService();
      const checks = await checkService.getAllChecks();
      logger.info(`Successfully fetched ${checks.length} checks`);
      res.status(200).send(ResponseFormatter.formatSuccess(checks, req.id));
    } catch (error) {
      logger.error(`Exception in getAllChecks: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async getCheckById(req, res, next) {
    try {
      const checkValidator = new CheckValidator('get');
      checkValidator.validate({ id: parseInt(req.params.id, 10) });

      if (!checkValidator.isValid) {
        const validationErrors = ResponseFormatter.formatValidationError(checkValidator.error, req.id);
        logger.warn(`Validation failed for getCheckById: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      const checkService = new CheckService();
      const check = await checkService.getCheckById(req.params.id);

      if (check.error) {
        logger.warn(`Check not found with id: ${req.params.id}`);
        return res.status(404).send(ResponseFormatter.formatError(check.error, req.id, 404));
      }

      logger.info(`Successfully fetched check with id: ${req.params.id}`);
      res.status(200).send(ResponseFormatter.formatSuccess(check, req.id));
    } catch (error) {
      logger.error(`Exception in getCheckById: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async createCheck(req, res, next) {
    try {
      const checkValidator = new CheckValidator('create');
      checkValidator.validate(req.body);

      if (!checkValidator.isValid) {
        const validationErrors = ResponseFormatter.formatValidationError(checkValidator.error, req.id);
        logger.warn(`Validation failed for createCheck: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      const CheckWorker = getWorkerProducer(WorkerJobs.CHECK_CREATION);
      const job = await CheckWorker.publishMessage({
        checkData: checkValidator.value,
        requestId: req.id,
      });

      logger.info(`Check creation job queued with job id: ${job.id}`);
      res.status(202).send(ResponseFormatter.formatSuccess({
        message: 'Check creation job queued',
        job_id: job.id,
      }, req.id));
    } catch (error) {
      logger.error(`Exception in createCheck: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async updateCheck(req, res, next) {
    try {
      const checkValidator = new CheckValidator('update');
      checkValidator.validate({ id: parseInt(req.params.id, 10), ...req.body });

      if (!checkValidator.isValid) {
        const validationErrors = ResponseFormatter.formatValidationError(checkValidator.error, req.id);
        logger.warn(`Validation failed for updateCheck: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      const checkService = new CheckService();
      const check = await checkService.updateCheck(req.params.id, checkValidator.value);

      if (check.error) {
        logger.warn(`Check not found with id: ${req.params.id}`);
        return res.status(404).send(ResponseFormatter.formatError(check.error, req.id, 404));
      }

      logger.info(`Successfully updated check with id: ${req.params.id}`);
      res.status(200).send(ResponseFormatter.formatSuccess(check, req.id));
    } catch (error) {
      logger.error(`Exception in updateCheck: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async deleteCheck(req, res, next) {
    try {
      const checkValidator = new CheckValidator('get');
      checkValidator.validate({ id: parseInt(req.params.id, 10) });

      if (!checkValidator.isValid) {
        const validationErrors = ResponseFormatter.formatValidationError(checkValidator.error, req.id);
        logger.warn(`Validation failed for deleteCheck: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      const checkService = new CheckService();
      const result = await checkService.deleteCheck(req.params.id);

      if (result.error) {
        logger.warn(`Check not found with id: ${req.params.id}`);
        return res.status(404).send(ResponseFormatter.formatError(result.error, req.id, 404));
      }

      logger.info(`Successfully deleted check with id: ${req.params.id}`);
      res.status(200).send(ResponseFormatter.formatSuccess(result, req.id));
    } catch (error) {
      logger.error(`Exception in deleteCheck: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  static async uploadFile(req, res, next) {
    try {
      if (!req.file) {
        logger.warn(`No file provided in upload request`);
        return res.status(400).send(ResponseFormatter.formatError('No file provided', req.id, 400));
      }

      const folder = req.body.folder || 'uploads';

      logger.info(`Uploading file: ${req.file.originalname}, size: ${req.file.size} bytes`);

      const checkService = new CheckService();
      const result = await checkService.uploadFile(req.file, folder);

      logger.info(`File uploaded successfully: ${result.file.s3_key}`);

      res.status(201).send(ResponseFormatter.formatSuccess(result, req.id));
    } catch (error) {
      logger.error(`Exception in uploadFile: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }
}

module.exports = CheckController;
