# ShipSmart AI API - Development Standards

> Last Updated: 2026-01-11
> Project: Multi-carrier shipping rate comparison platform
> Stack: Node.js 22, Express, PostgreSQL, Redis, Bull queues

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Patterns](#architecture-patterns)
3. [Naming Conventions](#naming-conventions)
4. [File Organization](#file-organization)
5. [Security Standards](#security-standards)
6. [Error Handling](#error-handling)
7. [Logging Standards](#logging-standards)
8. [Database Patterns](#database-patterns)
9. [API Design](#api-design)
10. [Testing Guidelines](#testing-guidelines)
11. [Development Workflow](#development-workflow)
12. [Critical Security Issues to Avoid](#critical-security-issues-to-avoid)
13. [Production Deployment Architecture](#production-deployment-architecture)

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

**Development:**
- **ESLint** (Airbnb base config) - NO Prettier
- **Nodemon** for auto-restart
- **NO TypeScript** (pure JavaScript/CommonJS)
- **NO testing framework** currently configured

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
// service/routes/api/v1/rate.routes.js
const RateController = require('../../../controller/rate-controller');
const { authenticate } = require('../../../middleware/auth-middleware');
const { validate } = require('../../../middleware/validation-middleware');
const rateSchema = require('../../../validators/validation-schema/rate-schema');

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
    const { limit = 20, offset = 0 } = options;

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
1. **Route**: `service/routes/api/v1/[resource].routes.js`
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
3. **Register**: In `service/worker.js`

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
  carrier: 'fedex',
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
- Config files use `${ENV_VAR}` placeholders (NOT implemented yet)
- NEVER commit actual secrets to git
- `.env` files in `.gitignore`
- Different configs per environment (dev, test, staging, production)

#### 5. CORS & Security Headers

**Current State:**
```javascript
// service/app.js
app.use(cors());  // ⚠️ Allows ALL origins (*)
```

**Production Requirement:**
```javascript
// Should be:
app.use(cors({
  origin: ['https://app.shipsmart.com', 'https://admin.shipsmart.com'],
  credentials: true
}));

// Add Helmet for security headers
const helmet = require('helmet');
app.use(helmet());
```

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

### 🔴 HIGH SEVERITY ISSUES

These are **actual issues found** in the codebase. NEVER replicate these patterns:

#### Issue #1: Password Reset Tokens Logged
**Location:** `service/services/auth-service.js:109`

```javascript
// ❌ WRONG - Logs sensitive token
logger.info(`Password reset token generated for user ${user.id}: ${token}`);

// ✅ CORRECT - Log without sensitive data
logger.info('Password reset token generated', { userId: user.id });
```

**Risk:** Tokens exposed in log files, attackers could reset any user password

#### Issue #2: Request Bodies Logged (Contains Passwords)
**Location:** `service/middleware/request-logger.js:11`

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

#### Issue #3: Secrets Committed to Git
**Location:** `config/config.development.json`

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

**Solution:** Use environment variables
```javascript
// In config files, use placeholders
{
  "jwt": {
    "secret": "${JWT_SECRET}"
  }
}

// Load from .env
JWT_SECRET=actual-secret-from-environment
ENCRYPTION_KEY=actual-key-from-environment
```

#### Issue #4: CORS Allows All Origins
**Location:** `service/app.js`

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
- ⚠️ **Currently logs full request body** (SECURITY ISSUE)

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
GET    /api/v1/resources          # List all
GET    /api/v1/resources/:id      # Get single
POST   /api/v1/resources          # Create
PUT    /api/v1/resources/:id      # Update (full)
PATCH  /api/v1/resources/:id      # Update (partial)
DELETE /api/v1/resources/:id      # Delete
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
GET /api/v1/shipments/rates/job/:jobId
```

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

**NO testing framework currently configured**

When tests are added, follow these guidelines:

### Recommended Framework

- **Jest** (preferred) or Mocha + Chai
- **Supertest** for API endpoint testing
- **Sinon** for mocks/stubs

### Test Structure

```
service/tests/
├── unit/                     # Pure functions, helpers
│   ├── helpers/
│   ├── services/
│   └── lib/
├── integration/              # API endpoints, database
│   ├── controllers/
│   ├── repositories/
│   └── workers/
└── fixtures/                 # Test data
    ├── users.json
    └── rates.json
```

### Naming

- Test files: `[file-name].test.js`
- Example: `rate-service.test.js`

### Coverage Goals

- **Controllers**: Mock services, test response formatting
- **Services**: Mock repositories, test business logic
- **Repositories**: Integration tests with test database
- **Middleware**: Unit tests
- **Target**: 80%+ code coverage

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

# Run tests (when available)
yarn test
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
Routes:          service/routes/api/v1/[name].routes.js
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

The ShipSmart AI API uses a **single-container production deployment architecture** that mirrors the marauders-map reference project. This design consolidates Nginx, Node.js, and PM2 into a single Docker container for simplified deployment and management.

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

**Based on marauders-map production architecture:**
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
- marauders-map uses direct `pm2 start` commands
- Simpler for this use case
- Easier to debug and modify
- Matches reference architecture exactly

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

### Deployment Workflow (Future)

**When AWS infrastructure is ready:**

```
Developer Push → GitHub
    ↓
Jenkins Webhook Triggered
    ↓
1. Checkout code
2. Install Node.js 22 + Yarn (pre-process.sh)
3. Pull environment configs from S3
4. Run: make bootstrap (yarn install)
5. Run: yarn lint
6. Build Docker image with NODE_ENV arg
7. Login to ECR
8. Push image with tag (branch name)
9. Deploy to target environment (optional)
    ↓
ECS/EC2 pulls new image
    ↓
Rolling update (zero downtime)
    ↓
Health check verification
```

### Environment Configuration Management

**Strategy:** S3 buckets per environment (marauders-map pattern)

```
s3://shipsmart-config-development/
  ├── config.development.json
  └── .env.development

s3://shipsmart-config-staging/
  ├── config.staging.json
  └── .env.staging

s3://shipsmart-config-production/
  ├── config.production.json
  └── .env.production
```

**Why S3?**
- Centralized configuration management
- Easy updates without code commits
- Version history and rollback
- Secure storage with IAM roles
- Environment-specific isolation

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
- ✅ PM2 startup script (pm2.sh) matching marauders-map
- ✅ Nginx configs per environment
- ✅ Native module rebuilding
- ✅ Makefile for build automation
- ✅ Jenkins pipeline structure (jenkinsFile)

**Phase 3 & 4 (PENDING - Requires AWS):**
- ⏳ Terraform IaC for AWS provisioning
- ⏳ ECR repository setup
- ⏳ S3 config bucket strategy
- ⏳ CloudWatch logging integration
- ⏳ Jenkins pipeline execution
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
