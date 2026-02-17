# ShipSmart AI API - Development Standards

> Last Updated: 2026-02-07
> Project: Multi-carrier shipping rate comparison platform
> Stack: Node.js 22, Express, PostgreSQL, Redis, Bull queues

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Patterns](#architecture-patterns)
3. [Naming Conventions](#naming-conventions)
4. [File Organization](#file-organization)
5. [Constants Usage](#constants-usage)
6. [Security Standards](#security-standards)
7. [Error Handling](#error-handling)
8. [Logging Standards](#logging-standards)
9. [Database Patterns](#database-patterns)
10. [API Design](#api-design)
11. [Testing Guidelines](#testing-guidelines)
12. [Development Workflow](#development-workflow)
13. [Critical Security Issues to Avoid](#critical-security-issues-to-avoid)
14. [Production Deployment Architecture](#production-deployment-architecture)

---

## Project Overview

### Technology Stack

**Core:**
- **Node.js**: v22.x (ES2017/ECMAScript 8)
- **Express**: v4.17.1 - Web framework
- **Package Manager**: Yarn v3.6.1 with Workspaces

**Database & Caching:**
- **PostgreSQL**: v14 with Sequelize ORM v5.8.9
- **Redis**: v7 for caching and job queues
- **Bull**: v4.1.1 for background job processing

**Authentication & Security:**
- **Passport.js** + **passport-jwt** for JWT authentication
- **bcrypt** for password hashing
- **AES-256-CBC encryption** for carrier credentials

**Validation & HTTP:**
- **Joi** (@hapi/joi) for schema validation
- **Axios** for HTTP clients (carrier APIs)
- **express-rate-limit** for API rate limiting

**Logging:**
- **Winston** via custom `@shipsmart/logger` package

**Testing:**
- **Jest** v29.7.0 with Supertest for API testing
- 580+ tests across 37 test suites (73%+ coverage)
- Test types: unit, integration, security, e2e

**Development:**
- **ESLint** (Airbnb base config) - NO Prettier
- **Nodemon** for auto-restart
- **NO TypeScript** (pure JavaScript/CommonJS)

### Business Domain

Multi-carrier shipping rate comparison API that integrates with:
- **FedEx** (sandbox: apis-sandbox.fedex.com)
- **UPS** (test: wwwcie.ups.com)
- **USPS** (test: apis-tem.usps.com)
- **DHL** (sandbox: api-sandbox.dhl.com)

**Core Features:**
- Real-time rate fetching from multiple carriers
- Encrypted credential storage per user
- Async job processing for long-running operations
- Rate caching (5min TTL) for performance
- Rate history tracking
- Multi-package support across all carriers

---

## Architecture Patterns

### 5-Layer Architecture (STRICTLY ENFORCED)

```
HTTP Request
    ↓
[Routes] ────→ Define endpoints, apply middleware
    ↓
[Controllers] ────→ Handle HTTP req/res, format responses
    ↓
[Services] ────→ Business logic, orchestration, external APIs
    ↓
[Repositories] ────→ Database access, query building
    ↓
[Models] ────→ Sequelize schema definitions
    ↓
Database/External APIs
```

### Layer Responsibilities

#### 1. Routes (`service/routes/`)
**Responsibility:** Define API endpoints and apply middleware

```javascript
// service/routes/rate-routes.js
const RateController = require('../controller/rate-controller');
const { authenticate } = require('../middleware/auth-middleware');
const { validate } = require('../middleware/validation-middleware');
const rateSchema = require('../validators/validation-schema/rate-schema');

router.post(
  '/rates',
  authenticate(),
  validate(rateSchema.getRates),
  RateController.getRates
);
```

**Rules:**
- Define endpoints only
- Apply middleware (auth, validation, rate limiting)
- Map routes to controller methods
- NO business logic
- NO direct database access

#### 2. Controllers (`service/controller/`)
**Responsibility:** Handle HTTP request/response cycle

```javascript
// service/controller/rate-controller.js
class RateController {
  async getRates(req, res, next) {
    try {
      const context = { currentUser: req.user, requestId: req.id };
      const shipmentData = req.body;

      const rates = await rateService.fetchRates(shipmentData, context);

      return res.json(
        ResponseFormatter.formatSuccess(rates, req.id)
      );
    } catch (error) {
      next(error);
    }
  }
}
```

**Rules:**
- Extract data from req.body/params/query
- Build `context` object: `{ currentUser, requestId }`
- Call service methods (no business logic here)
- Use ResponseFormatter for all responses
- Use presenters to format data
- Delegate errors via `next(error)`
- **MAX 50 lines per method** (if longer, extract to service)
- NO database access
- NO external API calls

#### 3. Services (`service/services/`)
**Responsibility:** ALL business logic

```javascript
// service/services/carriers/carrier-rate-orchestrator.js
class CarrierRateOrchestrator {
  async fetchRates(shipmentData, context) {
    // 1. Validate and enrich data
    const enriched = await this._enrichShipmentData(shipmentData, context);

    // 2. Select carriers
    const carriers = await this.carrierRouter.selectCarriers(enriched, context);

    // 3. Fetch rates in parallel
    const rates = await this._fetchCarrierRatesParallel(carriers, enriched, context);

    // 4. Analyze and sort
    const analyzed = this._analyzeRates(rates);

    // 5. Cache results
    await this._cacheRates(analyzed, context);

    // 6. Queue history logging (async)
    await this.rateHistoryProducer.log(analyzed, context);

    return analyzed;
  }

  // Private methods prefixed with _
  _enrichShipmentData(data, context) { }
  _fetchCarrierRatesParallel(carriers, data, context) { }
  _analyzeRates(rates) { }
}
```

**Rules:**
- ALL business logic lives here
- Orchestrate multiple repositories/external APIs
- Handle caching (Redis)
- Call carrier APIs via proxies
- Always accept `context` parameter
- Use private methods with `_` prefix for internal logic
- NO HTTP-specific code (req, res)
- NO direct Sequelize model usage (use repositories)

#### 4. Repositories (`service/repositories/`)
**Responsibility:** Data access layer ONLY

```javascript
// service/repositories/rate-repository.js
class RateRepository {
  async findByUserId(userId, options = {}) {
    const { limit = PAGINATION.DEFAULT_LIMIT, offset = PAGINATION.DEFAULT_OFFSET } = options;

    return await Rate.findAll({
      where: { user_id: userId },
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });
  }

  async create(rateData, context) {
    return await Rate.create({
      ...rateData,
      user_id: context.currentUser.id
    });
  }

  // CRITICAL: Always filter by user_id (multi-tenancy)
  async findById(id, userId) {
    return await Rate.findOne({
      where: { id, user_id: userId }
    });
  }
}
```

**Rules:**
- CRUD operations ONLY
- ALWAYS filter by `user_id` or `customer_id` (multi-tenancy)
- Query building with Sequelize
- Handle transactions
- Convert DB errors to AppError
- NO business logic
- NO external API calls

#### 5. Models (`service/models/`)
**Responsibility:** Database schema definitions

```javascript
// service/models/rate.js
module.exports = (sequelize, DataTypes) => {
  const Rate = sequelize.define('Rate', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    carrier: {
      type: DataTypes.STRING,
      allowNull: false
    },
    // ... more fields
  }, {
    tableName: 'rates',
    underscored: true,
    timestamps: true
  });

  Rate.associate = (models) => {
    Rate.belongsTo(models.User, { foreignKey: 'user_id' });
  };

  return Rate;
};
```

**Rules:**
- Sequelize model definitions only
- Schema, relationships, hooks
- Database field names: `snake_case`
- NO business logic
- NO API calls

### CRITICAL ARCHITECTURE RULES

- **NO layer skipping** (e.g., Controller → Repository directly)
- **Pass context through all layers:** `{ currentUser, requestId }`
- **Each layer talks ONLY to the layer directly below**
- **Services are the ONLY layer with business logic**

---

## Naming Conventions

### Files
- **kebab-case**: All file names
  - `rate-controller.js`
  - `carrier-rate-service.js`
  - `user-repository.js`

**Patterns:**
- Controllers: `*-controller.js`
- Services: `*-service.js`
- Repositories: `*-repository.js`
- Models: `*.js` (singular: `user.js`, `rate.js`)
- Middleware: `*-middleware.js` or descriptive (`auth-middleware.js`)
- Helpers: `*-helper.js`
- Validators: `*-schema.js`

### Code

```javascript
// Classes: PascalCase
class RateController { }
class CarrierRateOrchestrator { }

// Variables and Functions: camelCase
const shipmentData = req.body;
async function getRates() { }

// Constants: SCREAMING_SNAKE_CASE
const HTTP_STATUS = { OK: 200, NOT_FOUND: 404 };
const WORKER_JOBS = { RATE_FETCH: 'rate-fetch' };

// Private methods: underscore prefix
_fetchCarrierRatesParallel() { }
_enrichShipmentData() { }

// Database fields: snake_case
user_id
created_at
service_type
password_hash
```

### Module Patterns

```javascript
// Controllers: Class exported as singleton
class RateController {
  async getRates(req, res, next) { }
}
module.exports = new RateController();

// Services: Class exported as singleton
class RateService {
  async fetchRates(data, context) { }
  _privateHelper() { }
}
module.exports = new RateService();

// Repositories: Class exported as singleton
class UserRepository {
  async findByEmail(email) { }
}
module.exports = new UserRepository();

// Middleware: Function export
function authenticate(options = {}) {
  return async (req, res, next) => { };
}
module.exports = { authenticate };

// Helpers: Utility functions
class CryptoHelper {
  static encrypt(data) { }
  static decrypt(data) { }
}
module.exports = CryptoHelper;
```

---

## File Organization

### Where to Put New Code

#### New API Endpoint
1. **Route**: `service/routes/[resource]-routes.js`
2. **Controller**: `service/controller/[resource]-controller.js`
3. **Service**: `service/services/[feature]-service.js`
4. **Repository**: `service/repositories/[model]-repository.js`
5. **Validator**: `service/validators/validation-schema/[resource]-schema.js`
6. **Presenter**: `service/presenters/[resource]-presenter.js`

#### Carrier Integration
1. **Service**: `service/services/carriers/[carrier]-rate-service.js`
2. **Extend**: `BaseCarrierRateService` class
3. **Proxy**: `service/lib/carrier-proxies/[carrier]-proxy.js`
4. **Request Builder**: `service/lib/request-builders/[carrier]-request-builder.js`

#### Background Job
1. **Producer**: `service/workers/producers/[job-name]-producer.js`
2. **Consumer**: `service/workers/consumers/[job-name]-consumer.js`
3. **Validation Schema**: `service/workers/validation/[job-name]-schema.js`
4. **Register**: In `service/bin/worker.js`

**Example: Excel Rate Processing Worker**

```javascript
// workers/producers/excel-rate-fetch-producer.js
const { WorkerJobs } = require('@shipsmart/constants');
const BaseProducer = require('./base-producer');

class ExcelRateFetchProducer extends BaseProducer {
  constructor() {
    super(WorkerJobs.EXCEL_RATE_FETCH, {
      attempts: 3,
      priority: 3,
      timeout: 600000, // 10 minutes (10 shipments * 60s)
    });
  }
}

// workers/consumers/excel-rate-fetch-consumer.js
const Joi = require('@hapi/joi');
const ExcelRateService = require('../../services/excel-rate-service');
const { namespace } = require('../../models');

class ExcelRateFetchConsumer {
  static async perform(job) {
    // 1. Validate job data with Joi schema
    const { error, value } = Joi.validate(job.data, excelRateFetchJobSchema);
    if (error) {
      return { success: false, error: error.message };
    }

    // 2. Set up CLS namespace for request tracking
    return namespace.run(async () => {
      namespace.set('requestId', value.requestId);
      namespace.set('userId', value.userId);

      try {
        // 3. Update progress: parsing
        await job.progress(10);

        // 4. Process Excel file
        const result = await ExcelRateService.processExcelRates(
          value.fileBuffer,
          value.originalFilename,
          value.userId,
          value.requestId,
          job.id
        );

        // 5. Update progress: complete
        await job.progress(100);

        return { success: true, excelJobRecord: result };
      } catch (error) {
        logger.error('[ExcelRateFetchConsumer] Error:', error);
        return { success: false, error: error.message };
      }
    });
  }
}

// bin/worker.js - Register consumer
const excelRateQueue = workerClient.getQueue(WorkerJobs.EXCEL_RATE_FETCH);
excelRateQueue.process(3, async (job) => {
  return ExcelRateFetchConsumer.perform(job);
});
```

#### Shared Code
- **Constants**: `packages/constants/` (workspace package)
- **Utilities**: `service/helpers/`
- **Errors**: `service/errors/`

### Directory Structure Quick Reference

```
service/
├── app.js                      # Express app setup
├── bin/
│   ├── www                     # HTTP server
│   └── worker                  # Background worker
├── controller/                 # HTTP handlers
├── services/                   # Business logic
│   └── carriers/              # Carrier-specific services
├── repositories/              # Data access
├── models/                    # Sequelize models
├── routes/                    # API routes
├── middleware/                # Express middleware
├── validators/                # Joi schemas
│   └── validation-schema/
├── presenters/                # Response formatters
├── helpers/                   # Utility functions
├── lib/                       # Libraries
│   ├── carrier-proxies/      # HTTP clients
│   ├── carrier-router.js     # Carrier selection
│   └── request-builders/     # API request builders
├── workers/                   # Bull queue workers
│   ├── consumers/
│   ├── producers/
│   └── utils/
├── database/                  # Migrations & seeders
│   ├── migrations/
│   └── seeders/
└── errors/                    # Custom error classes
```

---

## Constants Usage

### Using @shipsmart/constants Package

**ALL configuration values, status enums, and magic numbers MUST use the centralized constants package.**

The `@shipsmart/constants` package provides a single source of truth for all constants across the codebase. This eliminates hardcoded values and improves maintainability.

### Import Pattern

```javascript
const { CARRIERS, TIMEOUTS, PAGINATION, USER_STATUS } = require('@shipsmart/constants');
```

### Available Constant Categories

1. **HTTP_STATUS** - HTTP status codes (200, 404, 500, etc.)
2. **CARRIERS, CARRIER_NAMES, CARRIER_API_URLS, CARRIER_DEFAULTS** - Carrier identifiers and configuration
3. **TIMEOUTS, RATE_LIMIT_WINDOWS** - All timeout and duration values
4. **RATE_LIMITS** - Rate limiting configuration
5. **PAGINATION** - Pagination defaults and limits
6. **USER_STATUS, CREDENTIAL_STATUS, JOB_STATUS** - Status enums
7. **COUNTRIES, COUNTRY_DEFAULTS** - Country codes and defaults
8. **WEIGHT_UNITS, DIMENSION_UNITS, CONVERSIONS, UNIT_DEFAULTS** - Units of measurement
9. **SERVICE_TYPES, CARRIER_SERVICE_TYPES** - Shipping service types
10. **CURRENCIES, CURRENCY_DEFAULTS** - Currency codes
11. **DUTIES_PAYMENT, CONTENT_TYPES, INCOTERMS** - Customs constants
12. **VALIDATION_LIMITS** - Validation thresholds
13. **SECURITY** - Security-related constants
14. **ERROR_CODES, ERROR_MESSAGES** - Error handling constants
15. **QUEUE_NAMES, WorkerJobs** - Queue and worker job types

### CRITICAL RULES

#### ❌ NEVER DO THIS

```javascript
// ❌ WRONG - Hardcoded carrier names
if (carrier === 'fedex') { }

// ❌ WRONG - Magic numbers
const timeout = 15000;
const limit = 50;

// ❌ WRONG - Hardcoded status strings
if (user.status !== 'active') { }

// ❌ WRONG - Hardcoded validation limits
.min(12)
.max(150)

// ❌ WRONG - Mixed case for same value
if (unit === 'lb' || unit === 'LB') { }
```

#### ✅ ALWAYS DO THIS

```javascript
// ✅ CORRECT - Use carrier constants
const { CARRIERS } = require('@shipsmart/constants');
if (carrier === CARRIERS.FEDEX) { }

// ✅ CORRECT - Use named timeouts and pagination
const { TIMEOUTS, PAGINATION } = require('@shipsmart/constants');
const timeout = TIMEOUTS.CARRIER_API_DEFAULT;
const limit = PAGINATION.DEFAULT_LIMIT;

// ✅ CORRECT - Use status enums
const { USER_STATUS } = require('@shipsmart/constants');
if (user.status !== USER_STATUS.ACTIVE) { }

// ✅ CORRECT - Use validation limits
const { VALIDATION_LIMITS } = require('@shipsmart/constants');
.min(VALIDATION_LIMITS.PASSWORD_MIN_LENGTH)
.max(VALIDATION_LIMITS.MAX_WEIGHT_LB)

// ✅ CORRECT - Use unit constants
const { WEIGHT_UNITS } = require('@shipsmart/constants');
if (unit === WEIGHT_UNITS.POUNDS) { }
```

### Usage by Layer

#### Repositories

```javascript
const { PAGINATION } = require('@shipsmart/constants');

async findByUserId(userId, options = {}) {
  const { limit = PAGINATION.DEFAULT_LIMIT, offset = PAGINATION.DEFAULT_OFFSET } = options;
  // ... query logic
}
```

#### Services

```javascript
const { CARRIERS, TIMEOUTS, USER_STATUS } = require('@shipsmart/constants');

if (carrier === CARRIERS.FEDEX) {
  const result = await this.proxy.call({ timeout: TIMEOUTS.CARRIER_API_DEFAULT });
}

if (user.status !== USER_STATUS.ACTIVE) {
  throw new AuthenticationError('Account inactive');
}
```

#### Validators

```javascript
const { VALIDATION_LIMITS } = require('@shipsmart/constants');

const packageSchema = Joi.object({
  weight: Joi.number().positive().max(VALIDATION_LIMITS.MAX_WEIGHT_LB).required(),
  length: Joi.number().positive().max(VALIDATION_LIMITS.MAX_DIMENSION_IN).optional(),
});
```

#### Carrier Services

```javascript
const { CARRIERS, CARRIER_DEFAULTS } = require('@shipsmart/constants');

class FedexRateService extends BaseCarrierRateService {
  constructor() {
    super(CARRIERS.FEDEX, CARRIER_DEFAULTS.TIMEOUT);
  }
}
```

### When Adding New Constants

1. Add to existing domain file in `packages/constants/lib/` or create new one
2. Export from `packages/constants/index.js`
3. Update `packages/constants/README.md` with usage examples
4. Use immediately in all relevant code (no hardcoded values)

### Benefits

- **Single source of truth**: Update in one place, applies everywhere
- **Prevents typos**: 'fedx' vs 'fedex' bugs eliminated
- **Easy to change**: Update timeout from 15s to 30s in one line
- **Self-documenting**: Constants named for their purpose
- **Type safety**: Autocomplete and IntelliSense support

**See:** `packages/constants/README.md` for complete documentation

---

## Security Standards

### CRITICAL SECURITY REQUIREMENTS

#### 1. Carrier Credential Encryption
**ALL carrier API credentials MUST be encrypted at rest**

```javascript
const CryptoHelper = require('./helpers/crypto-helper');

// Encrypting credentials before storing
const encrypted = CryptoHelper.encrypt(clientSecret);
await CarrierCredential.create({
  user_id: userId,
  carrier: CARRIERS.FEDEX,
  client_id_encrypted: CryptoHelper.encrypt(clientId),
  client_secret_encrypted: encrypted
});

// Decrypting for API calls
const credentials = await CarrierCredential.findOne({ where: { user_id } });
const decrypted = CryptoHelper.decrypt(credentials.client_secret_encrypted);
```

**Rules:**
- Use `CryptoHelper.encrypt()` / `CryptoHelper.decrypt()`
- AES-256-CBC algorithm (configured in CryptoHelper)
- Encryption key stored in environment variable, NEVER hardcoded
- NEVER log decrypted credentials

#### 2. Authentication & Authorization

**JWT Authentication:**
```javascript
// Middleware: service/middleware/auth-middleware.js
const { authenticate } = require('./middleware/auth-middleware');

// Apply to protected routes
router.post('/rates', authenticate(), RateController.getRates);
```

**Session Tracking:**
- JTI (JWT ID) tracked in `sessions` table
- Session revocation on logout
- IP address and device info logging
- 30-day session expiration

**Authorization:**
```javascript
// Multi-tenancy: ALWAYS filter by user_id
async findRates(userId) {
  return await Rate.findAll({
    where: { user_id: userId }  // CRITICAL
  });
}
```

#### 3. Sensitive Data Handling

**NEVER log:**
- Passwords (plaintext or hashed)
- Password reset tokens
- Email verification tokens
- JWT tokens
- API keys (carrier credentials)
- Client secrets
- Encryption keys
- Decrypted carrier credentials

**Filter before logging:**
```javascript
// ✅ CORRECT - Remove sensitive fields
const sanitized = { ...req.body };
delete sanitized.password;
delete sanitized.client_secret;
delete sanitized.api_key;
logger.info('Request data', sanitized);

// ❌ WRONG - Logs everything including passwords
logger.info('Request body', req.body);
```

#### 4. Configuration Management

**Environment Variables:**
```javascript
// Use @shipsmart/env package
const config = require('@shipsmart/env');

const jwtSecret = config.get('jwt:secret');  // from ENV
const encryptionKey = config.get('encryption:key');  // from ENV
```

**Rules:**
- ALL secrets in environment variables
- Config files use placeholder values for development only
- NEVER commit actual secrets to git
- `.env` files in `.gitignore`
- Different configs per environment (dev, test, staging, production)

#### 5. CORS & Security Headers

**Current Implementation:** Environment-based CORS whitelisting with Helmet security headers.

```javascript
// service/app.js - CORS configured per environment
// Production/Staging: restricted to whitelisted origins from config
// Development: permissive for local development
app.use(cors({
  origin: allowedOrigins,  // From environment config
  credentials: true
}));

// Helmet configured with CSP, HSTS, X-Frame-Options, referrer policy
app.use(helmet({ /* environment-specific options */ }));
```

**Rules:**
- NEVER use `app.use(cors())` without origin restrictions
- Always configure CORS origins per environment in config files
- Helmet middleware is required for all environments

#### 6. Rate Limiting

**Current Implementation:**
```javascript
// service/middleware/rate-limiter.js
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,  // 5 attempts
  keyGenerator: (req) => req.body.email || req.ip
});

const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,  // 3 attempts
  keyGenerator: (req) => req.ip
});
```

**Apply to endpoints:**
```javascript
router.post('/login', loginLimiter, AuthController.login);
router.post('/register', registrationLimiter, AuthController.register);
```

---

## Critical Security Issues to Avoid

### Anti-Patterns (NEVER Replicate)

These patterns were found and fixed in the codebase. They serve as reminders of what to NEVER do:

#### Anti-Pattern #1: Logging Sensitive Tokens
**Status:** RESOLVED

```javascript
// ❌ WRONG - Logs sensitive token
logger.info(`Password reset token generated for user ${user.id}: ${token}`);

// ✅ CORRECT - Log without sensitive data
logger.info('Password reset token generated', { userId: user.id });
```

**Risk:** Tokens exposed in log files, attackers could reset any user password

#### Anti-Pattern #2: Logging Request Bodies Without Sanitization
**Status:** RESOLVED (request-logger.js now uses `sanitizeObject()` with 13 sensitive field patterns)

```javascript
// ❌ WRONG - Logs ALL request bodies including passwords
logger.info(`Request Body: ${JSON.stringify(req.body)}`);

// ✅ CORRECT - Filter sensitive fields first
const sensitiveFields = ['password', 'client_secret', 'api_key', 'token'];
const sanitized = { ...req.body };
sensitiveFields.forEach(field => delete sanitized[field]);
logger.info('Request data', sanitized);
```

**Risk:** User passwords, carrier API keys logged in plaintext

#### Anti-Pattern #3: Secrets in Config Files
**Status:** ACTIVE WARNING - Development config files still contain placeholder secrets. NEVER use real secrets in committed files.

```json
{
  "jwt": {
    "secret": "your-super-secret-jwt-key-change-in-production-min-32-chars"
  },
  "encryption": {
    "key": "12345678901234567890123456789012"
  }
}
```

**Risk:** Secrets exposed in git history forever

**Solution:** Use environment variables for production
```javascript
// Load from .env (never committed)
JWT_SECRET=actual-secret-from-environment
ENCRYPTION_KEY=actual-key-from-environment
```

#### Anti-Pattern #4: Permissive CORS
**Status:** RESOLVED (app.js now uses environment-based CORS whitelisting)

```javascript
// ❌ WRONG - Production security risk
app.use(cors());  // Allows *

// ✅ CORRECT - Whitelist specific origins
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS.split(','),
  credentials: true
}));
```

**Risk:** Any website can make authenticated requests to your API

---

## Error Handling

### Error Classes

**Built-in Custom Errors** (`service/errors/`):
```javascript
const CarrierApiError = require('./errors/carrier-api-error');
const CarrierTimeoutError = require('./errors/carrier-timeout-error');

throw new CarrierApiError('FedEx API returned 401', { carrier: 'fedex', status: 401 });
throw new CarrierTimeoutError('UPS request timed out', { carrier: 'ups' });
```

### ResponseFormatter

**ALL responses** should use `ResponseFormatter`:

```javascript
const ResponseFormatter = require('./helpers/response-formatter');

// Success response
return res.json(
  ResponseFormatter.formatSuccess(data, req.id)
);

// Validation error
return res.status(400).json(
  ResponseFormatter.formatValidationError(joiError, req.id)
);

// Generic error
return res.status(statusCode).json(
  ResponseFormatter.formatError(message, req.id, statusCode)
);
```

**Response Format:**
```json
{
  "success": true,
  "request_id": "req_abc123",
  "data": { ... }
}
```

### Error Flow

```
Service/Repository throws Error
    ↓
Controller catches with try/catch
    ↓
Controller calls next(error)
    ↓
Global error middleware (app.js)
    ↓
ResponseFormatter.formatError()
    ↓
Log error with stack trace
    ↓
Send response to client
```

### Error Middleware

```javascript
// service/app.js - Global error handler
app.use((err, req, res, next) => {
  logger.error('Request error', {
    requestId: req.id,
    statusCode: err.statusCode || 500,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Unexpected error occurred';

  return res.status(statusCode).json(
    ResponseFormatter.formatError(message, req.id, statusCode)
  );
});
```

---

## Logging Standards

### Winston Logger

**Global Logger:**
```javascript
/* global logger */

// Available everywhere after app.js initialization
logger.info('Operation completed', { userId, requestId });
logger.error('Operation failed', { error: err.message, stack: err.stack });
```

**Package Logger:**
```javascript
const logger = require('@shipsmart/logger').application('rate-service');
```

### Log Levels

- **error**: Exceptions, failures, unrecoverable errors
- **warn**: Degraded functionality, fallbacks, deprecated features
- **info**: Key operations, requests, successful actions
- **debug**: Detailed debugging (disabled in production)

### What to Log

```javascript
// ✅ DO LOG
logger.info('Rate fetched successfully', {
  requestId,
  carrier: 'UPS',
  origin: '10001',
  destination: '90210',
  rateAmount: 15.50,
  duration: 1200
});

logger.error('Carrier API failed', {
  requestId,
  carrier: 'FedEx',
  error: error.message,
  statusCode: 401,
  endpoint: '/rate/v1/rates/quotes'
});

// ❌ NEVER LOG
logger.info('User login', {
  email: user.email,
  password: password  // 🔴 SECURITY VIOLATION
});

logger.debug('Carrier credentials', {
  apiKey: decryptedKey  // 🔴 SECURITY VIOLATION
});

logger.info('Token generated', {
  token: jwtToken  // 🔴 SECURITY VIOLATION
});
```

### Request Logging

**Middleware:** `service/middleware/request-logger.js`

Logs:
- Request start: method, URL
- Request duration
- Response status code
- Request body (sanitized - sensitive fields redacted via `sanitizeObject()`)

---

## Database Patterns

### Sequelize Models

**Location:** `service/models/`

**Conventions:**
- Field names: `snake_case`
- Timestamps: `created_at`, `updated_at`
- Primary keys: `id` (UUID v4)
- Foreign keys: `[table]_id` (e.g., `user_id`)
- Associations defined in `Model.associate()`

**Example:**
```javascript
module.exports = (sequelize, DataTypes) => {
  const Rate = sequelize.define('Rate', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    tableName: 'rates',
    underscored: true,  // Converts camelCase to snake_case
    timestamps: true
  });

  return Rate;
};
```

### Migrations

**Location:** `service/database/migrations/`

**Commands:**
```bash
# Create migration
npx sequelize-cli migration:generate --name add-tracking-number-to-shipments

# Run pending migrations
yarn db:migrate

# Check status
yarn db:migrate:status

# Rollback last migration
yarn db:migrate:undo

# Rollback all migrations
yarn db:migrate:undo:all
```

**Rules:**
- ALWAYS create migration for schema changes
- Include both `up` and `down` methods
- Use transactions for complex migrations
- Add indexes for foreign keys
- Test migrations on development first

### Repository Pattern

**ALWAYS use repositories** for database access:

```javascript
// ✅ CORRECT - Use repository
const users = await userRepository.findByEmail(email);

// ❌ WRONG - Direct model usage in service
const users = await User.findOne({ where: { email } });
```

**Multi-Tenancy Rules:**
```javascript
// CRITICAL: Always filter by user_id or customer_id
async findById(id, userId) {
  return await Rate.findOne({
    where: {
      id,
      user_id: userId  // Prevents users from accessing other users' data
    }
  });
}
```

---

## API Design

### REST Conventions

```
GET    /resources          # List all
GET    /resources/:id      # Get single
POST   /resources          # Create
PUT    /resources/:id      # Update (full)
PATCH  /resources/:id      # Update (partial)
DELETE /resources/:id      # Delete
```

### Request Validation

**Joi Schemas:** `service/validators/validation-schema/`

```javascript
// rate-schema.js
const Joi = require('@hapi/joi');

module.exports = {
  getRates: {
    body: Joi.object({
      origin: Joi.object({
        postal_code: Joi.string().required(),
        country: Joi.string().length(2).required()
      }).required(),
      destination: Joi.object({
        postal_code: Joi.string().required(),
        country: Joi.string().length(2).required()
      }).required(),
      packages: Joi.array().items(
        Joi.object({
          weight: Joi.number().positive().required(),
          length: Joi.number().positive(),
          width: Joi.number().positive(),
          height: Joi.number().positive()
        })
      ).min(1).required()
    })
  }
};
```

**Apply validation:**
```javascript
const { validate } = require('./middleware/validation-middleware');
const rateSchema = require('./validators/validation-schema/rate-schema');

router.post('/rates', validate(rateSchema.getRates), RateController.getRates);
```

### Response Format

**Consistent structure:**
```json
{
  "success": true,
  "request_id": "req_abc123",
  "data": {
    "rates": [...]
  }
}
```

**Error response:**
```json
{
  "success": false,
  "request_id": "req_abc123",
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR"
  }
}
```

### Async Operations

**Pattern:** Queue long-running tasks with Bull

```javascript
// Controller: Return job ID immediately
const job = await rateFetchProducer.createJob(shipmentData, context);
return res.status(202).json(
  ResponseFormatter.formatSuccess({ jobId: job.id }, req.id)
);

// Client polls status endpoint
GET /shipments/rates/job/:jobId
```

### File Upload Endpoints

**Pattern:** Multipart form data with Multer middleware

```javascript
// routes/excel-rate-routes.js
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  '/shipments/rates/excel',
  authenticate(),
  excelRateJobLimiter,
  upload.single('file'),
  handleMulterError,
  ExcelRateController.uploadExcel
);

// controller/excel-rate-controller.js
async uploadExcel(req, res, next) {
  try {
    // Validate file extension
    ExcelRateService.validateFileExtension(req.file.originalname);

    // Queue job with file buffer
    const job = await excelRateFetchProducer.publishMessage({
      fileBuffer: req.file.buffer,
      originalFilename: req.file.originalname,
      userId: req.user.userId,
      requestId: req.id,
    });

    return res.status(202).json(
      ResponseFormatter.formatSuccess({ job_id: job.id }, req.id)
    );
  } catch (error) {
    next(error);
  }
}
```

**Key Points:**
- Use `multer.memoryStorage()` for in-memory buffer access
- Validate file extension before processing
- Pass file buffer to worker queue (not saved to disk)
- Return 202 Accepted for async processing
- Apply file-specific rate limiter (e.g., 10 uploads/15min)

### Excel File Processing Pattern

**Dependencies:** `exceljs`, `@shipsmart/s3`

```javascript
// services/excel-rate-service.js
const ExcelJS = require('exceljs');
const { s3Wrapper, S3KeyGenerator } = require('@shipsmart/s3');

class ExcelRateService {
  async parseExcelFile(fileBuffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new ValidationError('Excel file has no worksheets');
    }

    const headers = [];
    const rows = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        // Extract headers (lowercase, trimmed)
        row.eachCell((cell) => {
          headers.push(cell.value?.toString().toLowerCase().trim());
        });
      } else {
        // Extract data rows
        const rowData = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber - 1];
          rowData[header] = cell.value;
        });
        if (Object.keys(rowData).length > 0) {
          rows.push(rowData);
        }
      }
    });

    if (rows.length > VALIDATION_LIMITS.MAX_EXCEL_SHIPMENTS) {
      throw new ValidationError(
        `Excel file has ${rows.length} rows. Maximum allowed is ${VALIDATION_LIMITS.MAX_EXCEL_SHIPMENTS}`
      );
    }

    return { headers, rows };
  }

  async _generateOutputExcel(headers, results) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Rate Comparison Results');

    // Define output columns (input + result columns)
    const outputHeaders = [
      ...headers,
      'status',
      'cheapest_carrier',
      'cheapest_service',
      'cheapest_rate',
      'fastest_carrier',
      'fastest_service',
      'fastest_delivery_days',
      'total_carriers',
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

    // Add data rows with conditional styling
    results.forEach((result) => {
      const row = worksheet.addRow(result);

      // Success rows: light green background
      if (result.status === 'success') {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE2EFDA' },
        };

        // Cheapest rate: bold green text
        const cheapestRateCell = row.getCell(outputHeaders.indexOf('cheapest_rate') + 1);
        cheapestRateCell.font = { bold: true, color: { argb: 'FF375623' } };
      }
      // Error rows: light red background
      else {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFCE4D6' },
        };
      }
    });

    // Auto-width columns (min 10, max 50)
    worksheet.columns.forEach((column) => {
      column.width = Math.min(Math.max(column.width || 10, 10), 50);
    });

    return await workbook.xlsx.writeBuffer();
  }

  async processExcelRates(fileBuffer, originalFilename, userId, requestId, jobId) {
    try {
      // 1. Upload input file to S3
      const inputS3Key = S3KeyGenerator.generateUserKey(
        `excel-rates/input/user_${userId}`,
        `${uuidv4()}.xlsx`
      );
      await s3Wrapper.uploadToAWS(inputS3Key, fileBuffer, {
        ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      // 2. Parse Excel file
      const { headers, rows } = await this.parseExcelFile(fileBuffer);

      // 3. Create job record in database
      const excelJob = await this.excelRateJobRepository.create({
        jobId,
        originalFilename,
        inputS3Key,
        rowCount: rows.length,
        status: EXCEL_JOB_STATUS.PARSING,
      }, userId);

      // 4. Update status to PROCESSING
      await this.excelRateJobRepository.update(excelJob.id, userId, {
        status: EXCEL_JOB_STATUS.PROCESSING,
      });

      // 5. Process each row (fetch rates)
      const results = [];
      for (let i = 0; i < rows.length; i++) {
        try {
          const row = rows[i];
          this._validateShipmentRow(row, i + 2); // +2 for 1-based index + header row

          const rateRequest = this._mapRowToRateRequest(row);
          const rateComparison = await CarrierRateOrchestrator.getRatesForShipment(
            rateRequest,
            { currentUser: { id: userId }, requestId },
            { forceRefresh: true }
          );

          results.push({
            ...row,
            status: 'success',
            cheapest_carrier: rateComparison.cheapest?.carrier,
            cheapest_service: rateComparison.cheapest?.service_name,
            cheapest_rate: rateComparison.cheapest?.rate_amount,
            // ... more fields
          });

          // Update progress
          const progress = Math.round(((i + 1) / rows.length) * 80) + 10; // 10-90%
          await this.excelRateJobRepository.update(excelJob.id, userId, {
            processedCount: i + 1,
            successCount: results.filter(r => r.status === 'success').length,
          });
        } catch (error) {
          results.push({
            ...row,
            status: 'error',
            error_message: error.message,
          });
        }
      }

      // 6. Generate output Excel
      await this.excelRateJobRepository.update(excelJob.id, userId, {
        status: EXCEL_JOB_STATUS.GENERATING,
      });

      const outputBuffer = await this._generateOutputExcel(headers, results);

      // 7. Upload output to S3
      const outputS3Key = S3KeyGenerator.generateUserKey(
        `excel-rates/output/user_${userId}`,
        `${uuidv4()}_results.xlsx`
      );
      await s3Wrapper.uploadToAWS(outputS3Key, outputBuffer, {
        ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      // 8. Update job record to COMPLETED
      const completedJob = await this.excelRateJobRepository.update(excelJob.id, userId, {
        status: EXCEL_JOB_STATUS.COMPLETED,
        outputS3Key,
        completedAt: new Date(),
      });

      return { success: true, excelJobRecord: completedJob };
    } catch (error) {
      logger.error('[ExcelRateService] Error processing Excel rates:', error);
      throw error;
    }
  }
}
```

**Key Points:**
- Use ExcelJS for parsing and generating Excel files with styling
- Upload input and output files to S3 with user-partitioned keys
- Store job metadata in database for status tracking
- Process rows sequentially with progress updates
- Graceful error handling (mark row as failed, continue processing)
- Apply conditional styling to output (green for success, red for errors)

### Presenter Pattern

**Transform data before responses:**

```javascript
// service/presenters/rate-presenter.js
class RatePresenter {
  static format(rate) {
    return {
      id: rate.id,
      carrier: rate.carrier,
      serviceName: rate.service_name,
      amount: parseFloat(rate.amount),
      currency: rate.currency,
      // Remove internal fields
      // createdAt, updatedAt filtered out
    };
  }

  static formatCollection(rates) {
    return rates.map(rate => this.format(rate));
  }
}
```

---

## Testing Guidelines

### Current State

**Framework:** Jest 29.7.0 + Supertest 6.3.3
**Coverage:** 73%+ across 672+ tests in 41 test suites

### Test Framework & Dependencies

- **Jest** v29.7.0 - Test runner with built-in assertions
- **Supertest** - API endpoint testing
- **jest-mock-extended** - Extended mocking utilities
- **axios-mock-adapter** - HTTP client mocking
- **redis-mock** - Redis mocking for unit tests
- **@faker-js/faker** - Test data generation

### Test Structure

```
service/__tests__/
├── unit/                     # All test coverage (unit tests only)
│   ├── controllers/         # Mock services, test HTTP handling
│   ├── services/            # Mock repositories, test business logic
│   ├── repositories/        # Mock models, test data access
│   ├── workers/             # Mock dependencies, test job consumers
│   ├── helpers/             # Test utility functions
│   ├── presenters/          # Test response formatting
│   ├── middleware/          # Test middleware behavior
│   └── lib/                 # Test carrier proxies, builders
├── fixtures/                 # Test data & factories
└── utils/                    # Test helpers, shared utilities, mock fixtures
```

### Test Commands

```bash
cd service

yarn test                    # Run all tests
yarn test:watch              # Watch mode
yarn test:coverage           # Run with coverage report
yarn test:ci                 # CI mode (coverage + no watch)

# Run specific test files or patterns
yarn test excel-rate         # Run all Excel rate tests
yarn test rate-service       # Run rate service tests
```

### Jest Configuration

**File:** `service/jest.config.js`

- **Coverage thresholds:** 50% branches, 60% functions/lines/statements
- **Test timeout:** 10,000ms
- **Auto-cleanup:** clearMocks, resetMocks, restoreMocks all enabled
- **Test match:** `service/__tests__/**/*.test.js`
- **Coverage ignore:** `node_modules`, `database/migrations`, `database/seeders`

### Naming

- Test files: `[file-name].test.js`
- Example: `rate-service.test.js`
- Location: `service/__tests__/unit/[layer]/[file-name].test.js`

### Coverage Goals

- **Controllers**: Mock services, test response formatting, error handling
- **Services**: Mock repositories/external APIs, test business logic
- **Repositories**: Mock models, test data access and multi-tenancy
- **Workers**: Mock dependencies, test job processing and error scenarios
- **Middleware**: Test authentication, validation, rate limiting
- **Target**: 80%+ code coverage (current: 73%+)

### Example Test Structure

```javascript
// rate-service.test.js
const RateService = require('../../services/rate-service');
const RateRepository = require('../../repositories/rate-repository');

jest.mock('../../repositories/rate-repository');

describe('RateService', () => {
  describe('fetchRates', () => {
    it('should fetch rates from all active carriers', async () => {
      // Arrange
      const mockRates = [/* ... */];
      RateRepository.findActiveCarriers.mockResolvedValue(mockRates);

      // Act
      const result = await RateService.fetchRates(shipmentData, context);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].carrier).toBe('FedEx');
    });

    it('should handle carrier timeout gracefully', async () => {
      // Test error scenario
    });
  });
});
```

### Testing File Upload Features

```javascript
// excel-rate-controller.test.js
const ExcelRateController = require('../../../controller/excel-rate-controller');
const ExcelRateService = require('../../../services/excel-rate-service');
const excelRateFetchProducer = require('../../../workers/producers/excel-rate-fetch-producer');

jest.mock('../../../services/excel-rate-service');
jest.mock('../../../workers/utils/producer');

describe('ExcelRateController', () => {
  describe('uploadExcel', () => {
    it('should queue Excel file for processing and return job ID', async () => {
      // Arrange
      const req = {
        user: { userId: 'user-123' },
        id: 'req-123',
        file: {
          buffer: Buffer.from('mock excel data'),
          originalname: 'rates.xlsx',
        },
      };
      ExcelRateService.validateFileExtension = jest.fn();
      excelRateFetchProducer.publishMessage = jest.fn().mockResolvedValue({ id: 'job-42' });

      // Act
      await ExcelRateController.uploadExcel(req, res, next);

      // Assert
      expect(ExcelRateService.validateFileExtension).toHaveBeenCalledWith('rates.xlsx');
      expect(excelRateFetchProducer.publishMessage).toHaveBeenCalledWith({
        fileBuffer: req.file.buffer,
        originalFilename: 'rates.xlsx',
        userId: 'user-123',
        requestId: 'req-123',
      });
      expect(res.status).toHaveBeenCalledWith(202);
    });

    it('should return validation error for invalid file extension', async () => {
      // Arrange
      const req = { file: { originalname: 'rates.pdf' } };
      ExcelRateService.validateFileExtension = jest.fn(() => {
        throw new ValidationError('Invalid file extension');
      });

      // Act
      await ExcelRateController.uploadExcel(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });
});
```

### Testing Worker Consumers

```javascript
// excel-rate-fetch-consumer.test.js
jest.mock('../../../../services/excel-rate-service');
jest.mock('../../../../models', () => ({
  namespace: {
    run: jest.fn((callback) => callback()),
    set: jest.fn(),
  },
}));

const ExcelRateFetchConsumer = require('../../../../workers/consumers/excel-rate-fetch-consumer');
const ExcelRateService = require('../../../../services/excel-rate-service');
const { namespace } = require('../../../../models');

describe('ExcelRateFetchConsumer', () => {
  it('should process Excel rate job successfully', async () => {
    // Arrange
    const mockJob = {
      id: 'job-123',
      data: {
        fileBuffer: Buffer.from('mock data'),
        originalFilename: 'rates.xlsx',
        userId: 'user-123',
        requestId: 'req-123',
      },
      progress: jest.fn(),
    };
    ExcelRateService.processExcelRates = jest.fn().mockResolvedValue({
      success: true,
      excelJobRecord: { id: 'job-uuid-1' },
    });

    // Act
    const result = await ExcelRateFetchConsumer.perform(mockJob);

    // Assert
    expect(namespace.run).toHaveBeenCalled();
    expect(namespace.set).toHaveBeenCalledWith('requestId', 'req-123');
    expect(ExcelRateService.processExcelRates).toHaveBeenCalledWith(
      expect.any(Buffer),
      'rates.xlsx',
      'user-123',
      'req-123',
      'job-123'
    );
    expect(mockJob.progress).toHaveBeenCalledWith(10);
    expect(mockJob.progress).toHaveBeenCalledWith(100);
    expect(result.success).toBe(true);
  });
});
```

### Testing with Mock Fixtures

Create reusable fixtures in `service/__tests__/utils/`:

```javascript
// excel-rate-fixtures.js
const EXCEL_FILES = {
  VALID_SIMPLE: {
    headers: ['origin_postal_code', 'destination_postal_code', 'weight'],
    rows: [
      { origin_postal_code: '10001', destination_postal_code: '90210', weight: 10 },
    ],
  },
  INVALID_EXCEEDS_MAX_ROWS: {
    headers: ['origin_postal_code', 'destination_postal_code', 'weight'],
    rows: Array(11).fill(null).map(() => ({
      origin_postal_code: '10001',
      destination_postal_code: '90210',
      weight: 10,
    })),
  },
};

const MOCK_EXCEL_JOBS = {
  COMPLETED: {
    id: 'job-uuid-1',
    user_id: 'user-123',
    job_id: 'bull-job-123',
    original_filename: 'rates.xlsx',
    status: 'completed',
    row_count: 5,
    success_count: 4,
    error_count: 1,
    output_s3_key: 's3/output/key',
  },
};

module.exports = { EXCEL_FILES, MOCK_EXCEL_JOBS };
```

---

## Development Workflow

### Starting Development

```bash
# Install dependencies
yarn install

# Start Docker services (PostgreSQL, Redis, S3Mock)
yarn docker:up

# Run migrations
cd service && yarn db:migrate

# Seed database (optional)
yarn db:seed

# Start API server (with auto-restart)
yarn dev

# Start worker (separate terminal)
yarn worker:dev

# View Bull Arena UI (job monitoring)
open http://localhost:3050
```

### Before Committing

```bash
# Check linting
yarn lint

# Auto-fix linting issues
yarn lint --fix

# Check migration status
cd service && yarn db:migrate:status

# Run tests
cd service && yarn test
```

### Git Commit Standards

**Semantic commit format:**
```
<type>: <description>

[optional body]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring (no functional change)
- `docs`: Documentation updates
- `test`: Test additions/modifications
- `chore`: Maintenance (dependencies, config)
- `perf`: Performance improvements
- `security`: Security fixes/enhancements

**Examples:**
```
feat: Add DHL international shipping support
fix: Prevent password logging in auth service
refactor: Extract rate calculation to CarrierRateService
security: Encrypt JWT secret in config files
docs: Update API documentation for rate endpoints
chore: Upgrade Sequelize to v6.x
```

**Rules:**
- Use imperative mood ("Add" not "Added")
- Lowercase after colon
- No period at end
- Max 72 characters for first line
- Add body for complex changes

### Docker Commands

```bash
# Start all services
yarn docker:up

# Stop services
yarn docker:down

# View logs
yarn docker:logs

# Restart services
yarn docker:restart

# Remove containers and volumes (clean slate)
yarn docker:clean
```

---

## Quick Reference

### File Paths

```
Controllers:     service/controller/[name]-controller.js
Services:        service/services/[name]-service.js
Repositories:    service/repositories/[name]-repository.js
Models:          service/models/[name].js
Routes:          service/routes/[name]-routes.js
Validators:      service/validators/validation-schema/[name]-schema.js
Presenters:      service/presenters/[name]-presenter.js
Middleware:      service/middleware/[name]-middleware.js
Workers:         service/workers/consumers/[name]-consumer.js
Helpers:         service/helpers/[name]-helper.js
Lib:             service/lib/[purpose]/[name].js
Errors:          service/errors/[name]-error.js
Config:          config/config.[env].json
Packages:        packages/[package-name]/
```

### Common Commands

```bash
# Development
yarn dev                      # Start API server (port 3001)
yarn worker:dev              # Start background worker

# Database
yarn db:migrate              # Run pending migrations
yarn db:migrate:undo         # Rollback last migration
yarn db:migrate:status       # Check migration status
yarn db:seed                 # Seed database
yarn db:seed:undo            # Undo seeds

# Docker
yarn docker:up               # Start PostgreSQL, Redis, S3Mock
yarn docker:down             # Stop containers
yarn docker:logs             # View container logs
yarn docker:ps               # List running containers

# Linting
yarn lint                    # Check for issues
yarn lint --fix              # Auto-fix issues

# Git
git status                   # Check working tree
git diff                     # See changes
git add .                    # Stage all changes
git commit -m "type: desc"   # Commit with message
git push origin [branch]     # Push to remote
```

### Context Object

**Pass through all layers:**
```javascript
const context = {
  currentUser: req.user,      // From auth middleware
  requestId: req.id           // From express-request-id
};

await service.operation(data, context);
```

---

## Production Deployment Architecture

### Overview

The ShipSmart AI API uses a **single-container production deployment architecture** that consolidates Nginx, Node.js, and PM2 into a single Docker container for simplified deployment and management.

### Architecture Pattern

```
                    ┌─────────────────────────────────────┐
                    │     Docker Container (Alpine)       │
                    │                                     │
                    │  ┌──────────────────────────────┐  │
                    │  │   Nginx (Port 80/443)       │  │
                    │  │   - Reverse Proxy           │  │
                    │  │   - Rate Limiting           │  │
                    │  │   - SSL Termination         │  │
                    │  │   - Security Headers        │  │
                    │  └──────────┬───────────────────┘  │
                    │             │                       │
                    │             ▼                       │
                    │  ┌──────────────────────────────┐  │
                    │  │   PM2 Process Manager        │  │
                    │  │                              │  │
                    │  │  • server (port 3001)        │  │
                    │  │  • worker (background)       │  │
                    │  │  • arena (port 3050)         │  │
                    │  └──────────┬───────────────────┘  │
                    │             │                       │
                    │             ▼                       │
                    │  ┌──────────────────────────────┐  │
                    │  │   Node.js 22 Runtime         │  │
                    │  │   - Express API              │  │
                    │  │   - Bull Worker              │  │
                    │  │   - Bull Arena UI            │  │
                    │  └──────────────────────────────┘  │
                    └─────────────────────────────────────┘
                                   │
                   ┌───────────────┼───────────────┐
                   │               │               │
                   ▼               ▼               ▼
            PostgreSQL         Redis           S3/Files
            (External)      (External)        (External)
```

### Key Design Decisions

#### Why Single Container?

**Design rationale:**
- ✅ Simplified deployment (one container to manage)
- ✅ Reduced orchestration complexity
- ✅ Lower resource overhead
- ✅ Easier local testing and debugging
- ✅ Proven pattern in production systems

**Trade-offs:**
- ❌ All processes restart together (acceptable for this scale)
- ❌ Cannot scale API and worker independently (use PM2 cluster mode instead)

#### Why PM2 Inside Container?

- Process management and monitoring
- Auto-restart on crashes
- Graceful shutdown handling
- Log rotation
- Cluster mode support for API scaling
- Zero-downtime reloads

#### Why Nginx + Node.js in Same Container?

- Nginx handles SSL termination, rate limiting, static content
- Reduces external dependencies (no separate load balancer needed initially)
- Simplifies local testing (production-like environment locally)

### Production Dockerfile

**Key Features:**

1. **Alpine Linux Base** - Minimal footprint (~40MB base)
2. **Corepack for Yarn 3.6.1** - Ensures exact package manager version match
3. **Native Module Rebuilding** - bcrypt and msgpackr-extract rebuilt for container architecture
4. **Environment-based Nginx Config** - Different configs per environment
5. **Build-time Migrations** - Database schema applied during build

**Critical Build Steps:**

```dockerfile
# Install Corepack and activate Yarn 3.6.1 (CRITICAL: matches package.json)
RUN npm install -g corepack && \
    corepack enable && \
    corepack prepare yarn@3.6.1 --activate

# Rebuild native modules for correct architecture (CRITICAL for bcrypt)
RUN yarn rebuild bcrypt msgpackr-extract

# Copy environment-specific Nginx config
RUN if [ -f nginx/nginx.${NODE_ENV}.conf ]; then \
      cp nginx/nginx.${NODE_ENV}.conf /etc/nginx/nginx.conf; \
    fi
```

### PM2 Process Management

**File:** [pm2.sh](../../pm2.sh)

**Pattern:** Direct PM2 start commands (NOT ecosystem config file)

**Why No pm2.ecosystem.config.js?**
- Direct `pm2 start` commands are simpler for this use case
- Easier to debug and modify

**Startup Flow:**
```bash
1. Start Nginx in background
2. Kill any existing Node processes
3. Delete all PM2 processes
4. Start server process
5. Start worker process
6. Start arena process
7. Sleep infinity (keep container running)
```

### Nginx Configuration Strategy

**Three Environment-Specific Configs:**

1. **development** - Permissive, verbose logging
2. **staging** - Moderate restrictions, similar to production
3. **production** - Strict rate limits, security headers, SSL

**Production Features:**
```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;

# Security headers (all responses)
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin

# Health check endpoint (no rate limit, no auth)
location /api/health { ... }

# Auth endpoints (5 req/min)
location ~ ^/api/auth/(login|register) { ... }

# API endpoints (10 req/s)
location /api/ { ... }
```

**SSL/TLS Notes:**
- HTTPS server block commented out in development/staging
- Uncomment for production with real certificates
- Use ACM (AWS) or Let's Encrypt for certificates

### Deployment Workflow (GitHub Actions CI/CD)

**Architecture:** GitHub Actions workflows for automated CI/CD

**Important:** All deployments managed through GitHub Actions, no self-hosted infrastructure required.

#### **Workflow 1: CI - Build and Push** (`.github/workflows/ci.yml`)

Builds and pushes Docker images to ECR:

```
Developer Push → GitHub
    ↓
GitHub Actions Triggered (automatic)
    ↓
1. Checkout code
2. Setup Node.js 22 + Yarn 3.6.1 (Corepack)
3. Pull environment configs from AWS S3
4. Run: make dev-clean-install (yarn install)
5. Run: yarn lint & yarn test
6. Build Docker image with NODE_ENV arg
7. Login to AWS ECR
8. Push image to ECR (tagged with branch name + git SHA)
    ↓
Image available in ECR ✅
```

**Triggers:**
- Push to `main`, `develop`, `feature/*`
- Pull requests to `main`, `develop`
- Manual dispatch (with environment selection)

**Image Tags:**
- Branch name (e.g., `main`, `develop`, `feature-xyz`)
- Git SHA (first 7 characters for traceability)
- `latest` (for main branch only)

#### **Workflow 2: CD - Deploy to ECS** (`.github/workflows/cd.yml`)

Deploys ECR images to ECS:

```
Manual trigger or called by other workflows
    ↓
GitHub Actions CD Workflow
    ↓
1. Verify image exists in ECR
2. Pre-deployment checks
3. Run: scripts/deploy.sh <env> <tag>
   - Get current task definition
   - Register new task definition with new image
   - Update ECS service (rolling update)
4. Wait for ECS service to stabilize
    ↓
ECS pulls new image from ECR
    ↓
Rolling update (zero downtime)
    ↓
Health check verification ✅
```

**Inputs:**
- `environment`: 'development' | 'staging' | 'production'
- `image_tag`: Docker image tag to deploy (e.g., 'main', 'v1.0.0')

**GitHub Environments:**
- `development`: Auto-deploy, no approval
- `staging`: Auto-deploy, no approval
- `production`: Requires manual approval, restricted to `main` branch

#### **Workflow 3: CI/CD - Auto Deploy** (`.github/workflows/ci-cd.yml`)

Automated build and deployment:

```
Push to main → Build → Deploy to production (with approval)
Push to develop → Build → Deploy to staging (auto)
```

#### **Workflow 4: Manual Deploy** (`.github/workflows/manual-deploy.yml`)

On-demand deployment with any image tag:

**Use Cases:**
- Deploy specific versions for testing
- Rollback to previous working version
- Hotfix deployment
- Testing deployment process

**See:** `.github/workflows/README.md` for detailed workflow documentation

### GitHub Actions Setup

**Required GitHub Secrets:**
```
AWS_ACCESS_KEY_ID       # IAM user access key
AWS_SECRET_ACCESS_KEY   # IAM user secret key
```

**Recommended: GitHub OIDC** (more secure than long-lived credentials)
```yaml
# No secrets needed - uses IAM role assumption
role-to-assume: arn:aws:iam::ACCOUNT_ID:role/GitHubActionsRole
```

**IAM Permissions Required:**
- ECR: Push images to `shipsmart-api` repository
- S3: Read access to `s3://shipsmart-config`
- ECS: Update services, register task definitions

**AWS Resources Required:**
- ECR Repository: `shipsmart-api` (us-east-1)
- S3 Bucket: `s3://shipsmart-config`
- ECS Cluster: `shipsmart-{env}-cluster`
- ECS Service: `shipsmart-{env}-service`
- IAM Role: GitHub Actions with ECR push, S3 read, ECS update permissions

### Environment Configuration Management

**Strategy:** Single S3 bucket with all configs

```
s3://shipsmart-config/
  ├── config.development.json
  ├── config.staging.json
  ├── config.production.json
  └── config.localhost.json (for local dev only)
```

**GitHub Actions pulls all configs:**
```bash
aws s3 cp s3://shipsmart-config/ config/ --recursive
```

**Why S3?**
- Centralized configuration management
- Easy updates without code commits
- Version history and rollback
- Secure storage with IAM roles
- Single bucket simplifies IAM permissions

### Troubleshooting Production Deployment

#### Issue: bcrypt Module Error (ERR_DLOPEN_FAILED)

**Symptoms:**
```
Error loading shared library bcrypt_lib.node: Exec format error
```

**Root Cause:** bcrypt compiled for wrong CPU architecture (x86_64 vs ARM)

**Solution:**
```dockerfile
# Add to Dockerfile AFTER yarn install
RUN yarn rebuild bcrypt msgpackr-extract
```

#### Issue: Nginx Service Not Found (Alpine)

**Symptoms:**
```
/bin/sh: service: not found
```

**Root Cause:** Alpine doesn't have `service` command (Ubuntu/Debian specific)

**Solution:**
```bash
# WRONG (Ubuntu/Debian)
service nginx restart -d

# CORRECT (Alpine)
nginx
```

#### Issue: Yarn Version Mismatch

**Symptoms:**
```
This project's package.json defines "packageManager": "yarn@3.6.1"
However the current global version of Yarn is 1.22.22
```

**Root Cause:** Alpine's package manager installs old Yarn version

**Solution:**
```dockerfile
# Don't install yarn via apk
# Use Corepack instead
RUN npm install -g corepack && \
    corepack enable && \
    corepack prepare yarn@3.6.1 --activate
```

#### Issue: SSL Certificate Missing

**Symptoms:**
```
cannot load certificate "/etc/nginx/ssl/cert.pem"
```

**Root Cause:** nginx.production.conf has HTTPS enabled without certificates

**Solution for Local Testing:**
```nginx
# Comment out HTTPS redirect
# return 301 https://$host$request_uri;

# Comment out entire HTTPS server block
# server { listen 443 ssl http2; ... }
```

**Solution for Production:**
- Provision SSL certificates (ACM, Let's Encrypt)
- Mount certificates into container
- Uncomment HTTPS server block
- Enable redirect

### Production Deployment Phases (from Plan)

**Phase 1 & 2 (COMPLETED):**
- ✅ Production Dockerfile with Nginx + Node 22 + PM2
- ✅ PM2 startup script (pm2.sh)
- ✅ Nginx configs per environment
- ✅ Native module rebuilding
- ✅ Makefile for build automation
- ✅ GitHub Actions workflows (CI, CD, CI/CD, Manual Deploy)

**Phase 3 & 4 (PENDING - Requires AWS):**
- ⏳ Terraform IaC for AWS provisioning
- ⏳ ECR repository setup
- ⏳ S3 config bucket strategy
- ⏳ CloudWatch logging integration
- ⏳ GitHub Actions execution (requires AWS resources)
- ⏳ Production deployment

### Best Practices

#### Docker Build

```bash
# Always specify NODE_ENV during build
docker build --build-arg NODE_ENV=production -t shipsmart-api:latest .

# Tag with version/branch
docker tag shipsmart-api:latest shipsmart-api:v1.0.0
docker tag shipsmart-api:latest shipsmart-api:main
```

#### Testing Production Image Locally

```bash
# Build production image
docker build --build-arg NODE_ENV=production -t shipsmart-api:prod .

# Run with external PostgreSQL/Redis
docker run -p 80:80 -p 3050:3050 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e REDIS_URL=redis://host:6379 \
  -e JWT_SECRET=your-secret \
  -e ENCRYPTION_KEY=your-32-char-key \
  shipsmart-api:prod

# Check health
curl http://localhost/api/health

# Check PM2 status
docker exec <container-id> pm2 status

# Check Nginx logs
docker exec <container-id> cat /var/log/nginx/access.log
```

#### Production Checklist

Before deploying to production:

1. **Security:**
   - [ ] Change JWT secret (32+ characters)
   - [ ] Change encryption key (exactly 32 characters)
   - [ ] Restrict CORS origins (no wildcard)
   - [ ] Enable Helmet middleware
   - [ ] Review Nginx security headers

2. **Infrastructure:**
   - [ ] Database backups configured
   - [ ] Redis persistence enabled
   - [ ] SSL certificates provisioned
   - [ ] Health checks configured
   - [ ] Monitoring alerts set up

3. **Configuration:**
   - [ ] Environment variables in Secrets Manager
   - [ ] Carrier API URLs updated to production
   - [ ] Database connection pool sized correctly
   - [ ] Redis max memory configured

4. **Testing:**
   - [ ] Load testing completed
   - [ ] Failover scenarios tested
   - [ ] Rollback procedure documented
   - [ ] Health check endpoint responds correctly

---

**End of Development Standards**

*For questions or clarifications, refer to the architecture documentation in `/docs/03-architecture/` or consult the development team.*
