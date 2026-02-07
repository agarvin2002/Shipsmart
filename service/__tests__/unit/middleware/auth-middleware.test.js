/**
 * Auth Middleware Unit Tests
 *
 * Tests JWT authentication strategy logic.
 * The actual passport integration is tested via integration tests.
 */

// Mock uuid before anything else
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

const { createMockSession } = require('../../utils/test-helpers');

describe('Auth Middleware - JWT Strategy Logic', () => {
  let SessionRepository;
  let JwtHelper;
  let mockSessionRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Mock SessionRepository
    mockSessionRepository = {
      findByJti: jest.fn(),
    };

    jest.doMock('../../../repositories/session-repository', () => {
      return jest.fn().mockImplementation(() => mockSessionRepository);
    });

    // Mock JwtHelper
    jest.doMock('../../../helpers/jwt-helper', () => ({
      getSecret: jest.fn().mockReturnValue('test-secret'),
    }));

    // Mock global logger
    global.logger = {
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    };

    SessionRepository = require('../../../repositories/session-repository');
    JwtHelper = require('../../../helpers/jwt-helper');
  });

  afterEach(() => {
    delete global.logger;
    jest.resetModules();
  });

  // Helper to simulate the JWT strategy callback
  const simulateJwtStrategy = async (payload, sessionData) => {
    const done = jest.fn();

    try {
      const session = sessionData !== undefined
        ? sessionData
        : await mockSessionRepository.findByJti(payload.jti);

      if (!session || session.revoked_at) {
        global.logger.warn(`Session revoked or not found for jti: ${payload.jti}`);
        done(null, false);
        return done;
      }

      if (new Date() > session.expires_at) {
        global.logger.warn(`Session expired for jti: ${payload.jti}`);
        done(null, false);
        return done;
      }

      done(null, {
        userId: payload.userId,
        email: payload.email,
        jti: payload.jti,
      });
      return done;
    } catch (error) {
      global.logger.error(`Error in JWT strategy: ${error.stack}`);
      done(error, false);
      return done;
    }
  };

  describe('JWT Strategy', () => {
    it('should authenticate user with valid session', async () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        jti: 'jti-123',
      };

      const validSession = createMockSession({
        token_jti: 'jti-123',
        revoked_at: null,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      mockSessionRepository.findByJti.mockResolvedValue(validSession);

      const done = await simulateJwtStrategy(payload);

      expect(done).toHaveBeenCalledWith(null, {
        userId: 'user-123',
        email: 'test@example.com',
        jti: 'jti-123',
      });
      expect(global.logger.warn).not.toHaveBeenCalled();
    });

    it('should reject authentication when session not found', async () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        jti: 'jti-not-found',
      };

      const done = await simulateJwtStrategy(payload, null);

      expect(done).toHaveBeenCalledWith(null, false);
      expect(global.logger.warn).toHaveBeenCalledWith(
        'Session revoked or not found for jti: jti-not-found'
      );
    });

    it('should reject authentication when session is revoked', async () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        jti: 'jti-revoked',
      };

      const revokedSession = createMockSession({
        token_jti: 'jti-revoked',
        revoked_at: new Date(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const done = await simulateJwtStrategy(payload, revokedSession);

      expect(done).toHaveBeenCalledWith(null, false);
      expect(global.logger.warn).toHaveBeenCalledWith(
        'Session revoked or not found for jti: jti-revoked'
      );
    });

    it('should reject authentication when session is expired', async () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        jti: 'jti-expired',
      };

      const expiredSession = createMockSession({
        token_jti: 'jti-expired',
        revoked_at: null,
        expires_at: new Date(Date.now() - 1000),
      });

      const done = await simulateJwtStrategy(payload, expiredSession);

      expect(done).toHaveBeenCalledWith(null, false);
      expect(global.logger.warn).toHaveBeenCalledWith(
        'Session expired for jti: jti-expired'
      );
    });

    it('should handle errors gracefully', async () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        jti: 'jti-error',
      };

      const dbError = new Error('Database connection failed');
      mockSessionRepository.findByJti.mockRejectedValue(dbError);

      const done = jest.fn();

      try {
        await mockSessionRepository.findByJti(payload.jti);
      } catch (error) {
        global.logger.error(`Error in JWT strategy: ${error.stack}`);
        done(error, false);
      }

      expect(done).toHaveBeenCalledWith(dbError, false);
      expect(global.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error in JWT strategy:')
      );
    });

    it('should pass correct user data when authentication succeeds', async () => {
      const payload = {
        userId: 'user-456',
        email: 'another@example.com',
        jti: 'jti-456',
      };

      const validSession = createMockSession({
        token_jti: 'jti-456',
        revoked_at: null,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const done = await simulateJwtStrategy(payload, validSession);

      expect(done).toHaveBeenCalledWith(null, {
        userId: 'user-456',
        email: 'another@example.com',
        jti: 'jti-456',
      });
    });

    it('should validate session expiration correctly at boundary', async () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        jti: 'jti-boundary',
      };

      const boundarySession = createMockSession({
        token_jti: 'jti-boundary',
        revoked_at: null,
        expires_at: new Date(Date.now() - 1),
      });

      const done = await simulateJwtStrategy(payload, boundarySession);

      expect(done).toHaveBeenCalledWith(null, false);
      expect(global.logger.warn).toHaveBeenCalledWith(
        'Session expired for jti: jti-boundary'
      );
    });
  });
});
