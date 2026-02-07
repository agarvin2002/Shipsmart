# @shipsmart/constants

Centralized constants package for ShipSmart AI API. Provides a single source of truth for all configuration values, status enums, validation limits, and more.

## Purpose

This package eliminates hardcoded values throughout the codebase by centralizing all constants into domain-specific modules. This improves:

- **Maintainability**: Update values in one place, applies everywhere
- **Consistency**: Same value, same constant everywhere
- **Type Safety**: Reduces typos and string literal errors
- **Discoverability**: Easy to find and understand all configuration values

## Installation

This is a Yarn workspace package. To use it in any service:

```javascript
const { HTTP_STATUS, CARRIERS, PAGINATION } = require('@shipsmart/constants');
```

## Available Constants

### HTTP Status Codes

```javascript
const { HTTP_STATUS } = require('@shipsmart/constants');

// Success
HTTP_STATUS.OK                    // 200
HTTP_STATUS.CREATED               // 201
HTTP_STATUS.ACCEPTED              // 202
HTTP_STATUS.NO_CONTENT            // 204

// Client Errors
HTTP_STATUS.BAD_REQUEST           // 400
HTTP_STATUS.UNAUTHORIZED          // 401
HTTP_STATUS.FORBIDDEN             // 403
HTTP_STATUS.NOT_FOUND             // 404
HTTP_STATUS.METHOD_NOT_ALLOWED    // 405
HTTP_STATUS.CONFLICT              // 409
HTTP_STATUS.UNPROCESSABLE_ENTITY  // 422
HTTP_STATUS.TOO_MANY_REQUESTS     // 429

// Server Errors
HTTP_STATUS.INTERNAL_SERVER_ERROR // 500
HTTP_STATUS.NOT_IMPLEMENTED       // 501
HTTP_STATUS.BAD_GATEWAY           // 502
HTTP_STATUS.SERVICE_UNAVAILABLE   // 503
HTTP_STATUS.GATEWAY_TIMEOUT       // 504
```

### Carriers

```javascript
const { CARRIERS, CARRIER_NAMES, CARRIER_API_URLS, CARRIER_DEFAULTS } = require('@shipsmart/constants');

// Carrier identifiers
CARRIERS.FEDEX    // 'fedex'
CARRIERS.UPS      // 'ups'
CARRIERS.USPS     // 'usps'
CARRIERS.DHL      // 'dhl'

// Display names
CARRIER_NAMES[CARRIERS.FEDEX]  // 'FedEx'

// API URLs
CARRIER_API_URLS.SANDBOX[CARRIERS.FEDEX]     // Sandbox URL
CARRIER_API_URLS.PRODUCTION[CARRIERS.FEDEX]  // Production URL

// Defaults
CARRIER_DEFAULTS.TIMEOUT      // 15000 (15 seconds)
CARRIER_DEFAULTS.MAX_RETRIES  // 2
CARRIER_DEFAULTS.PRIORITY     // 3
```

### Timeouts & Durations

```javascript
const { TIMEOUTS, RATE_LIMIT_WINDOWS } = require('@shipsmart/constants');

// API timeouts (milliseconds)
TIMEOUTS.CARRIER_API_DEFAULT   // 15000 (15 seconds)
TIMEOUTS.CARRIER_API_EXTENDED  // 30000 (30 seconds)
TIMEOUTS.INTERNAL_API          // 5000 (5 seconds)

// Worker timeouts
TIMEOUTS.WORKER_JOB_DEFAULT    // 60000 (1 minute)
TIMEOUTS.WORKER_JOB_EXTENDED   // 120000 (2 minutes)
TIMEOUTS.WORKER_SHUTDOWN       // 30000 (30 seconds)

// Cache TTL (seconds)
TIMEOUTS.CACHE_RATE_QUOTES        // 300 (5 minutes)
TIMEOUTS.CACHE_CARRIER_TOKENS     // 3600 (1 hour)
TIMEOUTS.CACHE_USER_SESSION       // 86400 (24 hours)

// Authentication expiry (seconds)
TIMEOUTS.JWT_SESSION                 // 2592000 (30 days)
TIMEOUTS.PASSWORD_RESET_TOKEN        // 3600 (1 hour)
TIMEOUTS.EMAIL_VERIFICATION_TOKEN    // 86400 (24 hours)

// Database retention (days)
TIMEOUTS.LOG_RETENTION_DAYS          // 90
TIMEOUTS.RATE_HISTORY_RETENTION_DAYS // 365
TIMEOUTS.SESSION_CLEANUP_DAYS        // 30

// Rate limiter windows (milliseconds)
RATE_LIMIT_WINDOWS.LOGIN         // 900000 (15 minutes)
RATE_LIMIT_WINDOWS.REGISTRATION  // 900000 (15 minutes)
RATE_LIMIT_WINDOWS.API_GENERAL   // 60000 (1 minute)
```

### Rate Limiting

```javascript
const { RATE_LIMITS } = require('@shipsmart/constants');

// Login rate limiting
RATE_LIMITS.LOGIN.WINDOW_MS      // 900000 (15 minutes)
RATE_LIMITS.LOGIN.MAX_ATTEMPTS   // 5
RATE_LIMITS.LOGIN.MESSAGE        // Error message

// Registration rate limiting
RATE_LIMITS.REGISTRATION.WINDOW_MS      // 900000
RATE_LIMITS.REGISTRATION.MAX_ATTEMPTS   // 3
RATE_LIMITS.REGISTRATION.MESSAGE        // Error message

// Password reset
RATE_LIMITS.PASSWORD_RESET.WINDOW_MS      // 900000
RATE_LIMITS.PASSWORD_RESET.MAX_ATTEMPTS   // 3
RATE_LIMITS.PASSWORD_RESET.MESSAGE        // Error message

// API rate limiting (Nginx and Express)
RATE_LIMITS.API_GENERAL.RATE_PER_SECOND  // 10
RATE_LIMITS.API_GENERAL.BURST            // 20

RATE_LIMITS.API_AUTH_ENDPOINTS.RATE_PER_MINUTE  // 5
RATE_LIMITS.API_AUTH_ENDPOINTS.BURST            // 10
```

### Pagination

```javascript
const { PAGINATION } = require('@shipsmart/constants');

PAGINATION.DEFAULT_LIMIT            // 50
PAGINATION.DEFAULT_OFFSET           // 0
PAGINATION.MAX_LIMIT                // 500

// Specific use cases
PAGINATION.RATE_HISTORY_LIMIT       // 100
PAGINATION.LOG_ENTRIES_LIMIT        // 50
PAGINATION.TOP_QUERIES_LIMIT        // 10
```

### Status Values

```javascript
const { USER_STATUS, CREDENTIAL_STATUS, JOB_STATUS } = require('@shipsmart/constants');

// User account status
USER_STATUS.ACTIVE      // 'active'
USER_STATUS.INACTIVE    // 'inactive'
USER_STATUS.SUSPENDED   // 'suspended'

// Carrier credential validation status
CREDENTIAL_STATUS.PENDING   // 'pending'
CREDENTIAL_STATUS.VALID     // 'valid'
CREDENTIAL_STATUS.INVALID   // 'invalid'
CREDENTIAL_STATUS.EXPIRED   // 'expired'

// Background job status
JOB_STATUS.PENDING      // 'pending'
JOB_STATUS.PROCESSING   // 'processing'
JOB_STATUS.COMPLETED    // 'completed'
JOB_STATUS.FAILED       // 'failed'
```

### Countries

```javascript
const { COUNTRIES, COUNTRY_DEFAULTS } = require('@shipsmart/constants');

COUNTRIES.US  // 'US'
COUNTRIES.CA  // 'CA'
COUNTRIES.MX  // 'MX'
COUNTRIES.GB  // 'GB'

COUNTRY_DEFAULTS.DEFAULT     // 'US'
COUNTRY_DEFAULTS.SUPPORTED   // ['US', 'CA', 'MX']
```

### Units of Measurement

```javascript
const { WEIGHT_UNITS, DIMENSION_UNITS, TEMPERATURE_UNITS, CONVERSIONS, UNIT_DEFAULTS } = require('@shipsmart/constants');

// Weight units
WEIGHT_UNITS.POUNDS      // 'lb'
WEIGHT_UNITS.KILOGRAMS   // 'kg'
WEIGHT_UNITS.OUNCES      // 'oz'

// Dimension units
DIMENSION_UNITS.INCHES        // 'in'
DIMENSION_UNITS.CENTIMETERS   // 'cm'

// Temperature units
TEMPERATURE_UNITS.FAHRENHEIT  // 'F'
TEMPERATURE_UNITS.CELSIUS     // 'C'

// Conversion factors
CONVERSIONS.LB_TO_KG  // 0.453592
CONVERSIONS.KG_TO_LB  // 2.20462
CONVERSIONS.IN_TO_CM  // 2.54
CONVERSIONS.CM_TO_IN  // 0.393701

// Defaults
UNIT_DEFAULTS.WEIGHT     // 'lb'
UNIT_DEFAULTS.DIMENSION  // 'in'
```

### Service Types

```javascript
const { SERVICE_TYPES, CARRIER_SERVICE_TYPES } = require('@shipsmart/constants');

// Generic service types
SERVICE_TYPES.GROUND         // 'ground'
SERVICE_TYPES.EXPRESS        // 'express'
SERVICE_TYPES.OVERNIGHT      // 'overnight'
SERVICE_TYPES.INTERNATIONAL  // 'international'
SERVICE_TYPES.ECONOMY        // 'economy'
SERVICE_TYPES.PRIORITY       // 'priority'

// Carrier-specific service type mappings
CARRIER_SERVICE_TYPES.fedex[SERVICE_TYPES.GROUND]   // 'FEDEX_GROUND'
CARRIER_SERVICE_TYPES.ups[SERVICE_TYPES.EXPRESS]    // 'UPS_3_DAY_SELECT'
// ... etc.
```

### Currencies

```javascript
const { CURRENCIES, CURRENCY_DEFAULTS } = require('@shipsmart/constants');

CURRENCIES.USD  // 'USD'
CURRENCIES.CAD  // 'CAD'
CURRENCIES.MXN  // 'MXN'
CURRENCIES.EUR  // 'EUR'
CURRENCIES.GBP  // 'GBP'

CURRENCY_DEFAULTS.DEFAULT     // 'USD'
CURRENCY_DEFAULTS.SUPPORTED   // ['USD', 'CAD', 'MXN']
```

### Customs & Duties

```javascript
const { DUTIES_PAYMENT, CONTENT_TYPES, INCOTERMS } = require('@shipsmart/constants');

// Payment types
DUTIES_PAYMENT.SENDER       // 'SENDER'
DUTIES_PAYMENT.RECIPIENT    // 'RECIPIENT'
DUTIES_PAYMENT.THIRD_PARTY  // 'THIRD_PARTY'

// Content types
CONTENT_TYPES.MERCHANDISE  // 'MERCHANDISE'
CONTENT_TYPES.DOCUMENTS    // 'DOCUMENTS'
CONTENT_TYPES.GIFT         // 'GIFT'
CONTENT_TYPES.SAMPLE       // 'SAMPLE'
CONTENT_TYPES.RETURN       // 'RETURN'

// Incoterms
INCOTERMS.DAP  // 'DAP' (Delivered At Place)
INCOTERMS.DDP  // 'DDP' (Delivered Duty Paid)
INCOTERMS.DDU  // 'DDU' (Delivered Duty Unpaid)
```

### Validation Limits

```javascript
const { VALIDATION_LIMITS } = require('@shipsmart/constants');

// Package dimensions
VALIDATION_LIMITS.MAX_WEIGHT_LB          // 150
VALIDATION_LIMITS.MAX_DIMENSION_IN       // 108
VALIDATION_LIMITS.MAX_LENGTH_PLUS_GIRTH  // 165

// User input
VALIDATION_LIMITS.PASSWORD_MIN_LENGTH  // 12
VALIDATION_LIMITS.EMAIL_MAX_LENGTH     // 255
VALIDATION_LIMITS.NAME_MAX_LENGTH      // 100
VALIDATION_LIMITS.ADDRESS_MAX_LENGTH   // 255

// Shipment
VALIDATION_LIMITS.MAX_PACKAGES_PER_SHIPMENT  // 10
VALIDATION_LIMITS.MAX_DECLARED_VALUE         // 50000
```

### Security

```javascript
const { SECURITY } = require('@shipsmart/constants');

SECURITY.BCRYPT_SALT_ROUNDS  // 10

SECURITY.SENSITIVE_HEADERS  // ['authorization', 'x-api-key', 'cookie', 'set-cookie']

SECURITY.SENSITIVE_FIELDS   // ['password', 'password_hash', 'client_secret', 'api_key', ...]
```

### Error Codes

```javascript
const { ERROR_CODES, ERROR_MESSAGES } = require('@shipsmart/constants');

ERROR_CODES.VALIDATION_ERROR       // 'VALIDATION_ERROR'
ERROR_CODES.AUTHENTICATION_ERROR   // 'AUTHENTICATION_ERROR'
ERROR_CODES.AUTHORIZATION_ERROR    // 'AUTHORIZATION_ERROR'
ERROR_CODES.NOT_FOUND              // 'NOT_FOUND'
ERROR_CODES.CARRIER_API_ERROR      // 'CARRIER_API_ERROR'
ERROR_CODES.CARRIER_TIMEOUT        // 'CARRIER_TIMEOUT'
ERROR_CODES.RATE_LIMIT_EXCEEDED    // 'RATE_LIMIT_EXCEEDED'

// Error messages mapped to codes
ERROR_MESSAGES[ERROR_CODES.VALIDATION_ERROR]  // 'Validation failed'
```

### Queues & Workers

```javascript
const { QUEUE_NAMES, WorkerJobs } = require('@shipsmart/constants');

// Queue names
QUEUE_NAMES.WORKER  // 'shipsmart-worker'

// Worker job types
WorkerJobs.RATE_FETCH                      // 'rate-fetch'
WorkerJobs.CARRIER_CREDENTIAL_VALIDATION   // 'carrier-credential-validation'
// ... etc.
```

## Usage Examples

### Repositories (Pagination)

```javascript
const { PAGINATION } = require('@shipsmart/constants');

async findByUserId(userId, options = {}) {
  const { limit = PAGINATION.DEFAULT_LIMIT, offset = PAGINATION.DEFAULT_OFFSET } = options;

  return await Model.findAll({
    where: { user_id: userId },
    limit,
    offset
  });
}
```

### Services (Status Checks)

```javascript
const { USER_STATUS } = require('@shipsmart/constants');

async login(email, password) {
  const user = await this.userRepository.findByEmail(email);

  if (user.status !== USER_STATUS.ACTIVE) {
    throw new AuthenticationError('Account is inactive or suspended');
  }

  // ... rest of login logic
}
```

### Validators (Validation Limits)

```javascript
const { VALIDATION_LIMITS } = require('@shipsmart/constants');

const packageSchema = Joi.object({
  weight: Joi.number().positive().max(VALIDATION_LIMITS.MAX_WEIGHT_LB).required(),
  length: Joi.number().positive().max(VALIDATION_LIMITS.MAX_DIMENSION_IN).optional(),
  // ...
});
```

### Carrier Services

```javascript
const { CARRIERS, TIMEOUTS } = require('@shipsmart/constants');

class FedexRateService extends BaseCarrierRateService {
  constructor() {
    super(CARRIERS.FEDEX, TIMEOUTS.CARRIER_API_DEFAULT);
  }

  // ...
}
```

## Anti-Patterns to Avoid

### ❌ DON'T DO

```javascript
// DON'T: Hardcode carrier names
if (carrier === 'fedex') { }

// DON'T: Magic numbers
const timeout = 15000;

// DON'T: Repeated string literals
if (status === 'active') { }

// DON'T: Mixed case for same value
if (unit === 'lb' || unit === 'LB') { }
```

### ✅ DO THIS

```javascript
// DO: Use constants
const { CARRIERS } = require('@shipsmart/constants');
if (carrier === CARRIERS.FEDEX) { }

// DO: Named timeouts
const { TIMEOUTS } = require('@shipsmart/constants');
const timeout = TIMEOUTS.CARRIER_API_DEFAULT;

// DO: Enum values
const { USER_STATUS } = require('@shipsmart/constants');
if (status === USER_STATUS.ACTIVE) { }

// DO: Consistent case
const { WEIGHT_UNITS } = require('@shipsmart/constants');
if (unit === WEIGHT_UNITS.POUNDS) { }
```

## File Structure

```
packages/constants/
├── package.json
├── index.js                    # Main export aggregator
├── README.md                   # This file
├── worker-jobs.js              # Worker job type definitions
└── lib/                        # Domain-specific constants
    ├── carriers.js
    ├── http-status.js
    ├── timeouts.js
    ├── rate-limits.js
    ├── pagination.js
    ├── status-values.js
    ├── countries.js
    ├── units.js
    ├── service-types.js
    ├── currencies.js
    ├── customs.js
    ├── validation-limits.js
    ├── security.js
    ├── error-codes.js
    └── queue-names.js
```

## Adding New Constants

When adding new constants:

1. **Choose the right file**: Add to an existing domain-specific file in `lib/` or create a new one if needed
2. **Export from index.js**: Update `packages/constants/index.js` to export your new constants
3. **Document in README**: Add usage examples to this README
4. **Update CLAUDE.md**: Add guidelines to `.claude/CLAUDE.md` if applicable

## Migration Checklist

When migrating hardcoded values to constants:

- [ ] Create or update constant definition in `lib/` file
- [ ] Export from `index.js`
- [ ] Replace hardcoded values in production code
- [ ] Update test files to use constants
- [ ] Run full test suite (`yarn test`)
- [ ] Update documentation (this README)
- [ ] Commit with semantic commit message

## Version History

- **v1.0.0**: Initial package with HTTP_STATUS, WORKER_JOBS, QUEUE_NAMES
- **v2.0.0**: Major expansion with 14 constant categories
  - Added carriers, timeouts, rate limits, pagination
  - Added status values, countries, units, service types
  - Added currencies, customs, validation limits, security
  - Added error codes, comprehensive documentation
