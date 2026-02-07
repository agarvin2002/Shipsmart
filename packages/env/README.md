# @shipsmart/env

Configuration management with nconf for ShipSmart services.

## Usage

```javascript
const config = require('@shipsmart/env');

// Get configuration values
const jwtSecret = config.get('jwt:secret');
const dbHost = config.get('database:host');
const port = config.get('server:port', 3000); // with default

// Check if key exists
if (config.has('redis:url')) {
  // ...
}
```

## Configuration Sources

Loads configuration from (in order of precedence):
1. Environment variables
2. Config files (`config/config.{environment}.json`)
3. Defaults

## Environment

Set `NODE_ENV` to load environment-specific config:
- `development` → `config/config.development.json`
- `staging` → `config/config.staging.json`
- `production` → `config/config.production.json`
