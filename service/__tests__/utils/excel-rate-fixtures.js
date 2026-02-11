/**
 * Test fixtures for Excel Rate feature
 * Reusable mock data for Excel files, rate comparisons, and job records
 */

const EXCEL_FILES = {
  VALID_SIMPLE: {
    headers: ['origin_postal_code', 'destination_postal_code', 'weight'],
    rows: [
      {
        origin_postal_code: '10001',
        destination_postal_code: '90210',
        weight: 10,
      },
    ],
  },
  VALID_MULTIPLE: {
    headers: ['origin_postal_code', 'destination_postal_code', 'weight', 'length', 'width', 'height'],
    rows: [
      {
        origin_postal_code: '10001',
        destination_postal_code: '90210',
        weight: 10,
        length: 12,
        width: 8,
        height: 6,
      },
      {
        origin_postal_code: '30301',
        destination_postal_code: '60601',
        weight: 5,
      },
      {
        origin_postal_code: '94102',
        destination_postal_code: '02101',
        weight: 15,
      },
    ],
  },
  VALID_WITH_OPTIONALS: {
    headers: [
      'origin_postal_code',
      'destination_postal_code',
      'weight',
      'weight_unit',
      'length',
      'width',
      'height',
      'dimension_unit',
      'origin_country',
      'destination_country',
      'description',
      'declared_value',
    ],
    rows: [
      {
        origin_postal_code: '10001',
        destination_postal_code: '90210',
        weight: 10,
        weight_unit: 'lb',
        length: 12,
        width: 8,
        height: 6,
        dimension_unit: 'in',
        origin_country: 'US',
        destination_country: 'US',
        description: 'Electronics',
        declared_value: 500,
      },
    ],
  },
  VALID_MAX_ROWS: {
    headers: ['origin_postal_code', 'destination_postal_code', 'weight'],
    rows: Array(10).fill(null).map((_, index) => ({
      origin_postal_code: '10001',
      destination_postal_code: '90210',
      weight: 5 + index,
    })),
  },
  INVALID_MISSING_WEIGHT: {
    headers: ['origin_postal_code', 'destination_postal_code'],
    rows: [
      {
        origin_postal_code: '10001',
        destination_postal_code: '90210',
      },
    ],
  },
  INVALID_MISSING_ORIGIN: {
    headers: ['destination_postal_code', 'weight'],
    rows: [
      {
        destination_postal_code: '90210',
        weight: 10,
      },
    ],
  },
  INVALID_MISSING_DESTINATION: {
    headers: ['origin_postal_code', 'weight'],
    rows: [
      {
        origin_postal_code: '10001',
        weight: 10,
      },
    ],
  },
  INVALID_EXCEEDS_MAX_ROWS: {
    headers: ['origin_postal_code', 'destination_postal_code', 'weight'],
    rows: Array(11).fill(null).map((_, index) => ({
      origin_postal_code: '10001',
      destination_postal_code: '90210',
      weight: 10,
    })),
  },
  INVALID_WEIGHT_NOT_NUMBER: {
    headers: ['origin_postal_code', 'destination_postal_code', 'weight'],
    rows: [
      {
        origin_postal_code: '10001',
        destination_postal_code: '90210',
        weight: 'heavy',
      },
    ],
  },
  INVALID_WEIGHT_EXCEEDS_MAX: {
    headers: ['origin_postal_code', 'destination_postal_code', 'weight'],
    rows: [
      {
        origin_postal_code: '10001',
        destination_postal_code: '90210',
        weight: 200, // Exceeds MAX_WEIGHT_LB (150)
      },
    ],
  },
  INVALID_WEIGHT_ZERO: {
    headers: ['origin_postal_code', 'destination_postal_code', 'weight'],
    rows: [
      {
        origin_postal_code: '10001',
        destination_postal_code: '90210',
        weight: 0,
      },
    ],
  },
  INVALID_WEIGHT_NEGATIVE: {
    headers: ['origin_postal_code', 'destination_postal_code', 'weight'],
    rows: [
      {
        origin_postal_code: '10001',
        destination_postal_code: '90210',
        weight: -5,
      },
    ],
  },
  EMPTY_ROWS: {
    headers: ['origin_postal_code', 'destination_postal_code', 'weight'],
    rows: [],
  },
  PARTIAL_VALID: {
    headers: ['origin_postal_code', 'destination_postal_code', 'weight'],
    rows: [
      {
        origin_postal_code: '10001',
        destination_postal_code: '90210',
        weight: 10,
      },
      {
        origin_postal_code: '30301',
        destination_postal_code: '60601',
        // Missing weight - invalid
      },
      {
        origin_postal_code: '94102',
        destination_postal_code: '02101',
        weight: 5,
      },
    ],
  },
};

const MOCK_RATE_COMPARISONS = {
  SUCCESS: {
    cheapest: {
      carrier: 'fedex',
      service_name: 'FedEx Ground',
      service_code: 'FEDEX_GROUND',
      rate_amount: 15.50,
      currency: 'USD',
      delivery_days: 3,
      estimated_delivery_date: '2024-03-15',
    },
    fastest: {
      carrier: 'fedex',
      service_name: 'FedEx 2Day',
      service_code: 'FEDEX_2_DAY',
      rate_amount: 35.00,
      currency: 'USD',
      delivery_days: 2,
      estimated_delivery_date: '2024-03-14',
    },
    total_carriers: 4,
    total_rates: 8,
    potential_savings: 29.50,
    all_rates: [
      {
        carrier: 'fedex',
        service_name: 'FedEx Ground',
        service_code: 'FEDEX_GROUND',
        rate_amount: 15.50,
        currency: 'USD',
        delivery_days: 3,
        estimated_delivery_date: '2024-03-15',
      },
      {
        carrier: 'ups',
        service_name: 'UPS Ground',
        service_code: '03',
        rate_amount: 18.25,
        currency: 'USD',
        delivery_days: 4,
        estimated_delivery_date: '2024-03-16',
      },
      {
        carrier: 'fedex',
        service_name: 'FedEx 2Day',
        service_code: 'FEDEX_2_DAY',
        rate_amount: 35.00,
        currency: 'USD',
        delivery_days: 2,
        estimated_delivery_date: '2024-03-14',
      },
      {
        carrier: 'ups',
        service_name: 'UPS Next Day Air',
        service_code: '01',
        rate_amount: 45.00,
        currency: 'USD',
        delivery_days: 1,
        estimated_delivery_date: '2024-03-13',
      },
    ],
    cached: false,
  },
  SUCCESS_UPS: {
    cheapest: {
      carrier: 'ups',
      service_name: 'UPS Ground',
      service_code: '03',
      rate_amount: 12.00,
      currency: 'USD',
      delivery_days: 3,
      estimated_delivery_date: '2024-03-15',
    },
    fastest: {
      carrier: 'ups',
      service_name: 'UPS Next Day Air',
      service_code: '01',
      rate_amount: 45.00,
      currency: 'USD',
      delivery_days: 1,
      estimated_delivery_date: '2024-03-13',
    },
    total_carriers: 4,
    total_rates: 7,
    potential_savings: 33.00,
    all_rates: [
      {
        carrier: 'ups',
        service_name: 'UPS Ground',
        service_code: '03',
        rate_amount: 12.00,
        currency: 'USD',
        delivery_days: 3,
        estimated_delivery_date: '2024-03-15',
      },
      {
        carrier: 'fedex',
        service_name: 'FedEx Ground',
        service_code: 'FEDEX_GROUND',
        rate_amount: 16.75,
        currency: 'USD',
        delivery_days: 4,
        estimated_delivery_date: '2024-03-16',
      },
      {
        carrier: 'fedex',
        service_name: 'FedEx 2Day',
        service_code: 'FEDEX_2_DAY',
        rate_amount: 32.00,
        currency: 'USD',
        delivery_days: 2,
        estimated_delivery_date: '2024-03-14',
      },
      {
        carrier: 'ups',
        service_name: 'UPS Next Day Air',
        service_code: '01',
        rate_amount: 45.00,
        currency: 'USD',
        delivery_days: 1,
        estimated_delivery_date: '2024-03-13',
      },
    ],
    cached: false,
  },
  EMPTY: {
    cheapest: null,
    fastest: null,
    total_carriers: 0,
    total_rates: 0,
    potential_savings: 0,
    all_rates: [],
    cached: false,
  },
  CACHED: {
    cheapest: {
      carrier: 'fedex',
      service_name: 'FedEx Ground',
      service_code: 'FEDEX_GROUND',
      rate_amount: 15.50,
      currency: 'USD',
      delivery_days: 3,
      estimated_delivery_date: '2024-03-15',
    },
    fastest: {
      carrier: 'fedex',
      service_name: 'FedEx 2Day',
      service_code: 'FEDEX_2_DAY',
      rate_amount: 35.00,
      currency: 'USD',
      delivery_days: 2,
      estimated_delivery_date: '2024-03-14',
    },
    total_carriers: 4,
    total_rates: 8,
    potential_savings: 19.50,
    all_rates: [
      {
        carrier: 'fedex',
        service_name: 'FedEx Ground',
        service_code: 'FEDEX_GROUND',
        rate_amount: 15.50,
        currency: 'USD',
        delivery_days: 3,
        estimated_delivery_date: '2024-03-15',
      },
      {
        carrier: 'ups',
        service_name: 'UPS Ground',
        service_code: '03',
        rate_amount: 18.25,
        currency: 'USD',
        delivery_days: 4,
        estimated_delivery_date: '2024-03-16',
      },
      {
        carrier: 'fedex',
        service_name: 'FedEx 2Day',
        service_code: 'FEDEX_2_DAY',
        rate_amount: 35.00,
        currency: 'USD',
        delivery_days: 2,
        estimated_delivery_date: '2024-03-14',
      },
      {
        carrier: 'ups',
        service_name: 'UPS Next Day Air',
        service_code: '01',
        rate_amount: 45.00,
        currency: 'USD',
        delivery_days: 1,
        estimated_delivery_date: '2024-03-13',
      },
    ],
    cached: true,
  },
};

const MOCK_EXCEL_JOBS = {
  PENDING: {
    id: 'job-uuid-1',
    user_id: 'user-123',
    job_id: 'bull-job-1',
    original_filename: 'rates.xlsx',
    input_s3_key: 'excel-rates/input/user_user-123/job-uuid-1.xlsx',
    output_s3_key: null,
    status: 'pending',
    row_count: 5,
    processed_count: 0,
    success_count: 0,
    error_count: 0,
    error_message: null,
    created_at: new Date('2024-03-12T10:00:00Z'),
    updated_at: new Date('2024-03-12T10:00:00Z'),
    completed_at: null,
    toJSON() {
      return { ...this };
    },
  },
  PROCESSING: {
    id: 'job-uuid-2',
    user_id: 'user-123',
    job_id: 'bull-job-2',
    original_filename: 'rates.xlsx',
    input_s3_key: 'excel-rates/input/user_user-123/job-uuid-2.xlsx',
    output_s3_key: null,
    status: 'processing',
    row_count: 5,
    processed_count: 2,
    success_count: 2,
    error_count: 0,
    error_message: null,
    created_at: new Date('2024-03-12T10:00:00Z'),
    updated_at: new Date('2024-03-12T10:05:00Z'),
    completed_at: null,
    toJSON() {
      return { ...this };
    },
  },
  COMPLETED: {
    id: 'job-uuid-3',
    user_id: 'user-123',
    job_id: 'bull-job-3',
    original_filename: 'rates.xlsx',
    input_s3_key: 'excel-rates/input/user_user-123/job-uuid-3.xlsx',
    output_s3_key: 'excel-rates/output/user_user-123/job-uuid-3_results.xlsx',
    status: 'completed',
    row_count: 5,
    processed_count: 5,
    success_count: 4,
    error_count: 1,
    error_message: null,
    created_at: new Date('2024-03-12T10:00:00Z'),
    updated_at: new Date('2024-03-12T10:10:00Z'),
    completed_at: new Date('2024-03-12T10:10:00Z'),
    toJSON() {
      return { ...this };
    },
  },
  FAILED: {
    id: 'job-uuid-4',
    user_id: 'user-123',
    job_id: 'bull-job-4',
    original_filename: 'rates.xlsx',
    input_s3_key: 'excel-rates/input/user_user-123/job-uuid-4.xlsx',
    output_s3_key: null,
    status: 'failed',
    row_count: 5,
    processed_count: 1,
    success_count: 0,
    error_count: 1,
    error_message: 'S3 upload failed',
    created_at: new Date('2024-03-12T10:00:00Z'),
    updated_at: new Date('2024-03-12T10:02:00Z'),
    completed_at: new Date('2024-03-12T10:02:00Z'),
    toJSON() {
      return { ...this };
    },
  },
  OTHER_USER: {
    id: 'job-uuid-5',
    user_id: 'user-999', // Different user
    job_id: 'bull-job-5',
    original_filename: 'rates.xlsx',
    input_s3_key: 'excel-rates/input/user_user-999/job-uuid-5.xlsx',
    output_s3_key: 'excel-rates/output/user_user-999/job-uuid-5_results.xlsx',
    status: 'completed',
    row_count: 3,
    processed_count: 3,
    success_count: 3,
    error_count: 0,
    error_message: null,
    created_at: new Date('2024-03-12T10:00:00Z'),
    updated_at: new Date('2024-03-12T10:05:00Z'),
    completed_at: new Date('2024-03-12T10:05:00Z'),
    toJSON() {
      return { ...this };
    },
  },
};

const MOCK_EXCEL_BUFFERS = {
  VALID: Buffer.from('mock excel data'),
  EMPTY: Buffer.from(''),
  LARGE: Buffer.alloc(1024 * 1024), // 1MB
};

const MOCK_S3_KEYS = {
  INPUT: 'excel-rates/input/user_user-123/job-uuid-1.xlsx',
  OUTPUT: 'excel-rates/output/user_user-123/job-uuid-1_results.xlsx',
  INPUT_PATTERN: (userId, filename) => `excel-rates/input/user_${userId}/${filename}`,
  OUTPUT_PATTERN: (userId, filename) => `excel-rates/output/user_${userId}/${filename}`,
};

const MOCK_S3_URLS = {
  SIGNED: 'https://s3.amazonaws.com/test-bucket/excel-rates/output/signed-url?AWSAccessKeyId=...',
  UPLOAD: 'https://s3.amazonaws.com/test-bucket/excel-rates/input/upload-url',
};

const MOCK_JOB_DATA = {
  VALID: {
    fileBuffer: Buffer.from('mock excel data'),
    originalFilename: 'rates.xlsx',
    userId: 'user-123',
    requestId: 'req-123',
  },
  VALID_XLS: {
    fileBuffer: Buffer.from('mock excel data'),
    originalFilename: 'rates.xls',
    userId: 'user-123',
    requestId: 'req-456',
  },
  INVALID_PDF: {
    fileBuffer: Buffer.from('mock pdf data'),
    originalFilename: 'rates.pdf',
    userId: 'user-123',
    requestId: 'req-789',
  },
};

module.exports = {
  EXCEL_FILES,
  MOCK_RATE_COMPARISONS,
  MOCK_EXCEL_JOBS,
  MOCK_EXCEL_BUFFERS,
  MOCK_S3_KEYS,
  MOCK_S3_URLS,
  MOCK_JOB_DATA,
};
