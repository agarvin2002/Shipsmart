/* global logger */
const ExcelRateService = require('../services/excel-rate-service');
const { ResponseFormatter } = require('@shipsmart/http');
const { WorkerJobs } = require('@shipsmart/constants');
const { getWorkerProducer } = require('../workers/utils/producer');
const { ValidationError } = require('@shipsmart/errors');

class ExcelRateController {
  /**
   * Upload Excel file for async rate comparison
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {Function} next - Express next middleware
   */
  static async uploadExcel(req, res, next) {
    try {
      // Validate file presence
      if (!req.file) {
        throw new ValidationError('No file uploaded. Please attach an Excel file.');
      }

      // Validate file extension
      ExcelRateService.validateFileExtension(req.file.originalname);

      // Queue async job
      const ExcelRateFetchWorker = getWorkerProducer(WorkerJobs.EXCEL_RATE_FETCH);

      const job = await ExcelRateFetchWorker.publishMessage({
        fileBuffer: req.file.buffer,
        originalFilename: req.file.originalname,
        userId: req.user.userId,
        requestId: req.id,
      });

      logger.info(`Excel rate fetch job queued for user: ${req.user.userId}, job_id: ${job.id}`);

      return res.status(202).send(ResponseFormatter.formatSuccess({
        message: 'Excel rate comparison job queued',
        job_id: job.id,
      }, req.id));
    } catch (error) {
      logger.error(`Exception in uploadExcel: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  /**
   * Get Excel rate job status
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {Function} next - Express next middleware
   */
  static async getJobStatus(req, res, next) {
    try {
      const { jobId } = req.params;

      const response = await ExcelRateService.getJobStatus(jobId, req.user.userId);

      logger.info(`Job status retrieved: ${jobId}, state: ${response.state}`);
      return res.status(200).send(
        ResponseFormatter.formatSuccess(response, req.id)
      );
    } catch (error) {
      logger.error(`Exception in getJobStatus: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }

  /**
   * Download result Excel file
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {Function} next - Express next middleware
   */
  static async downloadResult(req, res, next) {
    try {
      const { jobId } = req.params;

      const downloadUrl = await ExcelRateService.getDownloadUrlByJobId(
        jobId,
        req.user.userId
      );

      // Redirect to signed S3 URL
      return res.redirect(downloadUrl);
    } catch (error) {
      logger.error(`Exception in downloadResult: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }
}

module.exports = ExcelRateController;
