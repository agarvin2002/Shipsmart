/* global logger */
const Joi = require('@hapi/joi');
const ExcelRateService = require('../../services/excel-rate-service');
const ExcelRateJobRepository = require('../../repositories/excel-rate-job-repository');
const { namespace } = require('../../models');
const { excelRateFetchJobSchema } = require('../validation/excel-rate-fetch-job-schema');
const { EXCEL_JOB_STATUS } = require('@shipsmart/constants');

class ExcelRateFetchConsumer {
  static async perform(job) {
    try {
      return await namespace.run(async () => {
        try {
          // Validate job data
          const { error, value } = Joi.validate(job.data, excelRateFetchJobSchema);

          if (error) {
            const errorMsg = `Invalid job data: ${error.message}`;
            logger.error(errorMsg, { jobId: job.id, validationError: error.details });
            return { success: false, error: errorMsg };
          }

          const { fileBuffer, originalFilename, userId, requestId } = value;

          namespace.set('requestId', requestId);
          namespace.set('userId', userId);

          logger.info(`[${requestId}] Processing Excel rate fetch job for user ${userId}`);

          // Update progress
          job.progress(10);

          // Convert fileBuffer to Buffer (handles both Buffer and serialized {type, data} formats)
          const buffer = Buffer.isBuffer(fileBuffer)
            ? fileBuffer
            : Buffer.from(fileBuffer.data || fileBuffer);

          // Process Excel rates
          const result = await ExcelRateService.processExcelRates(
            buffer,
            originalFilename,
            userId,
            requestId,
            job.id
          );

          // Update progress
          job.progress(100);

          logger.info(`[${requestId}] Successfully processed Excel rate job`);

          return result;
        } catch (error) {
          logger.error(`[${job.data?.requestId}] Error processing Excel rates: ${error.message}`, {
            stack: error.stack,
            userId: job.data?.userId,
          });

          // Update job record as failed
          try {
            const failedUserId = job.data?.userId;
            if (failedUserId) {
              const excelRateJobRepository = new ExcelRateJobRepository();
              const excelJobRecord = await excelRateJobRepository.findByJobId(job.id, failedUserId);
              if (excelJobRecord) {
                await excelRateJobRepository.update(excelJobRecord.id, failedUserId, {
                  status: EXCEL_JOB_STATUS.FAILED,
                  errorMessage: error.message,
                });
              }
            }
          } catch (updateError) {
            logger.error(`Failed to update Excel job record on error: ${updateError.message}`);
          }

          return { success: false, error: error.message };
        }
      });
    } catch (namespaceError) {
      logger.error('[ExcelRateFetchConsumer] Namespace error - gracefully handling', {
        jobId: job.id,
        requestId: job.data?.requestId,
        error: namespaceError.message,
      });

      return {
        success: false,
        error: 'Namespace error',
      };
    }
  }
}

module.exports = ExcelRateFetchConsumer;
