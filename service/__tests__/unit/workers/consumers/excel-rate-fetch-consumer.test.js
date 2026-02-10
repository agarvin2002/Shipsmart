/* global logger */

// Mock uuid before anything else
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

// Mock dependencies
jest.mock('@hapi/joi', () => {
  const mockJoi = {
    validate: jest.fn(),
    object: jest.fn(() => mockJoi),
    alternatives: jest.fn(() => mockJoi),
    binary: jest.fn(() => mockJoi),
    string: jest.fn(() => mockJoi),
    array: jest.fn(() => mockJoi),
    number: jest.fn(() => mockJoi),
    boolean: jest.fn(() => mockJoi),
    required: jest.fn(() => mockJoi),
    optional: jest.fn(() => mockJoi),
    try: jest.fn(() => mockJoi),
    valid: jest.fn(() => mockJoi),
    items: jest.fn(() => mockJoi),
    integer: jest.fn(() => mockJoi),
    positive: jest.fn(() => mockJoi),
  };
  return mockJoi;
});
jest.mock('../../../../services/excel-rate-service');
jest.mock('../../../../repositories/excel-rate-job-repository');
jest.mock('../../../../models', () => ({
  namespace: {
    run: jest.fn((callback) => callback()),
    set: jest.fn(),
  },
}));
jest.mock('@shipsmart/constants');

const Joi = require('@hapi/joi');
const ExcelRateFetchConsumer = require('../../../../workers/consumers/excel-rate-fetch-consumer');
const ExcelRateService = require('../../../../services/excel-rate-service');
const ExcelRateJobRepository = require('../../../../repositories/excel-rate-job-repository');
const { namespace } = require('../../../../models');
const { MOCK_JOB_DATA, MOCK_EXCEL_JOBS } = require('../../../utils/excel-rate-fixtures');

describe('ExcelRateFetchConsumer', () => {
  let mockJob;
  let mockRepository;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup global logger
    global.logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    // Setup mock job
    mockJob = {
      id: 'bull-job-123',
      data: { ...MOCK_JOB_DATA.VALID },
      progress: jest.fn(),
    };

    // Setup repository mock
    mockRepository = {
      findByJobId: jest.fn(),
      update: jest.fn(),
    };
    ExcelRateJobRepository.mockImplementation(() => mockRepository);

    // Setup service mock
    ExcelRateService.processExcelRates = jest.fn().mockResolvedValue({
      success: true,
      excelJobRecord: MOCK_EXCEL_JOBS.COMPLETED,
    });

    // Setup Joi validation (valid by default)
    Joi.validate = jest.fn().mockReturnValue({
      error: null,
      value: mockJob.data,
    });

    // Setup namespace
    namespace.run.mockImplementation((callback) => callback());
    namespace.set.mockImplementation(() => {});
  });

  afterEach(() => {
    delete global.logger;
  });

  describe('#perform - Success Cases', () => {
    it('should process job successfully and return result', async () => {
      const result = await ExcelRateFetchConsumer.perform(mockJob);

      expect(Joi.validate).toHaveBeenCalledWith(mockJob.data, expect.any(Object));
      expect(namespace.run).toHaveBeenCalled();
      expect(namespace.set).toHaveBeenCalledWith('requestId', 'req-123');
      expect(namespace.set).toHaveBeenCalledWith('userId', 'user-123');
      expect(ExcelRateService.processExcelRates).toHaveBeenCalledWith(
        expect.any(Buffer),
        'rates.xlsx',
        'user-123',
        'req-123',
        'bull-job-123'
      );
      expect(mockJob.progress).toHaveBeenCalledWith(10);
      expect(mockJob.progress).toHaveBeenCalledWith(100);
      expect(result).toEqual({
        success: true,
        excelJobRecord: MOCK_EXCEL_JOBS.COMPLETED,
      });
      expect(global.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Processing Excel rate fetch job')
      );
      expect(global.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Successfully processed Excel rate job')
      );
    });

    it('should convert serialized Buffer to Buffer instance', async () => {
      mockJob.data.fileBuffer = {
        type: 'Buffer',
        data: [1, 2, 3, 4, 5],
      };
      Joi.validate.mockReturnValue({ error: null, value: mockJob.data });

      await ExcelRateFetchConsumer.perform(mockJob);

      expect(ExcelRateService.processExcelRates).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String)
      );
    });
  });

  describe('#perform - Validation Errors', () => {
    it('should return error when job data validation fails', async () => {
      const validationError = {
        message: 'userId is required',
        details: [{ message: 'userId is required', path: ['userId'] }],
      };
      Joi.validate.mockReturnValue({
        error: validationError,
        value: null,
      });

      const result = await ExcelRateFetchConsumer.perform(mockJob);

      expect(result).toEqual({
        success: false,
        error: `Invalid job data: ${validationError.message}`,
      });
      expect(ExcelRateService.processExcelRates).not.toHaveBeenCalled();
      expect(global.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid job data'),
        expect.any(Object)
      );
    });

    it('should return error when fileBuffer is missing', async () => {
      const invalidData = { ...mockJob.data, fileBuffer: undefined };
      const validationError = { message: 'fileBuffer is required' };
      Joi.validate.mockReturnValue({
        error: validationError,
        value: null,
      });
      mockJob.data = invalidData;

      const result = await ExcelRateFetchConsumer.perform(mockJob);

      expect(result.success).toBe(false);
      expect(ExcelRateService.processExcelRates).not.toHaveBeenCalled();
    });
  });

  describe('#perform - Service Errors', () => {
    it('should return error and update job status when service throws error', async () => {
      const serviceError = new Error('S3 upload failed');
      ExcelRateService.processExcelRates.mockRejectedValue(serviceError);
      mockRepository.findByJobId.mockResolvedValue(MOCK_EXCEL_JOBS.PROCESSING);

      const result = await ExcelRateFetchConsumer.perform(mockJob);

      expect(result).toEqual({
        success: false,
        error: 'S3 upload failed',
      });
      expect(global.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error processing Excel rates'),
        expect.any(Object)
      );
      expect(mockRepository.findByJobId).toHaveBeenCalledWith('bull-job-123', 'user-123');
      expect(mockRepository.update).toHaveBeenCalledWith(
        MOCK_EXCEL_JOBS.PROCESSING.id,
        'user-123',
        {
          status: 'failed',
          errorMessage: 'S3 upload failed',
        }
      );
    });

    it('should handle error when job record update fails', async () => {
      const serviceError = new Error('Processing failed');
      ExcelRateService.processExcelRates.mockRejectedValue(serviceError);
      mockRepository.findByJobId.mockResolvedValue(MOCK_EXCEL_JOBS.PROCESSING);
      mockRepository.update.mockRejectedValue(new Error('DB update failed'));

      const result = await ExcelRateFetchConsumer.perform(mockJob);

      expect(result.success).toBe(false);
      // Check logger was called with the update error message
      const errorCalls = global.logger.error.mock.calls;
      const hasUpdateErrorLog = errorCalls.some(call =>
        call[0] && call[0].includes('Failed to update Excel job record on error')
      );
      expect(hasUpdateErrorLog).toBe(true);
    });

    it('should handle error when job not found for update', async () => {
      const serviceError = new Error('Processing failed');
      ExcelRateService.processExcelRates.mockRejectedValue(serviceError);
      mockRepository.findByJobId.mockResolvedValue(null);

      const result = await ExcelRateFetchConsumer.perform(mockJob);

      expect(result.success).toBe(false);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('#perform - Namespace Errors', () => {
    it('should handle namespace errors gracefully', async () => {
      namespace.run.mockImplementation(() => {
        throw new Error('Namespace error');
      });

      const result = await ExcelRateFetchConsumer.perform(mockJob);

      expect(result).toEqual({
        success: false,
        error: 'Namespace error',
      });
      expect(global.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[ExcelRateFetchConsumer] Namespace error'),
        expect.any(Object)
      );
    });
  });

  describe('#perform - Edge Cases', () => {
    it('should handle missing userId in error scenario', async () => {
      mockJob.data.userId = undefined;
      const serviceError = new Error('Processing failed');
      ExcelRateService.processExcelRates.mockRejectedValue(serviceError);

      const result = await ExcelRateFetchConsumer.perform(mockJob);

      expect(result.success).toBe(false);
      expect(mockRepository.findByJobId).not.toHaveBeenCalled();
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should use direct Buffer when fileBuffer is already a Buffer', async () => {
      mockJob.data.fileBuffer = Buffer.from('direct buffer data');
      Joi.validate.mockReturnValue({ error: null, value: mockJob.data });

      await ExcelRateFetchConsumer.perform(mockJob);

      const callArgs = ExcelRateService.processExcelRates.mock.calls[0];
      expect(Buffer.isBuffer(callArgs[0])).toBe(true);
    });
  });
});
