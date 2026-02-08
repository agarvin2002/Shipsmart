const TIMEOUTS = {
  // API request timeouts (milliseconds)
  CARRIER_API_DEFAULT: 15000, // 15 seconds
  CARRIER_API_EXTENDED: 30000, // 30 seconds (for complex requests)
  INTERNAL_API: 5000, // 5 seconds (internal services)

  // Worker timeouts
  WORKER_JOB_DEFAULT: 60000, // 1 minute
  WORKER_JOB_EXTENDED: 120000, // 2 minutes
  WORKER_SHUTDOWN: 30000, // 30 seconds graceful shutdown

  // Cache TTL (seconds)
  CACHE_RATE_QUOTES: 300, // 5 minutes
  CACHE_CARRIER_TOKENS: 3600, // 1 hour
  TOKEN_CACHE_SAFETY_MARGIN_SECONDS: 60, // Safety buffer before token expiry
  CACHE_USER_SESSION: 86400, // 24 hours

  // Authentication expiry (seconds)
  JWT_SESSION: 2592000, // 30 days
  PASSWORD_RESET_TOKEN: 3600, // 1 hour
  EMAIL_VERIFICATION_TOKEN: 86400, // 24 hours

  // Database retention (days)
  LOG_RETENTION_DAYS: 90,
  RATE_HISTORY_RETENTION_DAYS: 365,
  SESSION_CLEANUP_DAYS: 30,
};

// Rate limiter windows (milliseconds)
const RATE_LIMIT_WINDOWS = {
  LOGIN: 15 * 60 * 1000, // 15 minutes
  REGISTRATION: 15 * 60 * 1000, // 15 minutes
  API_GENERAL: 60 * 1000, // 1 minute
};

module.exports = {
  TIMEOUTS,
  RATE_LIMIT_WINDOWS,
};
