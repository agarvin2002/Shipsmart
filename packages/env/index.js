const path = require('path');
const nconf = require('nconf');

const configPath = path.join(__dirname, '..', '..', 'config');
const DEV_ENVIRONMENT = 'development';

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

nconf.file({ file: path.join(configPath, `config.${getEnvironment()}.json`) });

module.exports = nconf;
