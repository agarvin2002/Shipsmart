# @shipsmart/env

Configuration management for ShipSmart services using `nconf` + `dotenv`.

## How It Works

Configuration is loaded from two sources in priority order (highest first):

```
1. Environment variables  ← highest priority (overrides everything)
2. Config JSON file       ← fallback (config/config.{NODE_ENV}.json)
```

Any environment variable will override the same key in the config file.
On local dev, environment variables are loaded from the `.env` file via dotenv.
On staging/production, they are injected by ECS from AWS Secrets Manager.

## Local Development Setup

On first setup, copy the env template and fill in your local secrets:

```bash
cp .env.example .env
```

Then edit `.env` with your local values. The `.env` file is gitignored — never commit it.

## Usage

```javascript
const config = require('@shipsmart/env');

// Read any config value
const port = config.get('service:port');
const dbHost = config.get('postgres:host');
const jwtSecret = config.get('jwt:secret');   // comes from .env or env var

// With a default fallback
const timeout = config.get('service:timeout', 30000);

// Check if key exists
if (config.has('redis:url')) {
  // ...
}
```

## Environment Variable Naming

Nested config keys use `__` (double underscore) as separator and are lowercased:

| Config key | Environment variable |
|------------|---------------------|
| `jwt:secret` | `JWT__SECRET` |
| `encryption:key` | `ENCRYPTION__KEY` |
| `postgres:password` | `POSTGRES__PASSWORD` |
| `bull:default_redis:password` | `BULL__DEFAULT_REDIS__PASSWORD` |
| `service:port` | `SERVICE__PORT` |

## Environments

Set `NODE_ENV` to load environment-specific config:

| NODE_ENV | Config file loaded |
|----------|--------------------|
| `development` (default) | `config/config.development.json` |
| `staging` | `config/config.staging.json` |
| `production` | `config/config.production.json` |
| `test` | `config/config.test.json` |

## What Goes Where

| Type | Location | Example keys |
|------|----------|--------------|
| Secrets (local dev) | `.env` file (gitignored) | `JWT__SECRET`, `ENCRYPTION__KEY`, `POSTGRES__PASSWORD` |
| Secrets (staging/prod) | AWS Secrets Manager → injected as env vars by ECS | same keys |
| Non-sensitive config | `config/config.{env}.json` | ports, hostnames, queue names, timeouts |

**Never put passwords, JWT secrets, or encryption keys in the config JSON files.**
