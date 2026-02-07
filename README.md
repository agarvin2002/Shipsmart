# ShipSmart AI API

<div align="center">

![Node.js](https://img.shields.io/badge/node-v22.x-brightgreen) ![Yarn](https://img.shields.io/badge/yarn-3.6.1-blue) ![PostgreSQL](https://img.shields.io/badge/postgresql-14-blue) ![Redis](https://img.shields.io/badge/redis-7-red) ![Jest](https://img.shields.io/badge/tests-580%2B-green) ![Coverage](https://img.shields.io/badge/coverage-73%25%2B-yellowgreen) ![License](https://img.shields.io/badge/license-MIT-blue)

**Production-ready multi-carrier shipping rate comparison platform**

Compare real-time shipping rates across FedEx, UPS, USPS, and DHL with encrypted credential storage and intelligent caching.

[Features](#features) | [Quick Start](#quick-start) | [API Docs](#api-endpoints) | [Architecture](#architecture) | [Packages](#workspace-packages) | [Deployment](#production-deployment) | [Contributing](#contributing)

</div>

---

## Features

- **Multi-Carrier Integration** - FedEx, UPS, USPS, and DHL support with parallel rate fetching
- **Secure by Default** - AES-256-CBC encrypted credentials, JWT authentication, rate limiting
- **High Performance** - Redis caching (5min TTL), async job processing with Bull queues
- **Rate Analytics** - Historical tracking, comparison analytics, cheapest/fastest recommendations
- **Developer Friendly** - 5-layer architecture, 7 shared packages, comprehensive error handling
- **Production Ready** - Docker + Nginx + PM2, GitHub Actions CI/CD, Terraform IaC

---

## Quick Start

### Prerequisites

- Node.js v22.x
- Yarn v3.6.1
- Docker & Docker Compose

### Installation

```bash
# Clone and install
git clone <repository-url>
cd shipsmart-ai-api
yarn install

# Start services (PostgreSQL, Redis, S3Mock)
yarn docker:up

# Run migrations
cd service && yarn db:migrate

# Start API server (port 3001)
yarn dev

# Start worker (separate terminal)
yarn worker:dev

# Start Bull Arena UI (separate terminal, optional)
yarn arena:dev
```

### Verify Setup

```bash
curl http://localhost:3001/health
# Expected: {"status": "OK"}
```

**Bull Arena UI**: http://localhost:3050 (job monitoring)

---

## Technology Stack

| Category | Technologies |
|----------|-------------|
| **Core** | Node.js v22, Express v4, Yarn Workspaces |
| **Database** | PostgreSQL v14, Sequelize ORM v5 |
| **Cache/Queue** | Redis v7, Bull v4.1.1, Bull Arena |
| **Security** | JWT, Passport.js, bcrypt, AES-256-CBC, Helmet |
| **Validation** | Joi, express-rate-limit |
| **Observability** | Winston (structured JSON), Sentry |
| **Testing** | Jest 29.7, Supertest (580+ tests, 73%+ coverage) |
| **DevOps** | Docker, Nginx, PM2, GitHub Actions, Terraform |

---

## Project Structure

```
shipsmart-ai-api/
├── config/                     # Environment configs (dev, staging, prod, test)
├── packages/                   # Shared workspace packages
│   ├── constants/             # Shared constants, enums, limits
│   ├── env/                   # Configuration management (nconf)
│   ├── errors/                # Custom error classes
│   ├── http/                  # Response formatting utilities
│   ├── logger/                # Winston structured logging
│   ├── redis/                 # Redis client & caching
│   └── s3/                    # AWS S3 wrapper
├── service/                    # Main API application
│   ├── controller/            # HTTP handlers (8 controllers)
│   ├── services/              # Business logic (12+ services)
│   │   └── carriers/          # Carrier-specific services
│   ├── repositories/          # Data access layer (13 repositories)
│   ├── models/                # Sequelize models (13 models)
│   ├── routes/                # API route definitions
│   ├── middleware/            # Express middleware (auth, validation, rate limiting)
│   ├── validators/            # Joi validation schemas
│   ├── presenters/            # Response formatters
│   ├── helpers/               # Utility functions
│   ├── lib/                   # Carrier proxies & request builders
│   ├── workers/               # Bull queue consumers & producers
│   ├── database/              # Migrations & seeders
│   └── __tests__/             # Jest test suite
├── nginx/                      # Nginx configs (dev, staging, prod)
├── terraform/                  # Infrastructure as Code (AWS)
├── .github/workflows/          # GitHub Actions CI/CD (4 workflows)
├── scripts/                    # Deployment & utility scripts
├── Dockerfile                  # Production container (Alpine + Nginx + PM2)
├── docker-compose.yml          # Local dev services
├── Makefile                    # Build automation
└── pm2.sh                      # PM2 startup script
```

**Architecture**: 5-layer pattern (Routes > Controllers > Services > Repositories > Models)

Full architecture details: [.claude/CLAUDE.md](.claude/CLAUDE.md)

---

## Workspace Packages

The project uses Yarn Workspaces with 7 shared packages under `packages/`:

| Package | Description |
|---------|-------------|
| **@shipsmart/constants** | Single source of truth for all constants: HTTP status codes, carrier identifiers, timeouts, pagination, validation limits, status enums, error codes |
| **@shipsmart/env** | Configuration management via nconf - loads environment-specific JSON configs |
| **@shipsmart/errors** | Custom error classes (ValidationError, AuthenticationError, NotFoundError, etc.) with HTTP status codes |
| **@shipsmart/http** | HTTP utilities including ResponseFormatter for standardized API responses |
| **@shipsmart/logger** | Winston-based structured JSON logging with request context and file rotation |
| **@shipsmart/redis** | Redis client wrapper, caching utilities, key management, and cache decorators |
| **@shipsmart/s3** | AWS S3 wrapper for file storage with signed URLs and key generation |

See individual package READMEs for detailed API documentation.

---

## API Endpoints

**Base URL**: `http://localhost:3001`

**Authentication**: Include JWT in header: `Authorization: Bearer <token>`

### Authentication
```http
POST   /auth/register              # Register new user
POST   /auth/login                 # Login (returns JWT access_token)
POST   /auth/logout                # Logout (revoke session)
POST   /auth/forgot-password       # Request password reset email
POST   /auth/reset-password        # Reset password with token
GET    /auth/verify-email/:token   # Verify email address
```

### Rate Shopping
```http
POST   /shipments/rates            # Fetch rates (sync or async via ?async=true)
POST   /shipments/rates/compare    # Compare rates (force refresh, sync)
GET    /shipments/rates/job/:jobId # Check async job status/results
GET    /shipments/rates/history    # Rate history by route
```

### Carriers
```http
GET    /carriers                   # List all carriers (paginated)
GET    /carriers/:id               # Get carrier details
GET    /carriers/:id/services      # Get carrier's shipping services
```

### Carrier Credentials
```http
GET    /carrier-credentials        # List user's credentials
GET    /carrier-credentials/:id    # Get single credential
POST   /carrier-credentials        # Add carrier credential (encrypted)
PUT    /carrier-credentials/:id    # Update credential
DELETE /carrier-credentials/:id    # Delete credential
POST   /carrier-credentials/:id/validate  # Validate against carrier API
```

### Users
```http
GET    /users/profile              # Get authenticated user profile
PUT    /users/profile              # Update profile
POST   /users/change-password      # Change password
DELETE /users/account              # Delete account
```

### Addresses
```http
GET    /addresses                  # List saved addresses
GET    /addresses/:id              # Get single address
POST   /addresses                  # Create address
PUT    /addresses/:id              # Update address
DELETE /addresses/:id              # Delete address
PATCH  /addresses/:id/set-default  # Set as default address
```

### Logs
```http
GET    /logs/my-logs               # User's API request logs
GET    /logs/shipment/:shipmentId  # Logs for a specific shipment
GET    /logs/errors                # Error logs
GET    /logs/carrier-stats/:carrier # Carrier API statistics
GET    /logs/search                # Search logs
```

### Health Check
```http
GET    /health                     # System health (no auth required)
```

**Rate Limiting**: Login (5/15min), Register (3/15min), Async jobs (20/15min per user)

---

## Available Commands

### Development
```bash
yarn dev              # Start API server with hot-reload (port 3001)
yarn worker:dev       # Start background worker
yarn arena:dev        # Start Bull Arena UI (port 3050)
yarn lint             # Check code style (ESLint)
yarn lint --fix       # Auto-fix lint issues
```

### Testing
```bash
cd service
yarn test             # Run all tests
yarn test:coverage    # Run with coverage report
yarn test:unit        # Unit tests only
yarn test:integration # Integration tests only
yarn test:security    # Security tests only
yarn test:watch       # Watch mode
```

### Database
```bash
cd service
yarn db:migrate          # Run pending migrations
yarn db:migrate:status   # Check migration status
yarn db:migrate:undo     # Rollback last migration
yarn db:seed             # Seed database
yarn db:seed:undo        # Undo seeds
```

### Docker
```bash
yarn docker:up        # Start PostgreSQL, Redis, S3Mock
yarn docker:down      # Stop services
yarn docker:logs      # View container logs
yarn docker:restart   # Restart services
yarn docker:clean     # Remove containers and volumes
```

---

## Architecture

### 5-Layer Pattern

```
Request > Routes > Controllers > Services > Repositories > Models > Database
```

**Key Principles**:
- **Routes**: Endpoint definitions + middleware (auth, validation, rate limiting)
- **Controllers**: HTTP handling + response formatting (max 50 lines/method)
- **Services**: ALL business logic, orchestration, caching
- **Repositories**: Database queries only (always filter by `user_id` for multi-tenancy)
- **Models**: Sequelize schema definitions

**Context Pattern**: Pass `{ currentUser, requestId }` through all layers

Full details: [.claude/CLAUDE.md](.claude/CLAUDE.md)

---

## Security

| Feature | Implementation |
|---------|---------------|
| **Authentication** | JWT with 30-day expiration, session tracking via JTI |
| **Credential Storage** | AES-256-CBC encryption for carrier API keys |
| **Password Policy** | 12+ chars, uppercase, lowercase, digit, special char |
| **Session Security** | All sessions revoked on password reset |
| **Rate Limiting** | 5 login/15min, 3 register/15min, Nginx layer rate limiting |
| **Multi-Tenancy** | All repository queries filter by `user_id` |
| **CORS** | Environment-based origin whitelist (strict in production) |
| **Headers** | Helmet middleware (CSP, HSTS, X-Frame-Options, referrer policy) |
| **Error Tracking** | Sentry integration (sensitive data filtered) |

---

## Configuration

### Config Files

Environment-specific configs in the [config/](config/) directory:

```json
{
  "service": { "port": 3001 },
  "jwt": { "secret": "change-in-production" },
  "encryption": { "key": "32-character-key-required" },
  "postgres": { "host": "localhost", "database": "shipsmart_db" },
  "carriers": {
    "fedex": { "api_url": "https://apis-sandbox.fedex.com" },
    "ups": { "api_url": "https://wwwcie.ups.com" },
    "usps": { "api_url": "https://apis-tem.usps.com" },
    "dhl": { "api_url": "https://api-sandbox.dhl.com" }
  }
}
```

Set environment: `NODE_ENV=development|test|staging|production`

### Environment Variables

For production, override config values with environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development, test, staging, production) | Yes |
| `JWT_SECRET` | JWT signing secret (32+ characters) | Production |
| `ENCRYPTION_KEY` | AES-256-CBC key (exactly 32 characters) | Production |
| `DATABASE_URL` | PostgreSQL connection string | Production |
| `REDIS_URL` | Redis connection string | Production |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | Production |
| `SENTRY_DSN` | Sentry error tracking DSN | Optional |
| `AWS_ACCESS_KEY_ID` | AWS credentials for S3 | If using S3 |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | If using S3 |

---

## Background Jobs

**Bull Queue System** (backed by Redis)

- **Async rate fetching** - Long-running carrier API calls processed in background
- **API logging** - Request/response logging queued for async persistence
- **Carrier API logging** - Carrier API call logging queued for async persistence
- **Job monitoring** via Bull Arena UI (http://localhost:3050)
- **Graceful shutdown** with configurable timeouts (8s prod, 3s dev)

**Queue**: `shipsmart-worker` with concurrency limits (5 rate fetches, 3 log jobs)

---

## Testing

**Framework**: Jest 29.7 + Supertest

```bash
cd service && yarn test           # Run all tests
cd service && yarn test:coverage  # With coverage report
```

**Coverage**: 73%+ across 580+ tests in 37 test suites

| Category | What's Tested |
|----------|--------------|
| **Unit Tests** | Controllers, Services, Helpers, Presenters, Middleware |
| **Integration** | API endpoints, Database operations (scaffolded) |
| **Security** | Auth middleware, Multi-tenancy enforcement (scaffolded) |

Test configuration: [service/jest.config.js](service/jest.config.js)

See testing guidelines in [.claude/CLAUDE.md](.claude/CLAUDE.md)

---

## Production Deployment

### Architecture Overview

The application uses a **single-container production architecture**:
- **Nginx** - Reverse proxy, rate limiting, SSL termination, security headers
- **Node.js 22** - Runtime environment
- **PM2** - Process management for API server, worker, and arena

### Docker Production Setup

The production [Dockerfile](Dockerfile) features:
1. **Base Image:** `nginx:alpine` with Node.js 22
2. **Package Manager:** Yarn 3.6.1 via Corepack
3. **Native Modules:** Automatic rebuild of bcrypt and msgpackr-extract
4. **Database Migrations:** Run automatically during build
5. **Environment Config:** Nginx config selected per `NODE_ENV`
6. **PM2 Processes:** API server (port 3001), worker, arena (port 3050)

```bash
# Build production image
docker build --build-arg NODE_ENV=production -t shipsmart-api:production .

# Run with external services
docker run -p 80:80 -p 3050:3050 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e REDIS_URL=redis://host:6379 \
  -e JWT_SECRET=your-secret \
  -e ENCRYPTION_KEY=your-32-char-key \
  shipsmart-api:production

# Verify
curl http://localhost/api/health
```

### Nginx Reverse Proxy

Environment-specific configurations in [nginx/](nginx/):
- [nginx.development.conf](nginx/nginx.development.conf) - Permissive rate limits
- [nginx.staging.conf](nginx/nginx.staging.conf) - Moderate restrictions
- [nginx.production.conf](nginx/nginx.production.conf) - Strict security headers, SSL/TLS

**Production features**: 10 req/s API limit, 5 req/min auth limit, gzip, connection limits, security headers (CSP, HSTS, X-Frame-Options)

### CI/CD Pipeline (GitHub Actions)

Four automated workflows in [.github/workflows/](.github/workflows/):

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| **CI** | `ci.yml` | Push/PR to main, develop, feature/* | Build, lint, test, push Docker image to ECR |
| **CD** | `cd.yml` | Manual or called by other workflows | Deploy ECR image to ECS (rolling update) |
| **CI/CD** | `ci-cd.yml` | Push to main or develop | Auto build + deploy (production requires approval) |
| **Manual Deploy** | `manual-deploy.yml` | Manual dispatch | Deploy specific version/tag, rollbacks, hotfixes |

**Branch strategy**:
- `main` -> production (requires approval)
- `develop` -> staging (auto-deploy)
- `feature/*` -> development (build only)

**AWS Resources**: ECR repository, ECS clusters, S3 config bucket, IAM roles

See [.github/workflows/README.md](.github/workflows/README.md) for detailed workflow documentation.

### Production Checklist

**Security:**
- [ ] Set `JWT_SECRET` (32+ characters, secure random)
- [ ] Set `ENCRYPTION_KEY` (exactly 32 characters, secure random)
- [ ] Configure `ALLOWED_ORIGINS` (no wildcards)
- [ ] Update carrier API URLs to production endpoints
- [ ] Audit logging configuration

**Infrastructure:**
- [ ] Provision PostgreSQL (RDS recommended)
- [ ] Provision Redis (ElastiCache recommended)
- [ ] Set up ECR repository
- [ ] Configure ECS cluster and service
- [ ] Provision SSL/TLS certificates
- [ ] Set up CloudWatch logging and monitoring

**Verification:**
- [ ] Health check responds: `curl http://your-domain/api/health`
- [ ] PM2 processes running: `docker exec <id> pm2 status`
- [ ] Database migrations applied
- [ ] Rate limiting active

---

## Troubleshooting

**Docker services won't start**
```bash
yarn docker:clean && yarn docker:up
```

**Migration errors**
```bash
yarn docker:ps  # Verify PostgreSQL running
docker logs shipsmart-postgres
```

**Port conflicts**
```bash
lsof -i :3001  # Find process using port
kill -9 <PID>
```

**Worker not processing jobs**
- Check Bull Arena: http://localhost:3050
- Verify Redis connection: `yarn docker:logs`
- Restart worker: `yarn worker:dev`

**bcrypt module error in Docker** (`ERR_DLOPEN_FAILED`)
```bash
# Rebuild native modules for correct architecture
docker exec <id> yarn rebuild bcrypt msgpackr-extract
```

---

## Contributing

This is a personal side project, but contributions are welcome! Please:

1. **Read**: [Development Standards](.claude/CLAUDE.md) (comprehensive guide)
2. **Follow**: 5-layer architecture + naming conventions
3. **Test**: `cd service && yarn test` before committing
4. **Lint**: `yarn lint` before committing
5. **Commit**: Use semantic messages (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `security:`)

### Code Style

```javascript
// Files: kebab-case
rate-controller.js

// Classes: PascalCase
class RateController {}

// Variables: camelCase
const shipmentData = {}

// Constants: SCREAMING_SNAKE_CASE
const { HTTP_STATUS } = require('@shipsmart/constants');

// Private methods: _prefix
_privateMethod() {}
```

**PR Template**: [.github/pull_request_template.md](.github/pull_request_template.md)

---

## Documentation

- **[Development Handbook](docs/DEVELOPMENT-HANDBOOK.md)** - Comprehensive architecture & coding guide
- **[CI/CD Workflows](.github/workflows/README.md)** - GitHub Actions documentation
- **[Constants Package](packages/constants/README.md)** - Shared constants reference
- **[Terraform Infrastructure](terraform/README.md)** - AWS infrastructure documentation
- **[Postman Collection](postman/README.md)** - API testing collection

### Carrier API Docs
- [FedEx Developer Portal](https://developer.fedex.com/)
- [UPS Developer Kit](https://www.ups.com/upsdeveloperkit)
- [USPS Web Tools](https://www.usps.com/business/web-tools-apis/)
- [DHL Developer Portal](https://developer.dhl.com/)

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**A personal side project for multi-carrier shipping rate comparison**

</div>
