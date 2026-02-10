/* global logger */

// Mock uuid before anything else
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

// Mock models
jest.mock('../../../models');

const ExcelRateJobRepository = require('../../../repositories/excel-rate-job-repository');
const { ExcelRateJob } = require('../../../models');
const { Op } = require('sequelize');
const { MOCK_EXCEL_JOBS } = require('../../utils/excel-rate-fixtures');

describe('ExcelRateJobRepository', () => {
  let repository;
  let mockExcelJob;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup global logger
    global.logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    // Setup mock Excel job
    mockExcelJob = { ...MOCK_EXCEL_JOBS.PENDING };

    repository = new ExcelRateJobRepository();
  });

  afterEach(() => {
    delete global.logger;
  });

  describe('#create', () => {
    it('should create Excel rate job with all fields', async () => {
      ExcelRateJob.create = jest.fn().mockResolvedValue(mockExcelJob);

      const data = {
        userId: 'user-123',
        jobId: 'bull-job-1',
        originalFilename: 'rates.xlsx',
        inputS3Key: 'excel-rates/input/user_user-123/file.xlsx',
        rowCount: 5,
        status: 'pending',
      };

      const result = await repository.create(data);

      expect(ExcelRateJob.create).toHaveBeenCalledWith({
        user_id: 'user-123',
        job_id: 'bull-job-1',
        original_filename: 'rates.xlsx',
        input_s3_key: 'excel-rates/input/user_user-123/file.xlsx',
        row_count: 5,
        status: 'pending',
        processed_count: 0,
        success_count: 0,
        error_count: 0,
      });
      expect(result).toEqual(mockExcelJob);
      expect(global.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Created Excel rate job')
      );
    });

    it('should create job with optional counts', async () => {
      ExcelRateJob.create = jest.fn().mockResolvedValue(mockExcelJob);

      const data = {
        userId: 'user-123',
        jobId: 'bull-job-1',
        originalFilename: 'rates.xlsx',
        inputS3Key: 'excel-rates/input/user_user-123/file.xlsx',
        rowCount: 5,
        status: 'processing',
        processedCount: 2,
        successCount: 2,
        errorCount: 0,
      };

      await repository.create(data);

      expect(ExcelRateJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          processed_count: 2,
          success_count: 2,
          error_count: 0,
        })
      );
    });

    it('should throw error when database error occurs', async () => {
      const dbError = new Error('Database error');
      ExcelRateJob.create = jest.fn().mockRejectedValue(dbError);

      const data = {
        userId: 'user-123',
        jobId: 'bull-job-1',
        originalFilename: 'rates.xlsx',
        inputS3Key: 'key',
        rowCount: 5,
        status: 'pending',
      };

      await expect(repository.create(data)).rejects.toThrow('Database error');
      expect(global.logger.error).toHaveBeenCalled();
    });
  });

  describe('#findById', () => {
    it('should find Excel job by ID and user ID', async () => {
      ExcelRateJob.findOne = jest.fn().mockResolvedValue(mockExcelJob);

      const result = await repository.findById('job-uuid-1', 'user-123');

      expect(ExcelRateJob.findOne).toHaveBeenCalledWith({
        where: { id: 'job-uuid-1', user_id: 'user-123' },
      });
      expect(result).toEqual(mockExcelJob);
    });

    it('should return null when job not found', async () => {
      ExcelRateJob.findOne = jest.fn().mockResolvedValue(null);

      const result = await repository.findById('job-not-found', 'user-123');

      expect(result).toBeNull();
    });

    it('should return null when job belongs to different user (multi-tenancy)', async () => {
      ExcelRateJob.findOne = jest.fn().mockResolvedValue(null);

      const result = await repository.findById('job-uuid-1', 'user-999');

      expect(ExcelRateJob.findOne).toHaveBeenCalledWith({
        where: { id: 'job-uuid-1', user_id: 'user-999' }, // Different user
      });
      expect(result).toBeNull();
    });

    it('should throw error when database error occurs', async () => {
      const dbError = new Error('Database error');
      ExcelRateJob.findOne = jest.fn().mockRejectedValue(dbError);

      await expect(repository.findById('job-uuid-1', 'user-123')).rejects.toThrow('Database error');
      expect(global.logger.error).toHaveBeenCalled();
    });
  });

  describe('#findByJobId', () => {
    it('should find Excel job by Bull job ID and user ID', async () => {
      ExcelRateJob.findOne = jest.fn().mockResolvedValue(mockExcelJob);

      const result = await repository.findByJobId('bull-job-1', 'user-123');

      expect(ExcelRateJob.findOne).toHaveBeenCalledWith({
        where: { job_id: 'bull-job-1', user_id: 'user-123' },
      });
      expect(result).toEqual(mockExcelJob);
    });

    it('should return null when job not found', async () => {
      ExcelRateJob.findOne = jest.fn().mockResolvedValue(null);

      const result = await repository.findByJobId('bull-job-not-found', 'user-123');

      expect(result).toBeNull();
    });

    it('should return null when job belongs to different user', async () => {
      ExcelRateJob.findOne = jest.fn().mockResolvedValue(null);

      const result = await repository.findByJobId('bull-job-1', 'user-999');

      expect(ExcelRateJob.findOne).toHaveBeenCalledWith({
        where: { job_id: 'bull-job-1', user_id: 'user-999' },
      });
      expect(result).toBeNull();
    });

    it('should throw error when database error occurs', async () => {
      const dbError = new Error('Database error');
      ExcelRateJob.findOne = jest.fn().mockRejectedValue(dbError);

      await expect(repository.findByJobId('bull-job-1', 'user-123')).rejects.toThrow('Database error');
      expect(global.logger.error).toHaveBeenCalled();
    });
  });

  describe('#findByUserId', () => {
    it('should find all jobs for user with default pagination', async () => {
      const mockJobs = [mockExcelJob, { ...mockExcelJob, id: 'job-uuid-2' }];
      ExcelRateJob.findAll = jest.fn().mockResolvedValue(mockJobs);

      const result = await repository.findByUserId('user-123');

      expect(ExcelRateJob.findAll).toHaveBeenCalledWith({
        where: { user_id: 'user-123' },
        order: [['created_at', 'DESC']],
        limit: 50, // PAGINATION.DEFAULT_LIMIT
        offset: 0, // PAGINATION.DEFAULT_OFFSET
      });
      expect(result).toEqual(mockJobs);
    });

    it('should find jobs with custom pagination', async () => {
      const mockJobs = [mockExcelJob];
      ExcelRateJob.findAll = jest.fn().mockResolvedValue(mockJobs);

      await repository.findByUserId('user-123', { limit: 10, offset: 5 });

      expect(ExcelRateJob.findAll).toHaveBeenCalledWith({
        where: { user_id: 'user-123' },
        order: [['created_at', 'DESC']],
        limit: 10,
        offset: 5,
      });
    });

    it('should return empty array when no jobs found', async () => {
      ExcelRateJob.findAll = jest.fn().mockResolvedValue([]);

      const result = await repository.findByUserId('user-123');

      expect(result).toEqual([]);
    });

    it('should throw error when database error occurs', async () => {
      const dbError = new Error('Database error');
      ExcelRateJob.findAll = jest.fn().mockRejectedValue(dbError);

      await expect(repository.findByUserId('user-123')).rejects.toThrow('Database error');
      expect(global.logger.error).toHaveBeenCalled();
    });
  });

  describe('#update', () => {
    it('should update Excel job with new status and counts', async () => {
      const updatedJob = { ...mockExcelJob, status: 'completed' };
      ExcelRateJob.update = jest.fn().mockResolvedValue([1]); // Update count
      ExcelRateJob.findOne = jest.fn().mockResolvedValue(updatedJob);

      const updates = {
        status: 'completed',
        outputS3Key: 'excel-rates/output/user_user-123/file_results.xlsx',
        successCount: 5,
        errorCount: 0,
        processedCount: 5,
        completedAt: new Date(),
      };

      const result = await repository.update('job-uuid-1', 'user-123', updates);

      expect(ExcelRateJob.update).toHaveBeenCalledWith(
        {
          status: 'completed',
          output_s3_key: 'excel-rates/output/user_user-123/file_results.xlsx',
          success_count: 5,
          error_count: 0,
          processed_count: 5,
          completed_at: expect.any(Date),
        },
        {
          where: { id: 'job-uuid-1', user_id: 'user-123' },
        }
      );
      expect(ExcelRateJob.findOne).toHaveBeenCalledWith({
        where: { id: 'job-uuid-1', user_id: 'user-123' },
      });
      expect(result).toEqual(updatedJob);
      expect(global.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Updated Excel rate job')
      );
    });

    it('should map camelCase to snake_case correctly', async () => {
      ExcelRateJob.update = jest.fn().mockResolvedValue([1]);
      ExcelRateJob.findOne = jest.fn().mockResolvedValue(mockExcelJob);

      await repository.update('job-uuid-1', 'user-123', {
        outputS3Key: 's3-key',
        processedCount: 5,
        successCount: 4,
        errorCount: 1,
        errorMessage: 'Error occurred',
      });

      expect(ExcelRateJob.update).toHaveBeenCalledWith(
        {
          output_s3_key: 's3-key',
          processed_count: 5,
          success_count: 4,
          error_count: 1,
          error_message: 'Error occurred',
        },
        expect.any(Object)
      );
    });

    it('should return null when job not found or belongs to different user', async () => {
      ExcelRateJob.update = jest.fn().mockResolvedValue([0]); // No rows updated

      const result = await repository.update('job-not-found', 'user-123', { status: 'completed' });

      expect(result).toBeNull();
      expect(global.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No Excel rate job found to update')
      );
    });

    it('should enforce multi-tenancy in update', async () => {
      ExcelRateJob.update = jest.fn().mockResolvedValue([0]);

      await repository.update('job-uuid-1', 'user-999', { status: 'completed' });

      expect(ExcelRateJob.update).toHaveBeenCalledWith(
        expect.any(Object),
        {
          where: { id: 'job-uuid-1', user_id: 'user-999' }, // Different user
        }
      );
    });

    it('should throw error when database error occurs', async () => {
      const dbError = new Error('Database error');
      ExcelRateJob.update = jest.fn().mockRejectedValue(dbError);

      await expect(
        repository.update('job-uuid-1', 'user-123', { status: 'completed' })
      ).rejects.toThrow('Database error');
      expect(global.logger.error).toHaveBeenCalled();
    });
  });

  describe('#delete', () => {
    it('should delete Excel job by ID and user ID', async () => {
      ExcelRateJob.destroy = jest.fn().mockResolvedValue(1); // Delete count

      const result = await repository.delete('job-uuid-1', 'user-123');

      expect(ExcelRateJob.destroy).toHaveBeenCalledWith({
        where: { id: 'job-uuid-1', user_id: 'user-123' },
      });
      expect(result).toBe(true);
      expect(global.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Deleted Excel rate job')
      );
    });

    it('should return false when job not found', async () => {
      ExcelRateJob.destroy = jest.fn().mockResolvedValue(0); // Nothing deleted

      const result = await repository.delete('job-not-found', 'user-123');

      expect(result).toBe(false);
      expect(global.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No Excel rate job found to delete')
      );
    });

    it('should return false when job belongs to different user (multi-tenancy)', async () => {
      ExcelRateJob.destroy = jest.fn().mockResolvedValue(0);

      const result = await repository.delete('job-uuid-1', 'user-999');

      expect(ExcelRateJob.destroy).toHaveBeenCalledWith({
        where: { id: 'job-uuid-1', user_id: 'user-999' },
      });
      expect(result).toBe(false);
    });

    it('should throw error when database error occurs', async () => {
      const dbError = new Error('Database error');
      ExcelRateJob.destroy = jest.fn().mockRejectedValue(dbError);

      await expect(repository.delete('job-uuid-1', 'user-123')).rejects.toThrow('Database error');
      expect(global.logger.error).toHaveBeenCalled();
    });
  });

  describe('#findOldJobs', () => {
    it('should find jobs older than specified days', async () => {
      const oldJobs = [mockExcelJob, { ...mockExcelJob, id: 'job-uuid-2' }];
      ExcelRateJob.findAll = jest.fn().mockResolvedValue(oldJobs);

      const daysOld = 30;
      const result = await repository.findOldJobs(daysOld);

      const callArgs = ExcelRateJob.findAll.mock.calls[0][0];
      expect(callArgs.where.created_at[Op.lt]).toBeInstanceOf(Date);
      expect(result).toEqual(oldJobs);
    });

    it('should calculate cutoff date correctly', async () => {
      ExcelRateJob.findAll = jest.fn().mockResolvedValue([]);
      const daysOld = 7;
      const now = new Date();
      const expectedCutoff = new Date(now);
      expectedCutoff.setDate(now.getDate() - daysOld);

      await repository.findOldJobs(daysOld);

      const callArgs = ExcelRateJob.findAll.mock.calls[0][0];
      const actualCutoff = callArgs.where.created_at[Op.lt];

      // Allow 1 second tolerance for test execution time
      const timeDiff = Math.abs(actualCutoff - expectedCutoff);
      expect(timeDiff).toBeLessThan(1000);
    });

    it('should return empty array when no old jobs found', async () => {
      ExcelRateJob.findAll = jest.fn().mockResolvedValue([]);

      const result = await repository.findOldJobs(30);

      expect(result).toEqual([]);
    });

    it('should throw error when database error occurs', async () => {
      const dbError = new Error('Database error');
      ExcelRateJob.findAll = jest.fn().mockRejectedValue(dbError);

      await expect(repository.findOldJobs(30)).rejects.toThrow('Database error');
      expect(global.logger.error).toHaveBeenCalled();
    });
  });

  describe('#getJobStatusCounts', () => {
    it('should return counts grouped by status for user', async () => {
      const mockCounts = [
        { status: 'pending', count: '5' },
        { status: 'processing', count: '2' },
        { status: 'completed', count: '10' },
        { status: 'failed', count: '1' },
      ];
      ExcelRateJob.findAll = jest.fn().mockResolvedValue(mockCounts);

      const result = await repository.getJobStatusCounts('user-123');

      expect(ExcelRateJob.findAll).toHaveBeenCalledWith({
        attributes: [
          'status',
          expect.any(Array), // [fn('COUNT', col('id')), 'count']
        ],
        where: { user_id: 'user-123' },
        group: ['status'],
        raw: true,
      });
      expect(result).toEqual({
        pending: 5,
        processing: 2,
        completed: 10,
        failed: 1,
      });
    });

    it('should return empty object when no jobs for user', async () => {
      ExcelRateJob.findAll = jest.fn().mockResolvedValue([]);

      const result = await repository.getJobStatusCounts('user-123');

      expect(result).toEqual({});
    });

    it('should enforce multi-tenancy in status counts', async () => {
      ExcelRateJob.findAll = jest.fn().mockResolvedValue([]);

      await repository.getJobStatusCounts('user-999');

      expect(ExcelRateJob.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user_id: 'user-999' },
        })
      );
    });

    it('should throw error when database error occurs', async () => {
      const dbError = new Error('Database error');
      ExcelRateJob.findAll = jest.fn().mockRejectedValue(dbError);

      await expect(repository.getJobStatusCounts('user-123')).rejects.toThrow('Database error');
      expect(global.logger.error).toHaveBeenCalled();
    });
  });
});
