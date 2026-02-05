/**
 * Rate Limiter Middleware Unit Tests
 *
 * CRITICAL SECURITY TESTS:
 * - Prevents brute force login attempts
 * - Prevents registration spam
 * - Prevents async job queue flooding
 * - Prevents job status polling abuse
 */

const rateLimit = require('express-rate-limit');

// Mock express-rate-limit
jest.mock('express-rate-limit');

describe('Rate Limiter Middleware', () => {
  let rateLimiterModule;

  beforeAll(() => {
    // Create a mock rate limit factory that stores config
    const mockRateLimitFactory = jest.fn((config) => {
      // Return a middleware function that includes the config
      const middleware = (req, res, next) => {
        // Check skip condition if exists
        if (config.skip && config.skip(req)) {
          return next();
        }

        // Simulate rate limit checking
        const key = config.keyGenerator ? config.keyGenerator(req) : req.ip;
        req.__rateLimitKey = key;
        req.__rateLimitMax = config.max;
        req.__rateLimitWindow = config.windowMs;

        next();
      };

      // Attach config to middleware for testing
      middleware.config = config;
      return middleware;
    });

    rateLimit.mockImplementation(mockRateLimitFactory);

    // Require the module after mocking
    rateLimiterModule = require('../../../middleware/rate-limiter');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loginLimiter', () => {
    it('should be configured with correct parameters', () => {
      const { loginLimiter } = rateLimiterModule;

      expect(loginLimiter).toBeDefined();
      expect(loginLimiter.config).toBeDefined();
      expect(loginLimiter.config.windowMs).toBe(15 * 60 * 1000); // 15 minutes
      expect(loginLimiter.config.max).toBe(5); // 5 attempts
      expect(loginLimiter.config.standardHeaders).toBe(true);
      expect(loginLimiter.config.legacyHeaders).toBe(false);
    });

    it('should have correct error message', () => {
      const { loginLimiter } = rateLimiterModule;

      expect(loginLimiter.config.message).toEqual({
        success: false,
        error: {
          code: 'RATE_LIMIT',
          message: 'Too many login attempts, please try again later'
        }
      });
    });

    it('should apply rate limiting to login requests', () => {
      const { loginLimiter } = rateLimiterModule;
      const req = { ip: '192.168.1.1', body: { email: 'test@example.com' } };
      const res = {};
      const next = jest.fn();

      loginLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.__rateLimitMax).toBe(5);
      expect(req.__rateLimitWindow).toBe(15 * 60 * 1000);
    });

    it('should use IP address as default key', () => {
      const { loginLimiter } = rateLimiterModule;
      const req = { ip: '192.168.1.100' };
      const res = {};
      const next = jest.fn();

      loginLimiter(req, res, next);

      expect(req.__rateLimitKey).toBe('192.168.1.100');
    });
  });

  describe('registerLimiter', () => {
    it('should be configured with correct parameters', () => {
      const { registerLimiter } = rateLimiterModule;

      expect(registerLimiter.config).toBeDefined();
      expect(registerLimiter.config.windowMs).toBe(15 * 60 * 1000); // 15 minutes
      expect(registerLimiter.config.max).toBe(3); // 3 attempts (stricter than login)
      expect(registerLimiter.config.standardHeaders).toBe(true);
      expect(registerLimiter.config.legacyHeaders).toBe(false);
    });

    it('should have correct error message', () => {
      const { registerLimiter } = rateLimiterModule;

      expect(registerLimiter.config.message).toEqual({
        success: false,
        error: {
          code: 'RATE_LIMIT',
          message: 'Too many registration attempts, please try again later'
        }
      });
    });

    it('should apply stricter limit than login (3 vs 5)', () => {
      const { registerLimiter, loginLimiter } = rateLimiterModule;

      expect(registerLimiter.config.max).toBe(3);
      expect(loginLimiter.config.max).toBe(5);
      expect(registerLimiter.config.max).toBeLessThan(loginLimiter.config.max);
    });

    it('should apply rate limiting to registration requests', () => {
      const { registerLimiter } = rateLimiterModule;
      const req = { ip: '192.168.1.1', body: { email: 'newuser@example.com' } };
      const res = {};
      const next = jest.fn();

      registerLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.__rateLimitMax).toBe(3);
    });
  });

  describe('asyncJobLimiter', () => {
    it('should be configured with correct parameters', () => {
      const { asyncJobLimiter } = rateLimiterModule;

      expect(asyncJobLimiter.config).toBeDefined();
      expect(asyncJobLimiter.config.windowMs).toBe(15 * 60 * 1000); // 15 minutes
      expect(asyncJobLimiter.config.max).toBe(20); // 20 jobs per window
      expect(asyncJobLimiter.config.standardHeaders).toBe(true);
      expect(asyncJobLimiter.config.legacyHeaders).toBe(false);
    });

    it('should have correct error message', () => {
      const { asyncJobLimiter } = rateLimiterModule;

      expect(asyncJobLimiter.config.message).toEqual({
        success: false,
        error: {
          code: 'RATE_LIMIT',
          message: 'Too many rate fetch requests. Please try again later.'
        }
      });
    });

    it('should use user ID as rate limit key when user is authenticated', () => {
      const { asyncJobLimiter } = rateLimiterModule;
      const req = {
        ip: '192.168.1.1',
        user: { userId: 'user-123' },
        query: { async: 'true' }
      };

      const key = asyncJobLimiter.config.keyGenerator(req);

      expect(key).toBe('user-123');
    });

    it('should fall back to IP address when user is not authenticated', () => {
      const { asyncJobLimiter } = rateLimiterModule;
      const req = {
        ip: '192.168.1.1',
        query: { async: 'true' }
      };

      const key = asyncJobLimiter.config.keyGenerator(req);

      expect(key).toBe('192.168.1.1');
    });

    it('should skip rate limiting when async is not true', () => {
      const { asyncJobLimiter } = rateLimiterModule;
      const req = {
        ip: '192.168.1.1',
        user: { userId: 'user-123' },
        query: { async: 'false' }
      };
      const res = {};
      const next = jest.fn();

      // The skip function should return true for non-async requests
      const shouldSkip = asyncJobLimiter.config.skip(req);

      expect(shouldSkip).toBe(true);
    });

    it('should NOT skip rate limiting when async is true', () => {
      const { asyncJobLimiter } = rateLimiterModule;
      const req = {
        ip: '192.168.1.1',
        user: { userId: 'user-123' },
        query: { async: 'true' }
      };

      const shouldSkip = asyncJobLimiter.config.skip(req);

      expect(shouldSkip).toBe(false);
    });

    it('should apply rate limiting to async job requests', () => {
      const { asyncJobLimiter } = rateLimiterModule;
      const req = {
        ip: '192.168.1.1',
        user: { userId: 'user-123' },
        query: { async: 'true' }
      };
      const res = {};
      const next = jest.fn();

      asyncJobLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.__rateLimitKey).toBe('user-123');
      expect(req.__rateLimitMax).toBe(20);
    });

    it('should handle user ID as number', () => {
      const { asyncJobLimiter } = rateLimiterModule;
      const req = {
        ip: '192.168.1.1',
        user: { userId: 12345 },
        query: { async: 'true' }
      };

      const key = asyncJobLimiter.config.keyGenerator(req);

      expect(key).toBe('12345');
    });
  });

  describe('jobStatusLimiter', () => {
    it('should be configured with correct parameters', () => {
      const { jobStatusLimiter } = rateLimiterModule;

      expect(jobStatusLimiter.config).toBeDefined();
      expect(jobStatusLimiter.config.windowMs).toBe(1 * 60 * 1000); // 1 minute
      expect(jobStatusLimiter.config.max).toBe(60); // 60 requests per minute
      expect(jobStatusLimiter.config.standardHeaders).toBe(true);
      expect(jobStatusLimiter.config.legacyHeaders).toBe(false);
    });

    it('should have correct error message', () => {
      const { jobStatusLimiter } = rateLimiterModule;

      expect(jobStatusLimiter.config.message).toEqual({
        success: false,
        error: {
          code: 'RATE_LIMIT',
          message: 'Too many job status requests. Please slow down polling.'
        }
      });
    });

    it('should allow approximately 1 request per second', () => {
      const { jobStatusLimiter } = rateLimiterModule;

      // 60 requests per 60 seconds = 1 per second
      const requestsPerSecond = jobStatusLimiter.config.max / (jobStatusLimiter.config.windowMs / 1000);

      expect(requestsPerSecond).toBe(1);
    });

    it('should use user ID as rate limit key when user is authenticated', () => {
      const { jobStatusLimiter } = rateLimiterModule;
      const req = {
        ip: '192.168.1.1',
        user: { userId: 'user-456' }
      };

      const key = jobStatusLimiter.config.keyGenerator(req);

      expect(key).toBe('user-456');
    });

    it('should fall back to IP address when user is not authenticated', () => {
      const { jobStatusLimiter } = rateLimiterModule;
      const req = {
        ip: '192.168.1.50'
      };

      const key = jobStatusLimiter.config.keyGenerator(req);

      expect(key).toBe('192.168.1.50');
    });

    it('should apply rate limiting to job status polling requests', () => {
      const { jobStatusLimiter } = rateLimiterModule;
      const req = {
        ip: '192.168.1.1',
        user: { userId: 'user-456' },
        params: { jobId: 'job-123' }
      };
      const res = {};
      const next = jest.fn();

      jobStatusLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.__rateLimitKey).toBe('user-456');
      expect(req.__rateLimitMax).toBe(60);
      expect(req.__rateLimitWindow).toBe(60000); // 1 minute in ms
    });
  });

  describe('Rate Limiter Comparisons', () => {
    it('should have different limits for different endpoints', () => {
      const {
        loginLimiter,
        registerLimiter,
        asyncJobLimiter,
        jobStatusLimiter
      } = rateLimiterModule;

      // All limits should be different
      const limits = [
        loginLimiter.config.max,
        registerLimiter.config.max,
        asyncJobLimiter.config.max,
        jobStatusLimiter.config.max
      ];

      const uniqueLimits = [...new Set(limits)];
      expect(uniqueLimits.length).toBe(4); // All different
    });

    it('should have stricter limit for registration than login', () => {
      const { loginLimiter, registerLimiter } = rateLimiterModule;

      // Registration should be stricter (lower max) than login
      expect(registerLimiter.config.max).toBeLessThan(loginLimiter.config.max);
    });

    it('should have shorter window for job status polling', () => {
      const { asyncJobLimiter, jobStatusLimiter } = rateLimiterModule;

      // Job status should have shorter window (more frequent polling allowed)
      expect(jobStatusLimiter.config.windowMs).toBeLessThan(asyncJobLimiter.config.windowMs);
    });

    it('should all use standard headers', () => {
      const {
        loginLimiter,
        registerLimiter,
        asyncJobLimiter,
        jobStatusLimiter
      } = rateLimiterModule;

      expect(loginLimiter.config.standardHeaders).toBe(true);
      expect(registerLimiter.config.standardHeaders).toBe(true);
      expect(asyncJobLimiter.config.standardHeaders).toBe(true);
      expect(jobStatusLimiter.config.standardHeaders).toBe(true);
    });

    it('should all disable legacy headers', () => {
      const {
        loginLimiter,
        registerLimiter,
        asyncJobLimiter,
        jobStatusLimiter
      } = rateLimiterModule;

      expect(loginLimiter.config.legacyHeaders).toBe(false);
      expect(registerLimiter.config.legacyHeaders).toBe(false);
      expect(asyncJobLimiter.config.legacyHeaders).toBe(false);
      expect(jobStatusLimiter.config.legacyHeaders).toBe(false);
    });
  });

  describe('Security Properties', () => {
    it('should export all four rate limiters', () => {
      const {
        loginLimiter,
        registerLimiter,
        asyncJobLimiter,
        jobStatusLimiter
      } = rateLimiterModule;

      expect(loginLimiter).toBeDefined();
      expect(registerLimiter).toBeDefined();
      expect(asyncJobLimiter).toBeDefined();
      expect(jobStatusLimiter).toBeDefined();
    });

    it('should all return functions (middleware)', () => {
      const {
        loginLimiter,
        registerLimiter,
        asyncJobLimiter,
        jobStatusLimiter
      } = rateLimiterModule;

      expect(typeof loginLimiter).toBe('function');
      expect(typeof registerLimiter).toBe('function');
      expect(typeof asyncJobLimiter).toBe('function');
      expect(typeof jobStatusLimiter).toBe('function');
    });

    it('should all have consistent error response format', () => {
      const {
        loginLimiter,
        registerLimiter,
        asyncJobLimiter,
        jobStatusLimiter
      } = rateLimiterModule;

      const errorMessages = [
        loginLimiter.config.message,
        registerLimiter.config.message,
        asyncJobLimiter.config.message,
        jobStatusLimiter.config.message
      ];

      // All should have the same structure
      errorMessages.forEach(msg => {
        expect(msg).toHaveProperty('success', false);
        expect(msg).toHaveProperty('error');
        expect(msg.error).toHaveProperty('code', 'RATE_LIMIT');
        expect(msg.error).toHaveProperty('message');
        expect(typeof msg.error.message).toBe('string');
      });
    });
  });
});
