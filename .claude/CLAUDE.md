# ShipSmart AI API - Claude Code Instructions

> Multi-carrier shipping rate comparison API (FedEx, UPS, USPS, DHL)
> Node.js 22, Express, PostgreSQL 14, Redis 7, Bull queues, Yarn 3.6.1 Workspaces
> Full handbook: `docs/DEVELOPMENT-HANDBOOK.md`

---

## Critical Rules

1. **5-layer architecture is mandatory**: Routes > Controllers > Services > Repositories > Models. NO layer skipping. Controllers NEVER call repositories directly.
2. **Multi-tenancy**: EVERY repository query MUST filter by `user_id` or `customer_id`. No exceptions.
3. **Constants-first**: ALWAYS use `@shipsmart/constants` - never hardcode carriers, timeouts, status strings, pagination values, or validation limits.
4. **Encrypted credentials**: ALL carrier API credentials stored via `CryptoHelper.encrypt()`. NEVER log decrypted credentials.
5. **Never log sensitive data**: No passwords, tokens, API keys, client secrets, encryption keys, or reset tokens in logs.
6. **Context passing**: Pass `{ currentUser: req.user, requestId: req.id }` through all layers (controller > service > repository).
7. **Services own business logic**: Controllers handle HTTP only (max 50 lines/method). Services contain ALL business logic. Repositories do CRUD only.
8. **Use workspace packages**: `@shipsmart/errors` for errors, `@shipsmart/http` ResponseFormatter for responses, `@shipsmart/logger` for logging, `@shipsmart/env` for config.

---

## Architecture

```
Request > Routes (middleware) > Controllers (HTTP) > Services (logic) > Repositories (DB) > Models (schema)
```

**Layer rules:**
- **Routes** (`service/routes/`): Endpoints + middleware only. Apply `authenticate()`, `validate()`, rate limiters.
- **Controllers** (`service/controller/`): Extract req data, build context, call service, use presenter, return via `ResponseFormatter.formatSuccess()`. Errors via `next(error)`.
- **Services** (`service/services/`): All business logic, caching, carrier API calls. Accept `context` param. Private methods prefixed `_`.
- **Repositories** (`service/repositories/`): Sequelize queries only. ALWAYS filter by `user_id`. Use `PAGINATION` constants for defaults.
- **Models** (`service/models/`): Schema definitions only. `snake_case` fields, UUID primary keys, `underscored: true`.

---

## File Naming & Placement

**All files: kebab-case. Classes: PascalCase. Variables: camelCase. Constants: SCREAMING_SNAKE_CASE. Private methods: `_prefix`.**

```
New endpoint:     service/routes/{name}-routes.js
                  service/controller/{name}-controller.js
                  service/services/{name}-service.js
                  service/repositories/{name}-repository.js
                  service/validators/validation-schema/{name}-schema.js
                  service/presenters/{name}-presenter.js

New carrier:      service/services/carriers/{carrier}-rate-service.js    (extends BaseCarrierRateService)
                  service/lib/carrier-proxies/{carrier}-proxy.js         (extends BaseCarrierProxy)
                  service/lib/request-builders/{carrier}-request-builder.js

New worker:       service/workers/producers/{job}-producer.js
                  service/workers/consumers/{job}-consumer.js
                  service/workers/validation/{job}-schema.js

Tests:            service/__tests__/unit/{layer}/{name}.test.js
Fixtures:         service/__tests__/utils/{feature}-fixtures.js
```

**Module pattern**: All controllers, services, repositories export as singletons:
```javascript
class RateService { }
module.exports = new RateService();
```

---

## Constants (MANDATORY)

```javascript
const { CARRIERS, TIMEOUTS, PAGINATION, USER_STATUS, VALIDATION_LIMITS, HTTP_STATUS } = require('@shipsmart/constants');

// WRONG: if (carrier === 'fedex')        RIGHT: if (carrier === CARRIERS.FEDEX)
// WRONG: const timeout = 15000           RIGHT: const timeout = TIMEOUTS.CARRIER_API_DEFAULT
// WRONG: const limit = 50                RIGHT: const limit = PAGINATION.DEFAULT_LIMIT
// WRONG: if (status !== 'active')        RIGHT: if (status !== USER_STATUS.ACTIVE)
// WRONG: .max(150)                       RIGHT: .max(VALIDATION_LIMITS.MAX_WEIGHT_LB)
```

15 constant categories available. See `packages/constants/README.md` for full list.

---

## Error Handling

```javascript
// Throw from services/repositories:
const { ValidationError, AuthenticationError, NotFoundError } = require('@shipsmart/errors');
throw new NotFoundError('Rate not found');

// Controllers: try/catch + next(error)
// Global error middleware in app.js catches and formats via ResponseFormatter

// Response format (always):
{ "success": true|false, "request_id": "...", "data": {...} | "error": {...} }
```

---

## Security Checklist (for every change)

- [ ] Repository queries filter by `user_id`
- [ ] No sensitive data in logs (passwords, tokens, API keys, secrets)
- [ ] Carrier credentials encrypted with `CryptoHelper`
- [ ] Protected routes use `authenticate()` middleware
- [ ] Input validated with Joi schemas via `validate()` middleware
- [ ] Constants used (no hardcoded values)
- [ ] Errors use `@shipsmart/errors` classes, not raw `throw new Error()`

---

## Key Patterns (reference these files)

| Pattern | Reference File |
|---------|---------------|
| Controller | `service/controller/carrier-credential-controller.js` |
| Service | `service/services/carrier-credential-service.js` |
| Repository | `service/repositories/carrier-credential-repository.js` |
| Validator | `service/validators/validation-schema/carrier-credential-schema.js` |
| Presenter | `service/presenters/carrier-credential-presenter.js` |
| Route | `service/routes/carrier-credential-routes.js` |
| File upload endpoint | `service/controller/excel-rate-controller.js` (Multer + async worker) |
| Excel processing service | `service/services/excel-rate-service.js` (ExcelJS + S3) |
| Worker producer | `service/workers/producers/excel-rate-fetch-producer.js` |
| Worker consumer | `service/workers/consumers/excel-rate-fetch-consumer.js` |
| Carrier service (OAuth) | `service/services/carriers/fedex-rate-service.js` |
| Carrier service (Basic Auth) | `service/services/carriers/dhl-rate-service.js` |
| Carrier proxy (OAuth) | `service/lib/carrier-proxies/fedex-proxy.js` |
| Carrier proxy (Basic Auth) | `service/lib/carrier-proxies/dhl-proxy.js` |
| Request builder | `service/lib/request-builders/fedex-rate-request-builder.js` |
| Base carrier | `service/services/carriers/base-carrier-rate-service.js` |
| Unit test | `service/__tests__/unit/` (any file) |
| Test fixtures | `service/__tests__/utils/excel-rate-fixtures.js` |

---

## Verification Commands

```bash
cp .env.example .env              # First time only — copy env template and fill in local secrets
yarn lint                         # Must pass - ESLint (Airbnb base)
cd service && yarn test           # Must pass - Jest 29.7 (672+ tests, 73%+ coverage)
cd service && yarn test:coverage  # Check coverage thresholds (50% branches, 60% functions/lines)
yarn docker:up                    # Start PostgreSQL, Redis, S3Mock
cd service && yarn db:migrate     # Run pending migrations
yarn dev                          # Start API server (port 3001)
yarn worker:dev                   # Start background worker
```

---

## Commit Standards

Format: `<type>: <lowercase description>` (imperative mood, max 72 chars, no period)

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `security`

---

## Anti-Patterns (NEVER do these)

1. **Never log sensitive data**: `logger.info('token:', token)` or `logger.info('body', req.body)` without sanitization
2. **Never skip user filtering**: `Rate.findAll({ where: { id } })` without `user_id`
3. **Never hardcode values**: `if (carrier === 'fedex')` or `const timeout = 15000`
4. **Never put business logic in controllers**: Extract to service layer
5. **Never use models directly in services**: Use repository layer
6. **Never use `cors()` without origin restrictions**: Environment-based whitelist required
7. **Never commit real secrets**: Secrets live in `.env` (local, gitignored) or AWS Secrets Manager (staging/production). Config JSON files must never contain passwords, JWT secrets, or encryption keys
