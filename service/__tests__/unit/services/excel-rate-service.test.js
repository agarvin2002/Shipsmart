/* global logger */

// Mock uuid before anything else
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

// Mock all dependencies BEFORE requiring
jest.mock('exceljs');
jest.mock('@shipsmart/s3');
jest.mock('../../../repositories/excel-rate-job-repository');
jest.mock('../../../services/carriers/carrier-rate-orchestrator');
jest.mock('../../../worker-client');

const ExcelJS = require('exceljs');
const { s3Wrapper, S3KeyGenerator } = require('@shipsmart/s3');
const ExcelRateJobRepository = require('../../../repositories/excel-rate-job-repository');
const CarrierRateOrchestrator = require('../../../services/carriers/carrier-rate-orchestrator');
const workerClient = require('../../../worker-client');
const { ValidationError, NotFoundError } = require('@shipsmart/errors');
const {
  EXCEL_FILES,
  MOCK_RATE_COMPARISONS,
  MOCK_EXCEL_JOBS,
  MOCK_EXCEL_BUFFERS,
  MOCK_S3_KEYS,
  MOCK_S3_URLS,
} = require('../../utils/excel-rate-fixtures');

// Import service AFTER all mocks are set up
const service = require('../../../services/excel-rate-service');

describe('ExcelRateService', () => {
  let mockRepository;
  let mockOrchestrator;
  let mockWorkbook;
  let mockWorksheet;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup global logger
    global.logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    // Setup repository mock
    mockRepository = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findByJobId: jest.fn(),
    };
    ExcelRateJobRepository.mockImplementation(() => mockRepository);

    // Setup orchestrator mock
    mockOrchestrator = {
      getRatesForShipment: jest.fn(),
    };
    CarrierRateOrchestrator.mockImplementation(() => mockOrchestrator);

    // Setup ExcelJS mocks
    mockWorksheet = {
      eachRow: jest.fn(),
      addRow: jest.fn(() => ({
        font: {},
        fill: {},
        height: 0,
        getCell: jest.fn(() => ({ font: {} })),
      })),
      columns: [],
    };

    mockWorkbook = {
      addWorksheet: jest.fn(() => mockWorksheet),
      xlsx: {
        load: jest.fn().mockResolvedValue(undefined),
        writeBuffer: jest.fn().mockResolvedValue(Buffer.from('output excel')),
      },
      worksheets: [mockWorksheet],
    };

    ExcelJS.Workbook = jest.fn(() => mockWorkbook);

    // Setup S3 mocks
    s3Wrapper.uploadToAWS = jest.fn().mockResolvedValue({ Location: MOCK_S3_URLS.UPLOAD });
    s3Wrapper.getPublicUrl = jest.fn().mockResolvedValue(MOCK_S3_URLS.SIGNED);
    s3Wrapper.getS3BucketName = jest.fn().mockReturnValue('test-bucket');
    S3KeyGenerator.generateUserKey = jest.fn((userId, filename, path) =>
      `${path}/user_${userId}/${filename}`
    );

    // Setup worker client mock
    const mockQueue = {
      getJob: jest.fn(),
    };
    workerClient.getQueue = jest.fn().mockReturnValue(mockQueue);
  });

  afterEach(() => {
    delete global.logger;
  });

  describe('#validateFileExtension', () => {
    it('should accept .xlsx extension', () => {
      expect(() => service.validateFileExtension('rates.xlsx')).not.toThrow();
    });

    it('should accept .xls extension', () => {
      expect(() => service.validateFileExtension('rates.xls')).not.toThrow();
    });

    it('should accept mixed case .XLSX', () => {
      expect(() => service.validateFileExtension('rates.XLSX')).not.toThrow();
    });

    it('should throw ValidationError for .pdf extension', () => {
      expect(() => service.validateFileExtension('rates.pdf')).toThrow(ValidationError);
      expect(() => service.validateFileExtension('rates.pdf')).toThrow(
        /Invalid file type/
      );
    });

    it('should throw ValidationError for .csv extension', () => {
      expect(() => service.validateFileExtension('rates.csv')).toThrow(ValidationError);
    });

    it('should throw ValidationError for no extension', () => {
      expect(() => service.validateFileExtension('rates')).toThrow(ValidationError);
    });

    it('should throw ValidationError for .doc extension', () => {
      expect(() => service.validateFileExtension('rates.doc')).toThrow(ValidationError);
    });
  });

  describe('#parseExcelFile', () => {
    it('should parse valid Excel with 5 rows', async () => {
      const mockData = EXCEL_FILES.VALID_MULTIPLE;
      mockWorksheet.eachRow = jest.fn((callback) => {
        // Call callback for header row
        const headerRow = {
          eachCell: jest.fn((cellCallback) => {
            mockData.headers.forEach((header, index) => {
              cellCallback({ value: header }, index + 1);
            });
          }),
        };
        callback(headerRow, 1);

        // Call callback for data rows
        mockData.rows.forEach((row, rowIndex) => {
          const dataRow = {
            eachCell: jest.fn((cellCallback) => {
              mockData.headers.forEach((header, colIndex) => {
                cellCallback({ value: row[header] || null }, colIndex + 1);
              });
            }),
          };
          callback(dataRow, rowIndex + 2);
        });
      });

      const result = await service.parseExcelFile(MOCK_EXCEL_BUFFERS.VALID);

      expect(result.headers).toEqual(mockData.headers);
      expect(result.rows).toHaveLength(3);
      expect(global.logger.info).toHaveBeenCalledWith(expect.stringContaining('Parsed Excel file: 3 rows'));
    });

    it('should skip empty rows', async () => {
      mockWorksheet.eachRow = jest.fn((callback) => {
        // Header row
        callback({
          eachCell: jest.fn((cellCallback) => {
            cellCallback({ value: 'origin_postal_code' }, 1);
            cellCallback({ value: 'destination_postal_code' }, 2);
            cellCallback({ value: 'weight' }, 3);
          }),
        }, 1);

        // Valid row
        callback({
          eachCell: jest.fn((cellCallback) => {
            cellCallback({ value: '10001' }, 1);
            cellCallback({ value: '90210' }, 2);
            cellCallback({ value: 10 }, 3);
          }),
        }, 2);

        // Empty row (all null)
        callback({
          eachCell: jest.fn((cellCallback) => {
            cellCallback({ value: null }, 1);
            cellCallback({ value: null }, 2);
            cellCallback({ value: null }, 3);
          }),
        }, 3);

        // Another valid row
        callback({
          eachCell: jest.fn((cellCallback) => {
            cellCallback({ value: '30301' }, 1);
            cellCallback({ value: '60601' }, 2);
            cellCallback({ value: 5 }, 3);
          }),
        }, 4);
      });

      const result = await service.parseExcelFile(MOCK_EXCEL_BUFFERS.VALID);

      expect(result.rows).toHaveLength(2); // Only 2 non-empty rows
    });

    it('should throw ValidationError for empty file (no worksheets)', async () => {
      mockWorkbook.worksheets = [];

      await expect(service.parseExcelFile(MOCK_EXCEL_BUFFERS.EMPTY)).rejects.toThrow(
        ValidationError
      );
      await expect(service.parseExcelFile(MOCK_EXCEL_BUFFERS.EMPTY)).rejects.toThrow(
        /Excel file is empty or has no worksheets/
      );
    });

    it('should throw ValidationError for file with no data rows', async () => {
      mockWorksheet.eachRow = jest.fn((callback) => {
        // Only header row
        callback({
          eachCell: jest.fn((cellCallback) => {
            cellCallback({ value: 'origin_postal_code' }, 1);
          }),
        }, 1);
      });

      await expect(service.parseExcelFile(MOCK_EXCEL_BUFFERS.VALID)).rejects.toThrow(
        /Excel file has no data rows/
      );
    });

    it('should throw ValidationError when row count exceeds max (11 rows)', async () => {
      mockWorksheet.eachRow = jest.fn((callback) => {
        // Header
        callback({
          eachCell: jest.fn((cellCallback) => {
            cellCallback({ value: 'origin_postal_code' }, 1);
          }),
        }, 1);

        // 11 data rows
        for (let i = 0; i < 11; i++) {
          callback({
            eachCell: jest.fn((cellCallback) => {
              cellCallback({ value: '10001' }, 1);
              cellCallback({ value: '90210' }, 2);
              cellCallback({ value: 10 }, 3);
            }),
          }, i + 2);
        }
      });

      await expect(service.parseExcelFile(MOCK_EXCEL_BUFFERS.VALID)).rejects.toThrow(
        /Maximum allowed is 10/
      );
    });

    it('should handle Excel parsing errors gracefully', async () => {
      mockWorkbook.xlsx.load = jest.fn().mockRejectedValue(new Error('Corrupt file'));

      await expect(service.parseExcelFile(MOCK_EXCEL_BUFFERS.VALID)).rejects.toThrow(
        ValidationError
      );
      await expect(service.parseExcelFile(MOCK_EXCEL_BUFFERS.VALID)).rejects.toThrow(
        /Failed to parse Excel file/
      );
      expect(global.logger.error).toHaveBeenCalled();
    });
  });

  describe('#_validateShipmentRow', () => {
    it('should pass validation for valid row with all required fields', () => {
      const validRow = {
        origin_postal_code: '10001',
        destination_postal_code: '90210',
        weight: 10,
      };

      expect(() => service._validateShipmentRow(validRow, 2)).not.toThrow();
    });

    it('should pass validation for row with optional fields', () => {
      const validRow = {
        origin_postal_code: '10001',
        destination_postal_code: '90210',
        weight: 10,
        length: 12,
        width: 8,
        height: 6,
      };

      expect(() => service._validateShipmentRow(validRow, 2)).not.toThrow();
    });

    it('should throw ValidationError when origin_postal_code is missing', () => {
      const invalidRow = {
        destination_postal_code: '90210',
        weight: 10,
      };

      expect(() => service._validateShipmentRow(invalidRow, 2)).toThrow(ValidationError);
      expect(() => service._validateShipmentRow(invalidRow, 2)).toThrow(
        /Row 2: origin_postal_code is required/
      );
    });

    it('should throw ValidationError when destination_postal_code is missing', () => {
      const invalidRow = {
        origin_postal_code: '10001',
        weight: 10,
      };

      expect(() => service._validateShipmentRow(invalidRow, 2)).toThrow(
        /destination_postal_code is required/
      );
    });

    it('should throw ValidationError when weight is missing', () => {
      const invalidRow = {
        origin_postal_code: '10001',
        destination_postal_code: '90210',
      };

      expect(() => service._validateShipmentRow(invalidRow, 2)).toThrow(
        /weight must be a positive number/
      );
    });

    it('should throw ValidationError when weight is not a number', () => {
      const invalidRow = {
        origin_postal_code: '10001',
        destination_postal_code: '90210',
        weight: 'heavy',
      };

      expect(() => service._validateShipmentRow(invalidRow, 2)).toThrow(
        /weight must be a positive number/
      );
    });

    it('should throw ValidationError when weight is zero or negative', () => {
      const invalidRow = {
        origin_postal_code: '10001',
        destination_postal_code: '90210',
        weight: 0,
      };

      expect(() => service._validateShipmentRow(invalidRow, 2)).toThrow(
        /weight must be a positive number/
      );
    });

    it('should throw ValidationError when weight exceeds max (150 lb)', () => {
      const invalidRow = {
        origin_postal_code: '10001',
        destination_postal_code: '90210',
        weight: 200,
      };

      expect(() => service._validateShipmentRow(invalidRow, 2)).toThrow(
        /weight cannot exceed 150 lbs/
      );
    });

    it('should throw ValidationError when length is not a number', () => {
      const invalidRow = {
        origin_postal_code: '10001',
        destination_postal_code: '90210',
        weight: 10,
        length: 'long',
      };

      expect(() => service._validateShipmentRow(invalidRow, 2)).toThrow(
        /length must be a positive number/
      );
    });

    it('should include row number in error message', () => {
      const invalidRow = {
        destination_postal_code: '90210',
      };

      expect(() => service._validateShipmentRow(invalidRow, 5)).toThrow(/Row 5:/);
    });

    it('should combine multiple validation errors', () => {
      const invalidRow = {
        weight: 'not a number',
      };

      expect(() => service._validateShipmentRow(invalidRow, 2)).toThrow(
        /origin_postal_code is required, destination_postal_code is required, weight must be a positive number/
      );
    });
  });

  describe('#_mapRowToRateRequest', () => {
    it('should map all fields correctly with defaults', () => {
      const row = {
        origin_postal_code: '10001',
        destination_postal_code: '90210',
        weight: 10,
      };

      const result = service._mapRowToRateRequest(row);

      expect(result).toEqual({
        origin: {
          postal_code: '10001',
          country: 'US', // Default
        },
        destination: {
          postal_code: '90210',
          country: 'US', // Default
        },
        package: {
          weight: 10,
          weight_unit: 'lb', // Default
          length: undefined,
          width: undefined,
          height: undefined,
          dimension_unit: 'in', // Default
          description: undefined,
          declared_value: undefined,
        },
      });
    });

    it('should map optional fields when provided', () => {
      const row = {
        origin_postal_code: '10001',
        destination_postal_code: '90210',
        weight: 10,
        length: 12,
        width: 8,
        height: 6,
        description: 'Electronics',
        declared_value: 500,
      };

      const result = service._mapRowToRateRequest(row);

      expect(result.package).toMatchObject({
        length: 12,
        width: 8,
        height: 6,
        description: 'Electronics',
        declared_value: 500,
      });
    });

    it('should uppercase country codes', () => {
      const row = {
        origin_postal_code: '10001',
        destination_postal_code: 'SW1A 1AA',
        weight: 10,
        origin_country: 'us',
        destination_country: 'gb',
      };

      const result = service._mapRowToRateRequest(row);

      expect(result.origin.country).toBe('US');
      expect(result.destination.country).toBe('GB');
    });

    it('should trim postal codes', () => {
      const row = {
        origin_postal_code: '  10001  ',
        destination_postal_code: '  90210  ',
        weight: 10,
      };

      const result = service._mapRowToRateRequest(row);

      expect(result.origin.postal_code).toBe('10001');
      expect(result.destination.postal_code).toBe('90210');
    });
  });

  describe('#getJobStatus', () => {
    it('should return completed job with download URL', async () => {
      const mockJob = {
        id: 'bull-job-123',
        data: { userId: 'user-123' },
        getState: jest.fn().mockResolvedValue('completed'),
        progress: jest.fn().mockReturnValue(100),
        timestamp: 1710000000000,
      };

      workerClient.getQueue().getJob = jest.fn().mockResolvedValue(mockJob);

      // Access the actual repository instance created by the service
      service.excelRateJobRepository.findByJobId = jest.fn().mockResolvedValue(MOCK_EXCEL_JOBS.COMPLETED);

      const result = await service.getJobStatus('bull-job-123', 'user-123');

      expect(result).toMatchObject({
        job_id: 'bull-job-123',
        state: 'completed',
        progress: 100,
        created_at: 1710000000000,
        data: {
          original_filename: 'rates.xlsx',
          row_count: 5,
          success_count: 4,
          error_count: 1,
          download_url: expect.any(String),
          download_expires_in: 172800,
        },
      });
      expect(s3Wrapper.getPublicUrl).toHaveBeenCalled();
    });

    it('should return in-progress job without data', async () => {
      const mockJob = {
        id: 'bull-job-123',
        data: { userId: 'user-123' },
        getState: jest.fn().mockResolvedValue('active'),
        progress: jest.fn().mockReturnValue(45),
        timestamp: 1710000000000,
      };

      workerClient.getQueue().getJob = jest.fn().mockResolvedValue(mockJob);

      const result = await service.getJobStatus('bull-job-123', 'user-123');

      expect(result).toEqual({
        job_id: 'bull-job-123',
        state: 'active',
        progress: 45,
        created_at: 1710000000000,
      });
      expect(mockRepository.findByJobId).not.toHaveBeenCalled();
    });

    it('should return failed job with error message', async () => {
      const mockJob = {
        id: 'bull-job-123',
        data: { userId: 'user-123' },
        getState: jest.fn().mockResolvedValue('failed'),
        progress: jest.fn().mockReturnValue(20),
        timestamp: 1710000000000,
        failedReason: 'S3 upload failed',
      };

      workerClient.getQueue().getJob = jest.fn().mockResolvedValue(mockJob);

      const result = await service.getJobStatus('bull-job-123', 'user-123');

      expect(result).toMatchObject({
        state: 'failed',
        error: 'S3 upload failed',
      });
    });

    it('should throw NotFoundError when job not found in queue', async () => {
      workerClient.getQueue().getJob = jest.fn().mockResolvedValue(null);

      await expect(service.getJobStatus('bull-job-not-found', 'user-123')).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw NotFoundError when job belongs to different user', async () => {
      const mockJob = {
        id: 'bull-job-123',
        data: { userId: 'user-999' }, // Different user
        getState: jest.fn(),
        progress: jest.fn(),
      };

      workerClient.getQueue().getJob = jest.fn().mockResolvedValue(mockJob);

      await expect(service.getJobStatus('bull-job-123', 'user-123')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('#getDownloadUrl', () => {
    it('should return signed S3 URL', async () => {
      const result = await service.getDownloadUrl(
        MOCK_S3_KEYS.OUTPUT,
        'rates.xlsx'
      );

      expect(s3Wrapper.getS3BucketName).toHaveBeenCalled();
      expect(s3Wrapper.getPublicUrl).toHaveBeenCalledWith(
        'test-bucket',
        MOCK_S3_KEYS.OUTPUT,
        true, // includeContentDisposition
        172800 // TIMEOUTS.S3_DOWNLOAD_URL_EXPIRY
      );
      expect(result).toBe(MOCK_S3_URLS.SIGNED);
    });
  });

  describe('#_generateOutputExcel', () => {
    let mockDetailWorksheet;

    beforeEach(() => {
      // Setup detail worksheet mock separately
      mockDetailWorksheet = {
        addRow: jest.fn(() => ({
          font: {},
          fill: {},
          height: 0,
          getCell: jest.fn(() => ({ font: {} })),
        })),
        columns: [],
      };

      // Return different worksheet objects based on name
      mockWorkbook.addWorksheet = jest.fn((name) => {
        if (name === 'All Rates Detail') return mockDetailWorksheet;
        return mockWorksheet;
      });
    });

    it('should create two worksheets - summary and detail', async () => {
      const results = [{
        origin_postal_code: '10001',
        destination_postal_code: '90210',
        weight: 10,
        status: 'success',
        cheapest_carrier: 'fedex',
        cheapest_service: 'FedEx Ground',
        cheapest_service_code: 'FEDEX_GROUND',
        cheapest_rate: 15.50,
        cheapest_currency: 'USD',
        cheapest_delivery_days: 3,
        cheapest_estimated_date: '2024-03-15',
        fastest_carrier: 'fedex',
        fastest_service: 'FedEx 2Day',
        fastest_service_code: 'FEDEX_2_DAY',
        fastest_rate: 35.00,
        fastest_currency: 'USD',
        fastest_delivery_days: 2,
        fastest_estimated_date: '2024-03-14',
        total_carriers: 4,
        total_rates: 8,
        potential_savings: 29.50,
        all_rates: MOCK_RATE_COMPARISONS.SUCCESS.all_rates,
        error_message: null,
      }];

      await service._generateOutputExcel(
        ['origin_postal_code', 'destination_postal_code', 'weight'],
        results
      );

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledTimes(2);
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Rate Comparison Results');
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('All Rates Detail');
    });

    it('should include all enhanced summary headers', async () => {
      const results = [{
        status: 'success',
        all_rates: [],
        error_message: null,
      }];

      await service._generateOutputExcel([], results);

      // First addRow call on summary sheet is the header row
      const headerCall = mockWorksheet.addRow.mock.calls[0][0];
      expect(headerCall).toContain('cheapest_service_code');
      expect(headerCall).toContain('cheapest_delivery_days');
      expect(headerCall).toContain('cheapest_estimated_date');
      expect(headerCall).toContain('fastest_service_code');
      expect(headerCall).toContain('fastest_rate');
      expect(headerCall).toContain('fastest_currency');
      expect(headerCall).toContain('fastest_estimated_date');
      expect(headerCall).toContain('potential_savings');
    });

    it('should add one detail row per rate in all_rates', async () => {
      const allRates = MOCK_RATE_COMPARISONS.SUCCESS.all_rates;
      const results = [{
        status: 'success',
        all_rates: allRates,
        error_message: null,
      }];

      await service._generateOutputExcel([], results);

      // Detail sheet: 1 header row + N rate rows
      expect(mockDetailWorksheet.addRow).toHaveBeenCalledTimes(allRates.length + 1);
    });

    it('should include correct detail headers', async () => {
      const results = [{
        status: 'success',
        all_rates: MOCK_RATE_COMPARISONS.SUCCESS.all_rates,
        error_message: null,
      }];

      await service._generateOutputExcel([], results);

      const detailHeaderCall = mockDetailWorksheet.addRow.mock.calls[0][0];
      expect(detailHeaderCall).toEqual([
        'shipment_row',
        'carrier',
        'service_name',
        'service_code',
        'rate',
        'currency',
        'delivery_days',
        'estimated_delivery_date',
      ]);
    });

    it('should map detail row data correctly with shipment_row reference', async () => {
      const allRates = MOCK_RATE_COMPARISONS.SUCCESS.all_rates;
      const results = [{
        status: 'success',
        all_rates: allRates,
        error_message: null,
      }];

      await service._generateOutputExcel([], results);

      // First data row (index 1 since index 0 is header)
      const firstDataRow = mockDetailWorksheet.addRow.mock.calls[1][0];
      expect(firstDataRow).toEqual([
        2, // shipment_row (index 0 + 2)
        allRates[0].carrier,
        allRates[0].service_name,
        allRates[0].service_code,
        allRates[0].rate_amount,
        allRates[0].currency,
        allRates[0].delivery_days,
        allRates[0].estimated_delivery_date,
      ]);
    });

    it('should not add detail rows for error results', async () => {
      const results = [{
        status: 'error',
        all_rates: [],
        error_message: 'No carriers found',
      }];

      await service._generateOutputExcel([], results);

      // Only header row on detail sheet
      expect(mockDetailWorksheet.addRow).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple shipments with different rate counts', async () => {
      const results = [
        {
          status: 'success',
          all_rates: MOCK_RATE_COMPARISONS.SUCCESS.all_rates, // 4 rates
          error_message: null,
        },
        {
          status: 'error',
          all_rates: [],
          error_message: 'Failed',
        },
        {
          status: 'success',
          all_rates: MOCK_RATE_COMPARISONS.SUCCESS_UPS.all_rates, // 4 rates
          error_message: null,
        },
      ];

      await service._generateOutputExcel([], results);

      // Detail sheet: 1 header + 4 rates (shipment 1) + 0 (error) + 4 rates (shipment 3) = 9
      expect(mockDetailWorksheet.addRow).toHaveBeenCalledTimes(9);

      // Verify shipment_row references: shipment 1 = row 2, shipment 3 = row 4
      const thirdShipmentFirstRate = mockDetailWorksheet.addRow.mock.calls[5][0];
      expect(thirdShipmentFirstRate[0]).toBe(4); // row 4 (index 2 + 2)
    });
  });

  describe('#getDownloadUrlByJobId', () => {
    it('should return download URL for completed job', async () => {
      service.excelRateJobRepository.findByJobId = jest.fn().mockResolvedValue(MOCK_EXCEL_JOBS.COMPLETED);

      const result = await service.getDownloadUrlByJobId('bull-job-123', 'user-123');

      expect(service.excelRateJobRepository.findByJobId).toHaveBeenCalledWith('bull-job-123', 'user-123');
      expect(result).toBe(MOCK_S3_URLS.SIGNED);
    });

    it('should throw NotFoundError when job not found', async () => {
      service.excelRateJobRepository.findByJobId = jest.fn().mockResolvedValue(null);

      await expect(
        service.getDownloadUrlByJobId('bull-job-not-found', 'user-123')
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when output not ready', async () => {
      const jobWithoutOutput = { ...MOCK_EXCEL_JOBS.PROCESSING, output_s3_key: null };
      service.excelRateJobRepository.findByJobId = jest.fn().mockResolvedValue(jobWithoutOutput);

      await expect(
        service.getDownloadUrlByJobId('bull-job-123', 'user-123')
      ).rejects.toThrow(ValidationError);
      await expect(
        service.getDownloadUrlByJobId('bull-job-123', 'user-123')
      ).rejects.toThrow(/Job output is not ready yet/);
    });
  });
});
