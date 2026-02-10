/* global logger */

// Mock uuid before anything else
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

// Mock all dependencies
jest.mock('../../../services/excel-rate-service');
jest.mock('@shipsmart/http');
jest.mock('@shipsmart/constants');
jest.mock('../../../workers/utils/producer');

const ExcelRateController = require('../../../controller/excel-rate-controller');
const ExcelRateService = require('../../../services/excel-rate-service');
const { ResponseFormatter } = require('@shipsmart/http');
const { getWorkerProducer } = require('../../../workers/utils/producer');
const { ValidationError, NotFoundError } = require('@shipsmart/errors');
const { createMockRequest, createMockResponse } = require('../../utils/test-helpers');

describe('ExcelRateController', () => {
  let req;
  let res;
  let next;
  let mockWorkerProducer;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup global logger
    global.logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    // Setup request/response
    req = createMockRequest({
      user: { userId: 'user-123' },
      id: 'req-123',
    });
    res = createMockResponse();
    res.redirect = jest.fn(); // Add redirect method for download tests
    next = jest.fn();

    // Setup ResponseFormatter
    ResponseFormatter.formatSuccess = jest.fn((data, requestId) => ({
      success: true,
      request_id: requestId,
      data,
    }));
    ResponseFormatter.formatError = jest.fn((message, requestId, statusCode) => ({
      success: false,
      request_id: requestId,
      error: { message, code: statusCode },
    }));
    ResponseFormatter.formatValidationError = jest.fn((error, requestId) => ({
      success: false,
      request_id: requestId,
      error: { message: 'Validation failed', details: error },
    }));

    // Setup worker producer
    mockWorkerProducer = {
      publishMessage: jest.fn().mockResolvedValue({ id: 'job-123' }),
    };
    getWorkerProducer.mockReturnValue(mockWorkerProducer);

    // Setup service methods
    ExcelRateService.validateFileExtension = jest.fn();
    ExcelRateService.getJobStatus = jest.fn();
    ExcelRateService.getDownloadUrlByJobId = jest.fn();
  });

  afterEach(() => {
    delete global.logger;
  });

  describe('#uploadExcel', () => {
    it('should upload Excel file and queue job, returning 202', async () => {
      req.file = {
        buffer: Buffer.from('mock excel data'),
        originalname: 'rates.xlsx',
      };

      await ExcelRateController.uploadExcel(req, res, next);

      expect(ExcelRateService.validateFileExtension).toHaveBeenCalledWith('rates.xlsx');
      expect(mockWorkerProducer.publishMessage).toHaveBeenCalledWith({
        fileBuffer: expect.any(Buffer),
        originalFilename: 'rates.xlsx',
        userId: 'user-123',
        requestId: 'req-123',
      });
      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.send).toHaveBeenCalledWith(
        ResponseFormatter.formatSuccess(
          {
            message: 'Excel rate comparison job queued',
            job_id: 'job-123',
          },
          'req-123'
        )
      );
      expect(global.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Excel rate fetch job queued')
      );
    });

    it('should return 400 when no file uploaded', async () => {
      req.file = null;

      await ExcelRateController.uploadExcel(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('No file uploaded'),
        })
      );
      expect(mockWorkerProducer.publishMessage).not.toHaveBeenCalled();
    });

    it('should return 400 when file extension is invalid', async () => {
      req.file = {
        buffer: Buffer.from('mock data'),
        originalname: 'rates.pdf',
      };
      ExcelRateService.validateFileExtension.mockImplementation(() => {
        throw new ValidationError('Invalid file type');
      });

      await ExcelRateController.uploadExcel(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockWorkerProducer.publishMessage).not.toHaveBeenCalled();
    });

    it('should call next with error when exception occurs', async () => {
      req.file = { buffer: Buffer.from('data'), originalname: 'rates.xlsx' };
      const serviceError = new Error('Service error');
      mockWorkerProducer.publishMessage.mockRejectedValue(serviceError);

      await ExcelRateController.uploadExcel(req, res, next);

      expect(next).toHaveBeenCalledWith(serviceError);
      expect(global.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Exception in uploadExcel'),
        expect.any(Object)
      );
    });
  });

  describe('#getJobStatus', () => {
    it('should return job status with 200 when completed', async () => {
      req.params = { jobId: 'job-123' };
      const mockResponse = {
        job_id: 'job-123',
        state: 'completed',
        progress: 100,
        data: {
          download_url: 'https://s3.../signed-url',
          row_count: 5,
          success_count: 5,
          error_count: 0,
        },
      };
      ExcelRateService.getJobStatus.mockResolvedValue(mockResponse);

      await ExcelRateController.getJobStatus(req, res, next);

      expect(ExcelRateService.getJobStatus).toHaveBeenCalledWith('job-123', 'user-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        ResponseFormatter.formatSuccess(mockResponse, 'req-123')
      );
      expect(global.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Job status retrieved: job-123')
      );
    });

    it('should return job status with 200 when in progress', async () => {
      req.params = { jobId: 'job-456' };
      const mockResponse = {
        job_id: 'job-456',
        state: 'active',
        progress: 50,
      };
      ExcelRateService.getJobStatus.mockResolvedValue(mockResponse);

      await ExcelRateController.getJobStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        ResponseFormatter.formatSuccess(mockResponse, 'req-123')
      );
    });

    it('should return job status with 200 when failed', async () => {
      req.params = { jobId: 'job-789' };
      const mockResponse = {
        job_id: 'job-789',
        state: 'failed',
        error: 'Job processing failed',
      };
      ExcelRateService.getJobStatus.mockResolvedValue(mockResponse);

      await ExcelRateController.getJobStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should call next with NotFoundError when job not found', async () => {
      req.params = { jobId: 'job-not-found' };
      const notFoundError = new NotFoundError('Job not found');
      ExcelRateService.getJobStatus.mockRejectedValue(notFoundError);

      await ExcelRateController.getJobStatus(req, res, next);

      expect(next).toHaveBeenCalledWith(notFoundError);
    });

    it('should call next with error when exception occurs', async () => {
      req.params = { jobId: 'job-123' };
      const serviceError = new Error('Service error');
      ExcelRateService.getJobStatus.mockRejectedValue(serviceError);

      await ExcelRateController.getJobStatus(req, res, next);

      expect(next).toHaveBeenCalledWith(serviceError);
      expect(global.logger.error).toHaveBeenCalled();
    });
  });

  describe('#downloadResult', () => {
    it('should redirect to signed S3 URL with 302', async () => {
      req.params = { jobId: 'job-123' };
      const downloadUrl = 'https://s3.amazonaws.com/signed-url';
      ExcelRateService.getDownloadUrlByJobId.mockResolvedValue(downloadUrl);

      await ExcelRateController.downloadResult(req, res, next);

      expect(ExcelRateService.getDownloadUrlByJobId).toHaveBeenCalledWith('job-123', 'user-123');
      expect(res.redirect).toHaveBeenCalledWith(downloadUrl);
    });

    it('should call next with NotFoundError when job not found', async () => {
      req.params = { jobId: 'job-not-found' };
      const notFoundError = new NotFoundError('Job not found');
      ExcelRateService.getDownloadUrlByJobId.mockRejectedValue(notFoundError);

      await ExcelRateController.downloadResult(req, res, next);

      expect(next).toHaveBeenCalledWith(notFoundError);
    });

    it('should call next with ValidationError when output not ready', async () => {
      req.params = { jobId: 'job-123' };
      const validationError = new ValidationError('Job output is not ready yet');
      ExcelRateService.getDownloadUrlByJobId.mockRejectedValue(validationError);

      await ExcelRateController.downloadResult(req, res, next);

      expect(next).toHaveBeenCalledWith(validationError);
    });

    it('should call next with error when exception occurs', async () => {
      req.params = { jobId: 'job-123' };
      const serviceError = new Error('Service error');
      ExcelRateService.getDownloadUrlByJobId.mockRejectedValue(serviceError);

      await ExcelRateController.downloadResult(req, res, next);

      expect(next).toHaveBeenCalledWith(serviceError);
      expect(global.logger.error).toHaveBeenCalled();
    });
  });
});
