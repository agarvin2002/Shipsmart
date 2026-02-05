/**
 * RateController Unit Tests
 *
 * Tests rate comparison controller handling of HTTP requests/responses.
 */

// Mock uuid before anything else
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

// Mock dependencies
jest.mock('../../../services/rate-service');
jest.mock('../../../validators/rate-validator');
jest.mock('../../../presenters/rate-presenter');
jest.mock('../../../helpers/response-formatter');
jest.mock('../../../workers/utils/producer');
jest.mock('../../../worker-client');

const RateController = require('../../../controller/rate-controller');
const RateService = require('../../../services/rate-service');
const RateValidator = require('../../../validators/rate-validator');
const RatePresenter = require('../../../presenters/rate-presenter');
const ResponseFormatter = require('../../../helpers/response-formatter');
const { getWorkerProducer } = require('../../../workers/utils/producer');
const workerClient = require('../../../worker-client');
const { createMockRequest, createMockResponse } = require('../../utils/test-helpers');

describe('RateController', () => {
  let mockRateService;
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup RateService mock
    mockRateService = {
      getRates: jest.fn(),
      compareRates: jest.fn(),
      getRateHistory: jest.fn(),
    };
    RateService.mockImplementation(() => mockRateService);

    // Setup ResponseFormatter mock
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

    // Setup global logger
    global.logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    // Create mock request and response
    req = createMockRequest();
    req.user = { userId: 'user-123' };
    res = createMockResponse();
    next = jest.fn();
  });

  afterEach(() => {
    delete global.logger;
  });

  describe('.getRates', () => {
    it('should get rates successfully in sync mode', async () => {
      const mockValidator = {
        validate: jest.fn(),
        isValid: true,
        value: {
          origin: { postal_code: '10001', country: 'US' },
          destination: { postal_code: '90210', country: 'US' },
          packages: [{ weight: 5.0 }],
        },
      };
      RateValidator.mockImplementation(() => mockValidator);

      const mockRateComparison = {
        total_rates: 5,
        rates: [
          { carrier: 'fedex', service_name: 'Ground', rate_amount: 15.50 },
          { carrier: 'ups', service_name: 'Ground', rate_amount: 16.00 },
        ],
      };
      mockRateService.getRates.mockResolvedValue(mockRateComparison);

      const mockPresentation = { ...mockRateComparison };
      RatePresenter.presentComparison = jest.fn().mockReturnValue(mockPresentation);

      req.body = mockValidator.value;
      req.query = { async: 'false' };

      await RateController.getRates(req, res, next);

      expect(RateValidator).toHaveBeenCalledWith('getRates');
      expect(mockValidator.validate).toHaveBeenCalledWith(req.body);
      expect(mockRateService.getRates).toHaveBeenCalledWith('user-123', mockValidator.value);
      expect(RatePresenter.presentComparison).toHaveBeenCalledWith(mockRateComparison);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        ResponseFormatter.formatSuccess(mockPresentation, req.id)
      );
    });

    it('should queue job in async mode and return 202', async () => {
      const mockValidator = {
        validate: jest.fn(),
        isValid: true,
        value: {
          origin: { postal_code: '10001', country: 'US' },
          destination: { postal_code: '90210', country: 'US' },
          packages: [{ weight: 5.0 }],
        },
      };
      RateValidator.mockImplementation(() => mockValidator);

      const mockJob = { id: 'job-123' };
      const mockWorkerProducer = {
        publishMessage: jest.fn().mockResolvedValue(mockJob),
      };
      getWorkerProducer.mockReturnValue(mockWorkerProducer);

      req.body = mockValidator.value;
      req.query = { async: 'true', forceRefresh: 'true' };

      await RateController.getRates(req, res, next);

      expect(getWorkerProducer).toHaveBeenCalled();
      expect(mockWorkerProducer.publishMessage).toHaveBeenCalledWith({
        shipmentData: mockValidator.value,
        userId: 'user-123',
        requestId: req.id,
        options: {
          forceRefresh: true,
        },
      });
      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.send).toHaveBeenCalledWith(
        ResponseFormatter.formatSuccess(
          {
            message: 'Rate fetch job queued',
            job_id: 'job-123',
          },
          req.id
        )
      );
      expect(mockRateService.getRates).not.toHaveBeenCalled();
    });

    it('should return 400 when validation fails', async () => {
      const mockValidator = {
        validate: jest.fn(),
        isValid: false,
        error: { message: 'Origin postal code is required' },
      };
      RateValidator.mockImplementation(() => mockValidator);

      req.body = {};

      await RateController.getRates(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        ResponseFormatter.formatValidationError(mockValidator.error, req.id)
      );
      expect(mockRateService.getRates).not.toHaveBeenCalled();
    });

    it('should handle exceptions and call next', async () => {
      const mockValidator = {
        validate: jest.fn(),
        isValid: true,
        value: { origin: {}, destination: {} },
      };
      RateValidator.mockImplementation(() => mockValidator);

      const serviceError = new Error('Service error');
      mockRateService.getRates.mockRejectedValue(serviceError);

      req.body = mockValidator.value;
      req.query = {};

      await RateController.getRates(req, res, next);

      expect(next).toHaveBeenCalledWith(serviceError);
      expect(global.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Exception in getRates'),
        expect.any(Object)
      );
    });

    it('should handle forceRefresh=false correctly in async mode', async () => {
      const mockValidator = {
        validate: jest.fn(),
        isValid: true,
        value: { origin: {}, destination: {} },
      };
      RateValidator.mockImplementation(() => mockValidator);

      const mockJob = { id: 'job-456' };
      const mockWorkerProducer = {
        publishMessage: jest.fn().mockResolvedValue(mockJob),
      };
      getWorkerProducer.mockReturnValue(mockWorkerProducer);

      req.body = mockValidator.value;
      req.query = { async: 'true', forceRefresh: 'false' };

      await RateController.getRates(req, res, next);

      expect(mockWorkerProducer.publishMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          options: {
            forceRefresh: false,
          },
        })
      );
    });
  });

  describe('.compareRates', () => {
    it('should compare rates successfully', async () => {
      const mockValidator = {
        validate: jest.fn(),
        isValid: true,
        value: {
          origin: { postal_code: '10001', country: 'US' },
          destination: { postal_code: '90210', country: 'US' },
          packages: [{ weight: 5.0 }],
        },
      };
      RateValidator.mockImplementation(() => mockValidator);

      const mockComparison = {
        total_rates: 3,
        rates: [
          { carrier: 'fedex', rate_amount: 15.50 },
          { carrier: 'ups', rate_amount: 16.00 },
          { carrier: 'usps', rate_amount: 14.00 },
        ],
      };
      mockRateService.compareRates.mockResolvedValue(mockComparison);

      const mockPresentation = { ...mockComparison };
      RatePresenter.presentComparison = jest.fn().mockReturnValue(mockPresentation);

      req.body = mockValidator.value;

      await RateController.compareRates(req, res, next);

      expect(mockRateService.compareRates).toHaveBeenCalledWith('user-123', mockValidator.value);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when validation fails', async () => {
      const mockValidator = {
        validate: jest.fn(),
        isValid: false,
        error: { message: 'Invalid shipment data' },
      };
      RateValidator.mockImplementation(() => mockValidator);

      req.body = {};

      await RateController.compareRates(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockRateService.compareRates).not.toHaveBeenCalled();
    });

    it('should handle exceptions', async () => {
      const mockValidator = {
        validate: jest.fn(),
        isValid: true,
        value: {},
      };
      RateValidator.mockImplementation(() => mockValidator);

      const serviceError = new Error('Comparison failed');
      mockRateService.compareRates.mockRejectedValue(serviceError);

      req.body = mockValidator.value;

      await RateController.compareRates(req, res, next);

      expect(next).toHaveBeenCalledWith(serviceError);
    });
  });

  describe('.getRateHistory', () => {
    it('should get rate history successfully', async () => {
      const mockValidator = {
        validate: jest.fn(),
        isValid: true,
        value: { limit: 20, offset: 0 },
      };
      RateValidator.mockImplementation(() => mockValidator);

      const mockHistory = {
        rates: [
          { id: 'rate-1', carrier: 'fedex', rate_amount: 15.50 },
          { id: 'rate-2', carrier: 'ups', rate_amount: 16.00 },
        ],
        total: 2,
      };
      mockRateService.getRateHistory.mockResolvedValue(mockHistory);

      const mockPresentation = { ...mockHistory };
      RatePresenter.presentHistory = jest.fn().mockReturnValue(mockPresentation);

      req.query = { limit: '20', offset: '0' };

      await RateController.getRateHistory(req, res, next);

      expect(RateValidator).toHaveBeenCalledWith('getRateHistory');
      expect(mockValidator.validate).toHaveBeenCalledWith(req.query);
      expect(mockRateService.getRateHistory).toHaveBeenCalledWith(mockValidator.value);
      expect(RatePresenter.presentHistory).toHaveBeenCalledWith(mockHistory);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when validation fails', async () => {
      const mockValidator = {
        validate: jest.fn(),
        isValid: false,
        error: { message: 'Invalid query parameters' },
      };
      RateValidator.mockImplementation(() => mockValidator);

      req.query = { limit: 'invalid' };

      await RateController.getRateHistory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockRateService.getRateHistory).not.toHaveBeenCalled();
    });

    it('should validate req.query not req.body', async () => {
      const mockValidator = {
        validate: jest.fn(),
        isValid: true,
        value: { limit: 10 },
      };
      RateValidator.mockImplementation(() => mockValidator);

      mockRateService.getRateHistory.mockResolvedValue({ rates: [], total: 0 });
      RatePresenter.presentHistory = jest.fn().mockReturnValue({});

      req.query = { limit: '10' };
      req.body = { should_not_use: 'this' };

      await RateController.getRateHistory(req, res, next);

      expect(mockValidator.validate).toHaveBeenCalledWith(req.query);
      expect(mockValidator.validate).not.toHaveBeenCalledWith(req.body);
    });
  });

  describe('.getJobStatus', () => {
    it('should return job status for owned job', async () => {
      req.params = { jobId: 'job-123' };

      const mockJob = {
        id: 'job-123',
        data: { userId: 'user-123' },
        timestamp: 1612137600000,
        getState: jest.fn().mockResolvedValue('completed'),
        progress: jest.fn().mockReturnValue(100),
        returnvalue: {
          rates: {
            total_rates: 2,
            rates: [{ carrier: 'fedex', rate_amount: 15.50 }],
          },
        },
      };

      const mockQueue = {
        getJob: jest.fn().mockResolvedValue(mockJob),
      };
      workerClient.getQueue = jest.fn().mockReturnValue(mockQueue);

      const mockPresentation = { ...mockJob.returnvalue.rates };
      RatePresenter.presentComparison = jest.fn().mockReturnValue(mockPresentation);

      await RateController.getJobStatus(req, res, next);

      expect(workerClient.getQueue).toHaveBeenCalled();
      expect(mockQueue.getJob).toHaveBeenCalledWith('job-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        ResponseFormatter.formatSuccess(
          expect.objectContaining({
            job_id: 'job-123',
            state: 'completed',
            progress: 100,
            data: mockPresentation,
          }),
          req.id
        )
      );
    });

    it('should return 404 when job not found', async () => {
      req.params = { jobId: 'job-not-found' };

      const mockQueue = {
        getJob: jest.fn().mockResolvedValue(null),
      };
      workerClient.getQueue = jest.fn().mockReturnValue(mockQueue);

      await RateController.getJobStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith(
        ResponseFormatter.formatError('Job not found', req.id)
      );
    });

    it('should return 403 when accessing another user\'s job', async () => {
      req.params = { jobId: 'job-456' };
      req.user = { userId: 'user-123' };

      const mockJob = {
        id: 'job-456',
        data: { userId: 'user-999' }, // Different user
        getState: jest.fn(),
        progress: jest.fn(),
      };

      const mockQueue = {
        getJob: jest.fn().mockResolvedValue(mockJob),
      };
      workerClient.getQueue = jest.fn().mockReturnValue(mockQueue);

      await RateController.getJobStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith(
        ResponseFormatter.formatError('Forbidden: You do not have access to this job', req.id)
      );
      expect(mockJob.getState).not.toHaveBeenCalled();
    });
  });
});
