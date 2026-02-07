const config = require('@shipsmart/env');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const addRequestId = require('express-request-id')();
const bodyParser = require('body-parser');
const SentryHelper = require('./helpers/sentry-helper');

// Increase max listeners to prevent warning during hot reloads and multiple event handlers
process.setMaxListeners(20);

global.logger = require('@shipsmart/logger').application('api');

const initializeLogger = require('./helpers/logger-initializer');
initializeLogger();

const db = require('./models');

const app = express();

// Initialize Sentry error tracking (only if SENTRY_DSN is configured)
SentryHelper.init(app);

db.sequelize.sync()
  .then(() => {
    logger.info('Database synchronized successfully');
  })
  .catch((error) => {
    logger.error(`Error synchronizing database: ${error.stack}`);
  });

const apiRouter = require('./routes');
const requestLogger = require('./middleware/request-logger');
const contextManager = require('./middleware/context-manager');

// Security headers - Helmet middleware
// Apply early in the middleware stack for maximum protection
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(addRequestId);
app.use(contextManager);
app.use(bodyParser.urlencoded({ extended: true, limit: '20mb' }));
app.use(bodyParser.json({ limit: '20mb' }));
app.use(requestLogger);

// CORS configuration - restrict origins based on environment
app.use((req, res, next) => {
  // Get allowed origins from environment or use defaults
  const allowedOriginsEnv = config.get('cors:allowedOrigins') || process.env.ALLOWED_ORIGINS;
  const environment = config.get('environment') || process.env.NODE_ENV;

  let allowedOrigins = [];

  // Parse allowed origins from environment variable (comma-separated)
  if (allowedOriginsEnv) {
    allowedOrigins = allowedOriginsEnv.split(',').map(origin => origin.trim());
  } else {
    // Default allowed origins based on environment
    if (environment === 'production') {
      // PRODUCTION: Restrict to specific domains only
      allowedOrigins = [
        'https://app.shipsmart.com',
        'https://admin.shipsmart.com'
      ];
    } else if (environment === 'staging') {
      // STAGING: Allow staging domains
      allowedOrigins = [
        'https://staging.shipsmart.com',
        'https://staging-admin.shipsmart.com',
        'http://localhost:3000',
        'http://localhost:3001'
      ];
    } else {
      // DEVELOPMENT: Allow localhost and common development ports
      allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:4200',
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001'
      ];
    }
  }

  // Check if request origin is in allowed list
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  } else if (environment === 'development') {
    // In development, allow all origins for easier testing
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  // In production/staging, if origin not in whitelist, no CORS header is set (request blocked)

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

app.use('/api/', apiRouter);

const { ResponseFormatter } = require('@shipsmart/http');

// Sentry error handler - captures errors before they're handled
app.use(SentryHelper.errorHandler());

app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  if (err) {
    logger.error(`[${req.id}] Exception occurred while processing the request. ${err.stack}`);
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Unexpected Error occurred.';
    return res.status(statusCode).json(ResponseFormatter.formatError(message, req.id, statusCode));
  }

  return res.status(404).json(ResponseFormatter.formatError('Not Found', req.id, 404));
});

// Start server
const servicePort = config.get('service:port') || 3001;
const server = app.listen(servicePort, () => {
  logger.info(`Server listening on port ${servicePort}`);
});

// Set keep-alive timeout
server.keepAliveTimeout = 65000;

// Graceful shutdown handler
let isShuttingDown = false;

function gracefulShutdown(signal) {
  // Prevent duplicate shutdown attempts
  if (isShuttingDown) {
    logger.warn(`Shutdown already in progress, ignoring ${signal}`);
    return;
  }
  isShuttingDown = true;

  const isDevelopment = process.env.NODE_ENV === 'development';
  logger.info(`${signal} received. Closing HTTP server gracefully...`);

  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');

    // Flush pending Sentry events
    await SentryHelper.flush();

    // Close database connections
    db.sequelize.close()
      .then(() => {
        logger.info('Database connections closed');

        // Development: Fast shutdown for nodemon restarts
        // Production: Delay to ensure port is fully released by OS
        const exitDelay = isDevelopment ? 100 : 1000;

        setTimeout(() => {
          logger.info('Graceful shutdown complete');
          process.exit(0);
        }, exitDelay);
      })
      .catch((err) => {
        logger.error(`Error closing database: ${err.message}`);

        // Give Winston time to flush logs before exit
        setTimeout(() => {
          process.exit(1);
        }, 100);
      });
  });

  // Force exit timeout (longer in production for safety)
  const forceExitTimeout = setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');

    // Give Winston time to flush logs before exit
    setTimeout(() => {
      process.exit(1);
    }, 100);
  }, isDevelopment ? 3000 : 8000);

  // Don't keep the process alive just for this timeout
  forceExitTimeout.unref();
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

module.exports = app;
