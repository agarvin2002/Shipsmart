/* global logger */
const { ExcelRateJob } = require('../models');
const { Op, fn, col } = require('sequelize');
const { PAGINATION } = require('@shipsmart/constants');

class ExcelRateJobRepository {
  /**
   * Create a new Excel rate job record
   * @param {Object} data - Job data
   * @param {Number} data.userId - User ID
   * @param {String} data.jobId - Bull job ID
   * @param {String} data.originalFilename - Original Excel filename
   * @param {String} data.inputS3Key - S3 key for input file
   * @param {Number} data.rowCount - Number of rows in Excel
   * @param {String} data.status - Job status
   * @returns {Promise<Object>} Created job record
   */
  async create(data) {
    try {
      const excelJob = await ExcelRateJob.create({
        user_id: data.userId,
        job_id: data.jobId,
        original_filename: data.originalFilename,
        input_s3_key: data.inputS3Key,
        row_count: data.rowCount,
        status: data.status,
        processed_count: data.processedCount || 0,
        success_count: data.successCount || 0,
        error_count: data.errorCount || 0,
      });

      logger.info(`Created Excel rate job: ${excelJob.id}`);
      return excelJob.toJSON();
    } catch (error) {
      logger.error(`Failed to create Excel rate job: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find Excel job by UUID
   * @param {String} id - Job UUID
   * @param {Number} userId - User ID for multi-tenancy filter
   * @returns {Promise<Object|null>} Job record or null
   */
  async findById(id, userId) {
    try {
      const excelJob = await ExcelRateJob.findOne({
        where: { id, user_id: userId },
      });

      return excelJob ? excelJob.toJSON() : null;
    } catch (error) {
      logger.error(`Failed to find Excel rate job by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find Excel job by Bull job ID
   * @param {String} jobId - Bull job ID
   * @param {Number} userId - User ID for multi-tenancy filter
   * @returns {Promise<Object|null>} Job record or null
   */
  async findByJobId(jobId, userId) {
    try {
      const excelJob = await ExcelRateJob.findOne({
        where: { job_id: jobId, user_id: userId },
      });

      return excelJob ? excelJob.toJSON() : null;
    } catch (error) {
      logger.error(`Failed to find Excel rate job by job_id: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find all Excel jobs for a user with pagination
   * @param {Number} userId - User ID
   * @param {Object} options - Query options
   * @param {Number} options.limit - Max results to return
   * @param {Number} options.offset - Offset for pagination
   * @returns {Promise<Array>} Array of job records
   */
  async findByUserId(userId, options = {}) {
    try {
      const limit = options.limit || PAGINATION.DEFAULT_LIMIT;
      const offset = options.offset || PAGINATION.DEFAULT_OFFSET;

      const excelJobs = await ExcelRateJob.findAll({
        where: { user_id: userId },  // CRITICAL: Multi-tenancy filter
        order: [['created_at', 'DESC']],
        limit,
        offset,
      });

      return excelJobs.map(job => job.toJSON());
    } catch (error) {
      logger.error(`Failed to find Excel rate jobs by user_id: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update an Excel job record
   * @param {String} id - Job UUID
   * @param {Number} userId - User ID for multi-tenancy filter
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated job record or null
   */
  async update(id, userId, updates) {
    try {
      const updateData = {};

      if (updates.outputS3Key !== undefined) updateData.output_s3_key = updates.outputS3Key;
      if (updates.processedCount !== undefined) updateData.processed_count = updates.processedCount;
      if (updates.successCount !== undefined) updateData.success_count = updates.successCount;
      if (updates.errorCount !== undefined) updateData.error_count = updates.errorCount;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.errorMessage !== undefined) updateData.error_message = updates.errorMessage;
      if (updates.completedAt !== undefined) updateData.completed_at = updates.completedAt;

      const [updateCount] = await ExcelRateJob.update(updateData, {
        where: { id, user_id: userId },
      });

      if (updateCount === 0) {
        logger.warn(`No Excel rate job found to update: ${id}`);
        return null;
      }

      logger.info(`Updated Excel rate job: ${id}`);
      return this.findById(id, userId);
    } catch (error) {
      logger.error(`Failed to update Excel rate job: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete an Excel job (with ownership check)
   * @param {String} id - Job UUID
   * @param {Number} userId - User ID for ownership verification
   * @returns {Promise<Boolean>} True if deleted, false if not found
   */
  async delete(id, userId) {
    try {
      const deleteCount = await ExcelRateJob.destroy({
        where: {
          id,
          user_id: userId,  // CRITICAL: Multi-tenancy filter
        },
      });

      if (deleteCount === 0) {
        logger.warn(`No Excel rate job found to delete: ${id}`);
        return false;
      }

      logger.info(`Deleted Excel rate job: ${id}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete Excel rate job: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find old Excel jobs for cleanup
   * @param {Number} daysOld - Jobs older than this many days
   * @returns {Promise<Array>} Array of old job records
   */
  async findOldJobs(daysOld) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const oldJobs = await ExcelRateJob.findAll({
        where: {
          created_at: {
            [Op.lt]: cutoffDate,
          },
        },
      });

      return oldJobs.map(job => job.toJSON());
    } catch (error) {
      logger.error(`Failed to find old Excel rate jobs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get count of jobs by status for a user
   * @param {Number} userId - User ID
   * @returns {Promise<Object>} Object with status counts
   */
  async getJobStatusCounts(userId) {
    try {
      const counts = await ExcelRateJob.findAll({
        attributes: [
          'status',
          [fn('COUNT', col('id')), 'count'],
        ],
        where: { user_id: userId },  // CRITICAL: Multi-tenancy filter
        group: ['status'],
        raw: true,
      });

      // Convert array to object
      const result = {};
      counts.forEach(({ status, count }) => {
        result[status] = parseInt(count, 10);
      });

      return result;
    } catch (error) {
      logger.error(`Failed to get job status counts: ${error.message}`);
      throw error;
    }
  }
}

module.exports = ExcelRateJobRepository;
