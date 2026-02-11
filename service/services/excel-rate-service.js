/* global logger */
const ExcelJS = require('exceljs');
const { s3Wrapper, S3KeyGenerator } = require('@shipsmart/s3');
const CarrierRateOrchestrator = require('./carriers/carrier-rate-orchestrator');
const ExcelRateJobRepository = require('../repositories/excel-rate-job-repository');
const { ValidationError, NotFoundError } = require('@shipsmart/errors');
const { VALIDATION_LIMITS, EXCEL_JOB_STATUS, TIMEOUTS, WorkerJobs, CURRENCY_DEFAULTS } = require('@shipsmart/constants');
const workerClient = require('../worker-client');

class ExcelRateService {
  constructor() {
    this.excelRateJobRepository = new ExcelRateJobRepository();
    this.orchestrator = new CarrierRateOrchestrator();
  }

  /**
   * Validate file extension
   * @param {String} filename - Filename to validate
   * @throws {ValidationError} If extension is not allowed
   */
  validateFileExtension(filename) {
    const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    if (!VALIDATION_LIMITS.EXCEL_ALLOWED_EXTENSIONS.includes(extension)) {
      throw new ValidationError(
        `Invalid file type. Only ${VALIDATION_LIMITS.EXCEL_ALLOWED_EXTENSIONS.join(', ')} files are allowed.`
      );
    }
  }

  /**
   * Parse Excel file and extract shipment data
   * @param {Buffer} fileBuffer - Excel file buffer
   * @returns {Promise<Object>} Object with headers and rows arrays
   * @throws {ValidationError} If parsing fails or validation errors
   */
  async parseExcelFile(fileBuffer) {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer);

      const worksheet = workbook.worksheets[0]; // First sheet only

      if (!worksheet) {
        throw new ValidationError('Excel file is empty or has no worksheets.');
      }

      const rows = [];
      const headers = [];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          // Extract headers
          row.eachCell((cell) => {
            headers.push(cell.value ? String(cell.value).toLowerCase().trim() : '');
          });
        } else {
          // Extract data rows
          const rowData = {};
          row.eachCell((cell, colNumber) => {
            const header = headers[colNumber - 1];
            rowData[header] = cell.value;
          });

          // Skip empty rows
          if (Object.values(rowData).some(val => val !== null && val !== undefined && val !== '')) {
            rows.push(rowData);
          }
        }
      });

      // Validate row count
      if (rows.length === 0) {
        throw new ValidationError('Excel file has no data rows.');
      }

      if (rows.length > VALIDATION_LIMITS.MAX_EXCEL_SHIPMENTS) {
        throw new ValidationError(
          `Excel file has ${rows.length} rows. Maximum allowed is ${VALIDATION_LIMITS.MAX_EXCEL_SHIPMENTS}.`
        );
      }

      logger.info(`Parsed Excel file: ${rows.length} rows`);
      return { headers, rows };
    } catch (error) {
      logger.error(`Failed to parse Excel file: ${error.message}`);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(`Failed to parse Excel file: ${error.message}`);
    }
  }

  /**
   * Validate a single shipment row
   * @param {Object} row - Row data
   * @param {Number} rowNumber - Row number (1-indexed)
   * @throws {ValidationError} If validation fails
   * @private
   */
  _validateShipmentRow(row, rowNumber) {
    const errors = [];

    // Required fields
    if (!row.origin_postal_code) {
      errors.push('origin_postal_code is required');
    }
    if (!row.destination_postal_code) {
      errors.push('destination_postal_code is required');
    }
    if (!row.weight || isNaN(Number(row.weight)) || Number(row.weight) <= 0) {
      errors.push('weight must be a positive number');
    }
    if (row.weight && Number(row.weight) > VALIDATION_LIMITS.MAX_WEIGHT_LB) {
      errors.push(`weight cannot exceed ${VALIDATION_LIMITS.MAX_WEIGHT_LB} lbs`);
    }

    // Optional dimension validation
    if (row.length && (isNaN(Number(row.length)) || Number(row.length) <= 0)) {
      errors.push('length must be a positive number');
    }
    if (row.width && (isNaN(Number(row.width)) || Number(row.width) <= 0)) {
      errors.push('width must be a positive number');
    }
    if (row.height && (isNaN(Number(row.height)) || Number(row.height) <= 0)) {
      errors.push('height must be a positive number');
    }

    if (errors.length > 0) {
      throw new ValidationError(`Row ${rowNumber}: ${errors.join(', ')}`);
    }
  }

  /**
   * Map Excel row to rate request format
   * @param {Object} row - Excel row data
   * @returns {Object} Rate request object
   * @private
   */
  _mapRowToRateRequest(row) {
    return {
      origin: {
        postal_code: String(row.origin_postal_code).trim(),
        country: row.origin_country ? String(row.origin_country).toUpperCase() : 'US',
      },
      destination: {
        postal_code: String(row.destination_postal_code).trim(),
        country: row.destination_country ? String(row.destination_country).toUpperCase() : 'US',
      },
      package: {
        weight: Number(row.weight),
        weight_unit: row.weight_unit || 'lb',
        length: row.length ? Number(row.length) : undefined,
        width: row.width ? Number(row.width) : undefined,
        height: row.height ? Number(row.height) : undefined,
        dimension_unit: row.dimension_unit || 'in',
        description: row.description,
        declared_value: row.declared_value ? Number(row.declared_value) : undefined,
      },
    };
  }

  /**
   * Process Excel file for rate comparisons
   * @param {Buffer} fileBuffer - Excel file buffer
   * @param {String} originalFilename - Original filename
   * @param {Number} userId - User ID
   * @param {String} requestId - Request ID for tracking
   * @param {String} jobId - Bull job ID
   * @returns {Promise<Object>} Processing result with job record
   */
  async processExcelRates(fileBuffer, originalFilename, userId, requestId, jobId) {
    try {
      // 1. Upload input file to S3
      const inputS3Key = S3KeyGenerator.generateUserKey(
        userId,
        originalFilename,
        'excel-rates/input'
      );

      await s3Wrapper.uploadToAWS(fileBuffer, inputS3Key, {
        ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      logger.info(`[${requestId}] Uploaded input Excel to S3: ${inputS3Key}`);

      // 2. Parse Excel
      const { headers, rows } = await this.parseExcelFile(fileBuffer);

      // 3. Create job record
      const excelJobRecord = await this.excelRateJobRepository.create({
        userId,
        jobId,
        originalFilename,
        inputS3Key,
        rowCount: rows.length,
        status: EXCEL_JOB_STATUS.PARSING,
      });

      logger.info(`[${requestId}] Created Excel rate job record: ${excelJobRecord.id}`);

      // 4. Transition to PROCESSING status
      await this.excelRateJobRepository.update(excelJobRecord.id, userId, {
        status: EXCEL_JOB_STATUS.PROCESSING,
      });

      // 5. Process each row
      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const rowNumber = i + 2; // +2 for 1-based + header row
        const row = rows[i];

        try {
          // Validate row
          this._validateShipmentRow(row, rowNumber);

          // Map to rate request
          const rateRequest = this._mapRowToRateRequest(row);

          // Fetch rates
          const rateComparison = await this.orchestrator.getRatesForShipment(
            userId,
            rateRequest,
            { forceRefresh: true }
          );

          results.push({
            ...row,
            status: 'success',
            cheapest_carrier: rateComparison.cheapest?.carrier || null,
            cheapest_service: rateComparison.cheapest?.service_name || null,
            cheapest_service_code: rateComparison.cheapest?.service_code || null,
            cheapest_rate: rateComparison.cheapest?.rate_amount || null,
            cheapest_currency: rateComparison.cheapest?.currency || CURRENCY_DEFAULTS.DEFAULT,
            cheapest_delivery_days: rateComparison.cheapest?.delivery_days || null,
            cheapest_estimated_date: rateComparison.cheapest?.estimated_delivery_date || null,
            fastest_carrier: rateComparison.fastest?.carrier || null,
            fastest_service: rateComparison.fastest?.service_name || null,
            fastest_service_code: rateComparison.fastest?.service_code || null,
            fastest_rate: rateComparison.fastest?.rate_amount || null,
            fastest_currency: rateComparison.fastest?.currency || CURRENCY_DEFAULTS.DEFAULT,
            fastest_delivery_days: rateComparison.fastest?.delivery_days || null,
            fastest_estimated_date: rateComparison.fastest?.estimated_delivery_date || null,
            total_carriers: rateComparison.total_carriers || 0,
            total_rates: rateComparison.total_rates || 0,
            potential_savings: rateComparison.potential_savings || 0,
            all_rates: rateComparison.all_rates || [],
            error_message: null,
          });

          successCount++;
          logger.info(`[${requestId}] Row ${rowNumber}: Success`);
        } catch (error) {
          results.push({
            ...row,
            status: 'error',
            cheapest_carrier: null,
            cheapest_service: null,
            cheapest_service_code: null,
            cheapest_rate: null,
            cheapest_currency: CURRENCY_DEFAULTS.DEFAULT,
            cheapest_delivery_days: null,
            cheapest_estimated_date: null,
            fastest_carrier: null,
            fastest_service: null,
            fastest_service_code: null,
            fastest_rate: null,
            fastest_currency: CURRENCY_DEFAULTS.DEFAULT,
            fastest_delivery_days: null,
            fastest_estimated_date: null,
            total_carriers: 0,
            total_rates: 0,
            potential_savings: 0,
            all_rates: [],
            error_message: error.message,
          });

          errorCount++;
          logger.warn(`[${requestId}] Row ${rowNumber}: Error - ${error.message}`);
        }

        // Update progress in job record
        await this.excelRateJobRepository.update(excelJobRecord.id, userId, {
          processedCount: i + 1,
        });
      }

      // 6. Transition to GENERATING status
      await this.excelRateJobRepository.update(excelJobRecord.id, userId, {
        status: EXCEL_JOB_STATUS.GENERATING,
      });

      // 7. Generate output Excel
      const outputBuffer = await this._generateOutputExcel(headers, results);

      // 8. Upload output file to S3
      const outputS3Key = S3KeyGenerator.generateUserKey(
        userId,
        originalFilename.replace(/\.(xlsx|xls)$/i, '_results.xlsx'),
        'excel-rates/output'
      );

      await s3Wrapper.uploadToAWS(outputBuffer, outputS3Key, {
        ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      logger.info(`[${requestId}] Uploaded output Excel to S3: ${outputS3Key}`);

      // 9. Update job record
      await this.excelRateJobRepository.update(excelJobRecord.id, userId, {
        outputS3Key,
        successCount,
        errorCount,
        processedCount: rows.length,
        status: EXCEL_JOB_STATUS.COMPLETED,
        completedAt: new Date(),
      });

      logger.info(`[${requestId}] Excel rate job completed: ${excelJobRecord.id}`);

      return {
        success: true,
        excelJobRecord: await this.excelRateJobRepository.findById(excelJobRecord.id, userId),
      };
    } catch (error) {
      logger.error(`[${requestId}] Failed to process Excel rates: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Generate output Excel file with rate results
   * @param {Array} inputHeaders - Original Excel headers
   * @param {Array} results - Processed results with rate data
   * @returns {Promise<Buffer>} Excel file buffer
   * @private
   */
  async _generateOutputExcel(inputHeaders, results) {
    const workbook = new ExcelJS.Workbook();

    // --- Sheet 1: Rate Comparison Results (Summary) ---
    const worksheet = workbook.addWorksheet('Rate Comparison Results');

    // Define output columns (input + output)
    const outputHeaders = [
      ...inputHeaders,
      'status',
      'cheapest_carrier',
      'cheapest_service',
      'cheapest_service_code',
      'cheapest_rate',
      'cheapest_currency',
      'cheapest_delivery_days',
      'cheapest_estimated_date',
      'fastest_carrier',
      'fastest_service',
      'fastest_service_code',
      'fastest_rate',
      'fastest_currency',
      'fastest_delivery_days',
      'fastest_estimated_date',
      'total_carriers',
      'total_rates',
      'potential_savings',
      'error_message',
    ];

    // Add header row with styling
    const headerRow = worksheet.addRow(outputHeaders);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    headerRow.height = 20;

    // Add data rows
    results.forEach((result) => {
      const rowData = outputHeaders.map(header => result[header] ?? null);
      const dataRow = worksheet.addRow(rowData);

      // Style based on status
      if (result.status === 'success') {
        dataRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE2EFDA' },
        };

        // Bold green for cheapest rate
        const cheapestRateColIndex = outputHeaders.indexOf('cheapest_rate') + 1;
        dataRow.getCell(cheapestRateColIndex).font = {
          bold: true,
          color: { argb: 'FF375623' },
        };
      } else if (result.status === 'error') {
        dataRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFCE4D6' },
        };
      }
    });

    // Auto-width summary columns
    worksheet.columns.forEach((column) => {
      let maxLength = 10;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellLength = cell.value ? String(cell.value).length : 0;
        maxLength = Math.max(maxLength, cellLength);
      });
      column.width = Math.min(maxLength + 2, 50);
    });

    // --- Sheet 2: All Rates Detail ---
    const detailSheet = workbook.addWorksheet('All Rates Detail');

    const detailHeaders = [
      'shipment_row',
      'carrier',
      'service_name',
      'service_code',
      'rate',
      'currency',
      'delivery_days',
      'estimated_delivery_date',
    ];

    // Add detail header row with styling
    const detailHeaderRow = detailSheet.addRow(detailHeaders);
    detailHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    detailHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2F5496' },
    };
    detailHeaderRow.height = 20;

    // Add detail data rows
    results.forEach((result, index) => {
      const shipmentRow = index + 2; // +2 for 1-based + header row

      if (result.all_rates && result.all_rates.length > 0) {
        result.all_rates.forEach((rate) => {
          const detailRowData = [
            shipmentRow,
            rate.carrier,
            rate.service_name,
            rate.service_code,
            rate.rate_amount,
            rate.currency || CURRENCY_DEFAULTS.DEFAULT,
            rate.delivery_days,
            rate.estimated_delivery_date,
          ];

          const detailDataRow = detailSheet.addRow(detailRowData);
          detailDataRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD6E4F0' },
          };
        });
      }
    });

    // Auto-width detail columns
    detailSheet.columns.forEach((column) => {
      let maxLength = 10;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellLength = cell.value ? String(cell.value).length : 0;
        maxLength = Math.max(maxLength, cellLength);
      });
      column.width = Math.min(maxLength + 2, 50);
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  /**
   * Get job status from Bull queue with ownership verification
   * @param {String} jobId - Bull job ID
   * @param {Number} userId - User ID for ownership verification
   * @returns {Promise<Object>} Job status response
   * @throws {NotFoundError} If job not found or not owned by user
   */
  async getJobStatus(jobId, userId) {
    const queue = workerClient.getQueue(WorkerJobs.EXCEL_RATE_FETCH);
    const job = await queue.getJob(jobId);

    if (!job) {
      throw new NotFoundError('Job not found');
    }

    // Security: Verify job ownership
    if (!job.data || job.data.userId !== userId) {
      throw new NotFoundError('Job not found');
    }

    const state = await job.getState();
    const progress = job.progress();

    const response = {
      job_id: job.id,
      state,
      progress,
      created_at: job.timestamp,
    };

    // If completed, look up job record from DB for results
    if (state === 'completed') {
      const excelJobRecord = await this.excelRateJobRepository.findByJobId(jobId, userId);
      if (excelJobRecord && excelJobRecord.output_s3_key) {
        const downloadUrl = await this.getDownloadUrl(
          excelJobRecord.output_s3_key,
          excelJobRecord.original_filename
        );

        response.data = {
          original_filename: excelJobRecord.original_filename,
          row_count: excelJobRecord.row_count,
          success_count: excelJobRecord.success_count,
          error_count: excelJobRecord.error_count,
          download_url: downloadUrl,
          download_expires_in: TIMEOUTS.S3_DOWNLOAD_URL_EXPIRY,
        };
      }
    }

    // If failed, include error
    if (state === 'failed') {
      response.error = job.failedReason || 'Job processing failed';
    }

    return response;
  }

  /**
   * Get download URL for output Excel file
   * @param {String} outputS3Key - S3 key for output file
   * @param {String} originalFilename - Original filename
   * @returns {Promise<String>} Signed S3 URL
   */
  async getDownloadUrl(outputS3Key, originalFilename) {
    const bucketName = s3Wrapper.getS3BucketName();
    const url = await s3Wrapper.getPublicUrl(
      bucketName,
      outputS3Key,
      true, // includeContentDisposition for download
      TIMEOUTS.S3_DOWNLOAD_URL_EXPIRY
    );

    return url;
  }

  /**
   * Get download URL by job ID (with ownership check)
   * @param {String} jobId - Bull job ID
   * @param {Number} userId - User ID for ownership verification
   * @returns {Promise<String>} Signed S3 URL
   * @throws {NotFoundError} If job not found or not owned by user
   * @throws {ValidationError} If output not ready
   */
  async getDownloadUrlByJobId(jobId, userId) {
    const excelJobRecord = await this.excelRateJobRepository.findByJobId(jobId, userId);

    if (!excelJobRecord) {
      throw new NotFoundError('Job not found');
    }

    if (!excelJobRecord.output_s3_key) {
      throw new ValidationError('Job output is not ready yet');
    }

    return this.getDownloadUrl(excelJobRecord.output_s3_key, excelJobRecord.original_filename);
  }
}

module.exports = new ExcelRateService();
