const { RATE_LIMIT_WINDOWS } = require('./timeouts');

const RATE_LIMITS = {
  // Authentication endpoints
  LOGIN: {
    WINDOW_MS: RATE_LIMIT_WINDOWS.LOGIN,
    MAX_ATTEMPTS: 5,
    MESSAGE: 'Too many login attempts, please try again later',
  },

  REGISTRATION: {
    WINDOW_MS: RATE_LIMIT_WINDOWS.REGISTRATION,
    MAX_ATTEMPTS: 3,
    MESSAGE: 'Too many registration attempts, please try again later',
  },

  PASSWORD_RESET: {
    WINDOW_MS: RATE_LIMIT_WINDOWS.LOGIN,
    MAX_ATTEMPTS: 3,
    MESSAGE: 'Too many password reset attempts. Please try again later',
  },

  // Job creation and polling
  ASYNC_JOB: {
    WINDOW_MS: RATE_LIMIT_WINDOWS.LOGIN,
    MAX_ATTEMPTS: 20,
    MESSAGE: 'Too many rate fetch requests. Please try again later',
  },

  JOB_STATUS: {
    WINDOW_MS: RATE_LIMIT_WINDOWS.API_GENERAL,
    MAX_ATTEMPTS: 60,
    MESSAGE: 'Too many job status requests. Please slow down polling',
  },
};

module.exports = {
  RATE_LIMITS,
};
