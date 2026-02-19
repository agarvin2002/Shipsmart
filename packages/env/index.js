const path = require('path');
const dotenv = require('dotenv');
const nconf = require('nconf');

const configPath = path.join(__dirname, '..', '..', 'config');
const rootPath = path.join(__dirname, '..', '..');
const DEV_ENVIRONMENT = 'development';

// Load .env file into process.env (local dev only — ignored in production/staging
// where ECS injects secrets directly as environment variables from Secrets Manager)
dotenv.config({ path: path.join(rootPath, '.env') });

function getEnvironment() {
  const environment = process.env.NODE_ENV;

  if (environment) {
    return environment;
  }

  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = DEV_ENVIRONMENT;
  }

  return DEV_ENVIRONMENT;
}

// Priority order (highest to lowest):
// 1. Environment variables (set by ECS from Secrets Manager in staging/production,
//    or loaded from .env file above in local development)
// 2. Config JSON file (non-sensitive config: ports, hostnames, queue names, etc.)
nconf.env({ separator: '__', lowerCase: true });
nconf.file({ file: path.join(configPath, `config.${getEnvironment()}.json`) });

module.exports = nconf;
