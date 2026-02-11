/* global logger */
const RateService = require('../services/rate-service');
const RateValidator = require('../validators/rate-validator');
const RatePresenter = require('../presenters/rate-presenter');
const { ResponseFormatter } = require('@shipsmart/http');
const { WorkerJobs } = require('@shipsmart/constants');
const { getWorkerProducer } = require('../workers/utils/producer');
const workerClient = require('../worker-client');

class RateController {
  
  static async getRates(req, res, next) {
    try {
      // Validate request
      const rateValidator = new RateValidator('getRates');
      rateValidator.validate(req.body);

      if (!rateValidator.isValid) {
        const validationErrors = ResponseFormatter.formatValidationError(rateValidator.error, req.id);
        logger.warn(`Validation failed for getRates: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      // Check for async mode
      const isAsync = req.query.async === 'true';

      if (isAsync) {
        // ASYNC MODE: Queue job
        const RateFetchWorker = getWorkerProducer(WorkerJobs.RATE_FETCH);

        const job = await RateFetchWorker.publishMessage({
          shipmentData: rateValidator.value,
          userId: req.user.userId,
          requestId: req.id,
          options: {
            forceRefresh: req.query.forceRefresh !== 'false',  // Allow ?forceRefresh=false
          }
        });

        logger.info(`Rate fetch job queued for user: ${req.user.userId}, job_id: ${job.id}`);
        return res.status(202).send(ResponseFormatter.formatSuccess({
          message: 'Rate fetch job queued',
          job_id: job.id,
        }, req.id));
      } else {
        // SYNC MODE: Existing flow
        // Call service
        const rateService = new RateService();
        const rateComparison = await rateService.getRates(req.user.userId, rateValidator.value);

        // Present response
        logger.info(`Successfully fetched ${rateComparison.total_rates} rates for user: ${req.user.userId}`);
        const response = RatePresenter.presentComparison(rateComparison);
        res.status(200).send(ResponseFormatter.formatSuccess(response, req.id));
      }
    } catch (error) {
      logger.error(`Exception in getRates: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  
  static async compareRates(req, res, next) {
    try {
      // Validate request
      const rateValidator = new RateValidator('getRates');
      rateValidator.validate(req.body);

      if (!rateValidator.isValid) {
        const validationErrors = ResponseFormatter.formatValidationError(rateValidator.error, req.id);
        logger.warn(`Validation failed for compareRates: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      // Call service
      const rateService = new RateService();
      const rateComparison = await rateService.compareRates(req.user.userId, rateValidator.value);

      // Present response
      logger.info(`Successfully compared rates for user: ${req.user.userId}`);
      const response = RatePresenter.presentComparison(rateComparison);
      res.status(200).send(ResponseFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in compareRates: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }


  static async getRateHistory(req, res, next) {
    try {
      // Validate query parameters
      const rateValidator = new RateValidator('getRateHistory');
      rateValidator.validate(req.query);

      if (!rateValidator.isValid) {
        const validationErrors = ResponseFormatter.formatValidationError(rateValidator.error, req.id);
        logger.warn(`Validation failed for getRateHistory: ${JSON.stringify(validationErrors.error.details)}`);
        return res.status(400).send(validationErrors);
      }

      // Call service
      const rateService = new RateService();
      const history = await rateService.getRateHistory(req.user.userId, rateValidator.value);

      // Present response
      logger.info(`Successfully fetched rate history for user: ${req.user.userId}`);
      const response = RatePresenter.presentHistory(history);
      res.status(200).send(ResponseFormatter.formatSuccess(response, req.id));
    } catch (error) {
      logger.error(`Exception in getRateHistory: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }


  static async getJobStatus(req, res, next) {
    try {
      const { jobId } = req.params;

      // Get queue
      const queue = workerClient.getQueue(WorkerJobs.RATE_FETCH);

      // Get job
      const job = await queue.getJob(jobId);

      if (!job) {
        logger.warn(`Job not found: ${jobId}`);
        return res.status(404).send(
          ResponseFormatter.formatError('Job not found', req.id)
        );
      }

      // SECURITY: Verify job ownership
      if (!job.data || job.data.userId !== req.user.userId) {
        logger.warn(`Unauthorized job access attempt by user ${req.user.userId} for job ${jobId}`);
        return res.status(403).send(
          ResponseFormatter.formatError('Forbidden: You do not have access to this job', req.id)
        );
      }

      // Get job state
      const state = await job.getState();
      const progress = job.progress();

      const response = {
        job_id: job.id,
        state, // 'waiting', 'active', 'completed', 'failed'
        progress,
        created_at: job.timestamp,
      };

      // If completed, include results
      if (state === 'completed') {
        const result = job.returnvalue;
        if (result && result.rates) {
          response.data = RatePresenter.presentComparison(result.rates);
        }
      }

      // If failed, include error (without stack trace for security)
      if (state === 'failed') {
        response.error = job.failedReason || 'Job processing failed';
        // Log full details server-side only
        logger.error(`Job ${jobId} failed for user ${req.user.userId}`, {
          failedReason: job.failedReason,
          stackTrace: job.stacktrace,
          jobData: job.data
        });
      }

      logger.info(`Job status retrieved: ${jobId}, state: ${state}`);
      return res.status(200).send(
        ResponseFormatter.formatSuccess(response, req.id)
      );
    } catch (error) {
      logger.error(`Exception in getJobStatus: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }
}

module.exports = RateController;
