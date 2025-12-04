const fs = require('fs');
const path = require('path');
const winston = require('winston');
const config = require('@shipsmart/env');

function applicationLogger(namespace, customTag) {
  const logDir = path.join(__dirname, '..', '..', '..', 'logs');

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }

  const logPath = path.join(logDir, `${namespace}.log`);

  const transports = [
    new winston.transports.File({
      filename: logPath,
      handleExceptions: true,
      json: false,
      maxsize: 10485760,
      maxFiles: 5,
      colorize: false,
      timestamp: true,
      format: winston.format.combine(
        winston.format.printf(data => `${new Date().toISOString()} [${data.level}]: ${data.message}`)
      ),
    }),
  ];

  if (config.get('environment') === 'development') {
    transports.push(
      new winston.transports.Console({
        level: 'debug',
        handleExceptions: true,
        json: false,
        colorize: true,
        timestamp: true,
      })
    );
  }

  const winstonLogger = winston.createLogger({
    transports,
    exitOnError: false,
  });

  const stream = {
    write(message, encoding) {
      winstonLogger.info(message);
    },
  };

  winstonLogger.stream = stream;

  const logger = {
    log(level, message) {
      winstonLogger.log(level, message);
    },
    error(message) {
      winstonLogger.error(message);
    },
    warn(message) {
      winstonLogger.warn(message);
    },
    verbose(message) {
      winstonLogger.verbose(message);
    },
    info(message) {
      winstonLogger.info(message);
    },
    debug(message) {
      winstonLogger.debug(message);
    },
    silly(message) {
      winstonLogger.silly(message);
    },
  };

  return logger;
}

module.exports = applicationLogger;
