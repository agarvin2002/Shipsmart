# ShipSmart AI API

<div align="center">

![Node.js](https://img.shields.io/badge/node-v22.x-brightgreen) ![Yarn](https://img.shields.io/badge/yarn-3.6.1-blue) ![PostgreSQL](https://img.shields.io/badge/postgresql-14-blue) ![Redis](https://img.shields.io/badge/redis-7-red) ![License](https://img.shields.io/badge/license-MIT-blue)

**Production-ready multi-carrier shipping rate comparison platform**

Compare real-time shipping rates across FedEx, UPS, USPS, and DHL with encrypted credential storage and intelligent caching.

[Features](#-features) • [Quick Start](#-quick-start) • [API Docs](#-api-endpoints) • [Architecture](#-architecture) • [Contributing](#-contributing)

</div>

---

## ✨ Features

- **🚚 Multi-Carrier Integration** - FedEx, UPS, USPS, and DHL support with parallel rate fetching
- **🔐 Secure by Default** - AES-256-CBC encrypted credentials, JWT authentication, rate limiting
- **⚡ High Performance** - Redis caching (5min TTL), async job processing with Bull queues
- **📊 Rate Analytics** - Historical tracking and comparison analytics
- **🔧 Developer Friendly** - 5-layer architecture, comprehensive error handling, detailed logging

---

## 🚀 Quick Start

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

# Start services
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

**Bull Arena UI**: http://localhost:3050 (job monitoring - run `yarn arena:dev` to start)

---

## 📚 Technology Stack

| Category | Technologies |
|----------|-------------|
| **Core** | Node.js v22, Express v4, Yarn Workspaces |
| **Database** | PostgreSQL v14, Sequelize ORM v5 |
| **Cache/Queue** | Redis v7, Bull v4.1.1, Bull Arena |
| **Security** | JWT, Passport.js, bcrypt, AES-256-CBC |
| **Validation** | Joi, express-rate-limit |
| **Logging** | Winston |
| **DevOps** | Docker Compose, ESLint (Airbnb) |

---

## 📁 Project Structure

```
shipsmart-ai-api/
├── config/                    # Environment configs (dev, staging, prod)
├── packages/                  # Shared workspace packages
│   ├── constants, env, errors, logger, redis, s3
├── service/                   # Main API application
│   ├── controller/           # HTTP handlers
│   ├── services/             # Business logic
│   ├── repositories/         # Data access
│   ├── models/               # Database models
│   ├── routes/               # API routes
│   ├── middleware/           # Express middleware
│   ├── workers/              # Background jobs
│   └── database/migrations/  # DB migrations
└── docker-compose.yml         # Local dev services
```

**Architecture**: 5-layer pattern (Routes → Controllers → Services → Repositories → Models)

Full architecture details: [.claude/CLAUDE.md](.claude/CLAUDE.md)

---

## 🔌 API Endpoints

**Base URL**: `http://localhost:3001`

### Authentication
```http
POST   /auth/register         # Register new user
POST   /auth/login           # Login (get JWT token)
POST   /auth/logout          # Logout (requires auth)
POST   /auth/forgot-password # Request password reset
GET    /auth/verify-email/:token
```

### Rate Shopping
```http
POST   /shipments/rates              # Async rate fetch (returns job ID)
POST   /shipments/rates/compare      # Sync rate comparison
GET    /shipments/rates/job/:jobId   # Check job status
GET    /shipments/rates/history      # Rate history
```

### Carrier Credentials
```http
GET    /carrier-credentials          # List credentials
POST   /carrier-credentials          # Add new credential
PUT    /carrier-credentials/:id      # Update credential
DELETE /carrier-credentials/:id      # Delete credential
POST   /carrier-credentials/:id/validate
```

### Other Endpoints
```http
GET    /users/profile        # User management
GET    /addresses            # Address management
GET    /carriers             # Carrier info
GET    /health              # Health check
```

**Authentication**: Include JWT in header: `Authorization: Bearer <token>`

**Rate Limiting**: Login (5/15min), Register (3/15min)

---

## 🛠️ Available Commands

### Development
```bash
yarn dev              # Start API server with hot-reload
yarn worker:dev       # Start background worker
yarn arena:dev        # Start Bull Arena UI (job monitoring)
yarn lint             # Check code style
```

### Database
```bash
cd service
yarn db:migrate          # Run migrations
yarn db:migrate:status   # Check status
yarn db:seed             # Seed database
```

### Docker
```bash
yarn docker:up        # Start PostgreSQL, Redis, S3Mock
yarn docker:down      # Stop services
yarn docker:logs      # View logs
yarn docker:clean     # Clean volumes
```

---

## 🏗️ Architecture

### 5-Layer Pattern

```
Request → Routes → Controllers → Services → Repositories → Models → Database
```

**Key Principles**:
- **Routes**: Endpoints + middleware
- **Controllers**: HTTP handling + response formatting
- **Services**: ALL business logic
- **Repositories**: Database queries only (always filter by `user_id`)
- **Models**: Sequelize schemas

**Context Pattern**: Pass `{ currentUser, requestId }` through all layers

Full details: [.claude/CLAUDE.md](.claude/CLAUDE.md)

---

## 🔒 Security

| Feature | Implementation |
|---------|---------------|
| **Authentication** | JWT with 30-day expiration, session tracking |
| **Credential Storage** | AES-256-CBC encryption for carrier API keys |
| **Password Security** | bcrypt hashing (cost factor 10) |
| **Rate Limiting** | 5 login attempts per 15 minutes |
| **Multi-Tenancy** | All queries filter by `user_id` |

⚠️ **Before Production**:
- Change `jwt.secret` in config (32+ chars)
- Change `encryption.key` (exactly 32 chars)
- Update CORS from `*` to specific origins
- Review security issues in [.claude/CLAUDE.md](.claude/CLAUDE.md)

---

## ⚙️ Configuration

Configuration files: [config/](config/) directory

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

---

## 📦 Background Jobs

**Bull Queue System** (backed by Redis)

- **Async rate fetching** for long-running operations
- **Job monitoring** via Bull Arena UI (http://localhost:3050)
- **Automatic retry** for failed carrier API calls

**Queue**: `shipsmart-worker`

---

## 🧪 Testing

**Current Status**: No testing framework configured yet

**Recommended**:
- Jest for testing framework
- Supertest for API endpoint tests
- Sinon for mocks

See testing guidelines in [.claude/CLAUDE.md](.claude/CLAUDE.md)

---

## 🚢 Deployment

### Production Checklist

- [ ] Update `jwt.secret` (32+ characters)
- [ ] Update `encryption.key` (exactly 32 characters)
- [ ] Restrict CORS origins (remove `*`)
- [ ] Update carrier URLs to production
- [ ] Enable HTTPS (use Nginx reverse proxy)
- [ ] Set up monitoring (New Relic, Datadog)
- [ ] Configure log aggregation
- [ ] Run migrations on production DB

### Process Management

```bash
# Install PM2
npm install -g pm2

# Start services
pm2 start service/bin/server --name shipsmart-api
pm2 start service/bin/worker --name shipsmart-worker
pm2 save
pm2 startup
```

---

## 🐛 Troubleshooting

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
kill -9 <PID>  # Kill process
```

**Worker not processing jobs**
- Check Bull Arena: http://localhost:3050
- Verify Redis connection
- Restart worker: `yarn worker:dev`

---

## 🤝 Contributing

This is a personal side project, but contributions are welcome! Please:

1. **Read**: [Development Standards](.claude/CLAUDE.md)
2. **Follow**: 5-layer architecture + naming conventions
3. **Lint**: `yarn lint` before commit
4. **Commit**: Use semantic messages (`feat:`, `fix:`, `docs:`)

### Code Style

```javascript
// Files: kebab-case
rate-controller.js

// Classes: PascalCase
class RateController {}

// Variables: camelCase
const shipmentData = {}

// Constants: SCREAMING_SNAKE_CASE
const HTTP_STATUS = {}

// Private methods: _prefix
_privateMethod() {}
```

**PR Template**: [.github/pull_request_template.md](.github/pull_request_template.md)

---

## 📖 Documentation

- **[Development Standards](.claude/CLAUDE.md)** - Comprehensive guide
- **[Node.js Docs](https://nodejs.org/docs/)**
- **[Sequelize Docs](https://sequelize.org/docs/v6/)**
- **[Bull Queue Guide](https://github.com/OptimalBits/bull)**

### Carrier API Docs
- [FedEx Developer Portal](https://developer.fedex.com/)
- [UPS Developer Kit](https://www.ups.com/upsdeveloperkit)
- [USPS Web Tools](https://www.usps.com/business/web-tools-apis/)
- [DHL Developer Portal](https://developer.dhl.com/)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**A personal side project for multi-carrier shipping rate comparison**

</div>
