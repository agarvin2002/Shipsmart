const WorkerJobs = require('./worker-jobs');
const {
  CARRIERS,
  CARRIER_NAMES,
  CARRIER_API_URLS,
  CARRIER_DEFAULTS,
} = require('./lib/carriers');
const {
  TIMEOUTS,
  RATE_LIMIT_WINDOWS,
} = require('./lib/timeouts');
const {
  RATE_LIMITS,
} = require('./lib/rate-limits');
const {
  HTTP_STATUS,
} = require('./lib/http-status');
const {
  PAGINATION,
} = require('./lib/pagination');
const {
  USER_STATUS,
  CREDENTIAL_STATUS,
  JOB_STATUS,
  EXCEL_JOB_STATUS,
} = require('./lib/status-values');
const {
  COUNTRIES,
  COUNTRY_DEFAULTS,
} = require('./lib/countries');
const {
  WEIGHT_UNITS,
  DIMENSION_UNITS,
  TEMPERATURE_UNITS,
  CONVERSIONS,
  UNIT_DEFAULTS,
} = require('./lib/units');
const {
  SERVICE_TYPES,
  CARRIER_SERVICE_TYPES,
} = require('./lib/service-types');
const {
  CURRENCIES,
  CURRENCY_DEFAULTS,
} = require('./lib/currencies');
const {
  DUTIES_PAYMENT,
  CONTENT_TYPES,
  INCOTERMS,
} = require('./lib/customs');
const {
  VALIDATION_LIMITS,
} = require('./lib/validation-limits');
const {
  SECURITY,
} = require('./lib/security');
const {
  ERROR_CODES,
  ERROR_MESSAGES,
} = require('./lib/error-codes');
const {
  QUEUE_NAMES,
} = require('./lib/queue-names');

module.exports = {
  // HTTP
  HTTP_STATUS,

  // Carriers
  CARRIERS,
  CARRIER_NAMES,
  CARRIER_API_URLS,
  CARRIER_DEFAULTS,

  // Timeouts & Rate Limits
  TIMEOUTS,
  RATE_LIMIT_WINDOWS,
  RATE_LIMITS,

  // Pagination
  PAGINATION,

  // Status Values
  USER_STATUS,
  CREDENTIAL_STATUS,
  JOB_STATUS,
  EXCEL_JOB_STATUS,

  // Location & Units
  COUNTRIES,
  COUNTRY_DEFAULTS,
  WEIGHT_UNITS,
  DIMENSION_UNITS,
  TEMPERATURE_UNITS,
  CONVERSIONS,
  UNIT_DEFAULTS,

  // Service Types & Currency
  SERVICE_TYPES,
  CARRIER_SERVICE_TYPES,
  CURRENCIES,
  CURRENCY_DEFAULTS,

  // Customs
  DUTIES_PAYMENT,
  CONTENT_TYPES,
  INCOTERMS,

  // Validation
  VALIDATION_LIMITS,

  // Security
  SECURITY,

  // Errors
  ERROR_CODES,
  ERROR_MESSAGES,

  // Queues & Workers
  QUEUE_NAMES,
  WorkerJobs,
};
