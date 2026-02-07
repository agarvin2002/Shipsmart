/**
 * JWT Helper Unit Tests
 *
 * Tests JWT token generation, verification, and decoding.
 */

// Mock uuid before requiring jwt-helper
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));

// Mock config module
jest.mock('@shipsmart/env');

const jwt = require('jsonwebtoken');
const JwtHelper = require('../../../helpers/jwt-helper');
const { createMockUser } = require('../../utils/test-helpers');
const config = require('@shipsmart/env');
const { v4: uuidv4 } = require('uuid');

describe('JwtHelper', () => {
  const TEST_SECRET = 'test-jwt-secret-for-unit-testing-min-32-chars-long';
  let mockUser;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup config mock
    config.get.mockImplementation((key) => {
      if (key === 'jwt:secret') return TEST_SECRET;
      return null;
    });

    // Reset uuid mock to return default value
    uuidv4.mockReturnValue('mock-uuid-1234');

    // Create mock user
    mockUser = createMockUser({
      id: 'user-123',
      email: 'test@example.com',
    });
  });

  describe('#getSecret', () => {
    it('should return JWT secret from config', () => {
      const secret = JwtHelper.getSecret();

      expect(secret).toBe(TEST_SECRET);
      expect(config.get).toHaveBeenCalledWith('jwt:secret');
    });

    it('should throw error when JWT secret is not configured', () => {
      config.get.mockReturnValue(null);

      expect(() => JwtHelper.getSecret()).toThrow('JWT_SECRET is not configured');
    });
  });

  describe('#generateAccessToken', () => {
    it('should generate valid JWT token with user data', () => {
      const result = JwtHelper.generateAccessToken(mockUser);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('jti');
      expect(typeof result.token).toBe('string');
      expect(typeof result.jti).toBe('string');

      // Verify token structure
      const decoded = jwt.decode(result.token);
      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.jti).toBe(result.jti);
      expect(decoded).toHaveProperty('iat');
      expect(decoded).toHaveProperty('exp');
    });

    it('should generate unique JTI for each token', () => {
      // Mock uuid to return different values
      uuidv4.mockReturnValueOnce('uuid-1');
      uuidv4.mockReturnValueOnce('uuid-2');

      const result1 = JwtHelper.generateAccessToken(mockUser);
      const result2 = JwtHelper.generateAccessToken(mockUser);

      expect(result1.jti).toBe('uuid-1');
      expect(result2.jti).toBe('uuid-2');
      expect(result1.token).not.toBe(result2.token);
    });

    it('should set token expiration to 24 hours', () => {
      const result = JwtHelper.generateAccessToken(mockUser);
      const decoded = jwt.decode(result.token);

      const expectedExp = decoded.iat + (24 * 60 * 60); // 24 hours in seconds
      expect(decoded.exp).toBe(expectedExp);
    });
  });

  describe('#verifyToken', () => {
    it('should verify and decode valid token', () => {
      const { token } = JwtHelper.generateAccessToken(mockUser);

      const result = JwtHelper.verifyToken(token);

      expect(result).not.toBeNull();
      expect(result.userId).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
      expect(result).toHaveProperty('jti');
      expect(result).toHaveProperty('iat');
      expect(result).toHaveProperty('exp');
    });

    it('should return null for invalid token', () => {
      const invalidToken = 'invalid.jwt.token';

      const result = JwtHelper.verifyToken(invalidToken);

      expect(result).toBeNull();
    });

    it('should return null for expired token', () => {
      // Create expired token (expired 1 hour ago)
      const expiredPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        jti: 'expired-jti',
      };
      const expiredToken = jwt.sign(expiredPayload, TEST_SECRET, { expiresIn: '-1h' });

      const result = JwtHelper.verifyToken(expiredToken);

      expect(result).toBeNull();
    });

    it('should return null for token with wrong secret', () => {
      const wrongSecret = 'wrong-secret-key-that-does-not-match';
      const tokenWithWrongSecret = jwt.sign(
        { userId: mockUser.id, email: mockUser.email, jti: 'test' },
        wrongSecret,
        { expiresIn: '24h' }
      );

      const result = JwtHelper.verifyToken(tokenWithWrongSecret);

      expect(result).toBeNull();
    });

    it('should return null for malformed token', () => {
      const malformedToken = 'not.a.valid.jwt';

      const result = JwtHelper.verifyToken(malformedToken);

      expect(result).toBeNull();
    });
  });

  describe('#decodeToken', () => {
    it('should decode valid token without verification', () => {
      const { token } = JwtHelper.generateAccessToken(mockUser);

      const result = JwtHelper.decodeToken(token);

      expect(result).not.toBeNull();
      expect(result.userId).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
      expect(result).toHaveProperty('jti');
      expect(result).toHaveProperty('iat');
      expect(result).toHaveProperty('exp');
    });

    it('should decode expired token (does not verify)', () => {
      const expiredPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        jti: 'expired-jti',
      };
      const expiredToken = jwt.sign(expiredPayload, TEST_SECRET, { expiresIn: '-1h' });

      const result = JwtHelper.decodeToken(expiredToken);

      expect(result).not.toBeNull();
      expect(result.userId).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
    });

    it('should return null for malformed token', () => {
      const malformedToken = 'not.a.valid.jwt';

      const result = JwtHelper.decodeToken(malformedToken);

      expect(result).toBeNull();
    });
  });
});
