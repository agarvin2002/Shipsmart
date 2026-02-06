const fs = require('fs');
const path = require('path');
const winston = require('winston');
const config = require('@shipsmart/env');

/**
 * Structured JSON Logger
 *
 * Creates a Winston logger with:
 * - JSON format for production (CloudWatch/ELK compatible)
 * - Pretty format for development
 * - Metadata support for structured logging
 * - Request context (requestId, userId) support
 */
function applicationLogger(namespace, customTag) {
  const logDir = path.join(__dirname, '..', '..', '..', 'logs');
  const environment = config.get('environment') || process.env.NODE_ENV || 'development';
  const isProduction = environment === 'production' || environment === 'staging';

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logPath = path.join(logDir, `${namespace}.log`);

  // JSON format for production (CloudWatch/ELK compatible)
  const jsonFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  );

  // Pretty format for development
  const devFormat = winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
      return `${timestamp} [${level}] ${message}${metaStr}`;
    })
  );

  const transports = [
    // File transport - always JSON for easy parsing
    new winston.transports.File({
      filename: logPath,
      handleExceptions: true,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      format: jsonFormat,
    }),
  ];

  // Console transport - JSON in production, pretty in development
  transports.push(
    new winston.transports.Console({
      level: isProduction ? 'info' : 'debug',
      handleExceptions: true,
      format: isProduction ? jsonFormat : devFormat,
    })
  );

  const winstonLogger = winston.createLogger({
    level: isProduction ? 'info' : 'debug',
    defaultMeta: { service: namespace, tag: customTag },
    transports,
    exitOnError: false,
  });

  const stream = {
    write(message, encoding) {
      winstonLogger.info(message.trim());
    },
  };

  winstonLogger.stream = stream;

  // Wrapper to support both (message) and (message, meta) signatures
  const logger = {
    log(level, message, meta = {}) {
      winstonLogger.log(level, message, meta);
    },
    error(message, meta = {}) {
      if (typeof message === 'object' && message.message) {
        // If message is an Error object
        winstonLogger.error(message.message, { ...meta, stack: message.stack });
      } else {
        winstonLogger.error(message, meta);
      }
    },
    warn(message, meta = {}) {
      winstonLogger.warn(message, meta);
    },
    verbose(message, meta = {}) {
      winstonLogger.verbose(message, meta);
    },
    info(message, meta = {}) {
      winstonLogger.info(message, meta);
    },
    debug(message, meta = {}) {
      winstonLogger.debug(message, meta);
    },
    silly(message, meta = {}) {
      winstonLogger.silly(message, meta);
    },
    // Child logger with preset context (useful for request-scoped logging)
    child(defaultMeta) {
      return {
        error: (msg, meta = {}) => logger.error(msg, { ...defaultMeta, ...meta }),
        warn: (msg, meta = {}) => logger.warn(msg, { ...defaultMeta, ...meta }),
        info: (msg, meta = {}) => logger.info(msg, { ...defaultMeta, ...meta }),
        debug: (msg, meta = {}) => logger.debug(msg, { ...defaultMeta, ...meta }),
      };
    },
  };

  return logger;
}

module.exports = applicationLogger;
