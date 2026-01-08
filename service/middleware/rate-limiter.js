const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many login attempts, please try again later' } },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many registration attempts, please try again later' } },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for async job creation - prevents queue flooding
const asyncJobLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 20,  // Max 20 async jobs per 15 minutes per user
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT',
      message: 'Too many rate fetch requests. Please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Key by user ID to prevent sharing limits across users
  keyGenerator: (req) => req.user?.userId?.toString() || req.ip,
  // Only apply rate limit when async=true
  skip: (req) => req.query.async !== 'true',
});

// Rate limiter for job status polling - prevents polling abuse
const jobStatusLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 minute
  max: 60,  // Max 60 requests per minute (1 per second sustained)
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT',
      message: 'Too many job status requests. Please slow down polling.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId?.toString() || req.ip,
});

module.exports = {
  loginLimiter,
  registerLimiter,
  asyncJobLimiter,
  jobStatusLimiter,
};
