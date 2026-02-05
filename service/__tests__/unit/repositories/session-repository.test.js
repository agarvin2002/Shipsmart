/**
 * SessionRepository Unit Tests
 */

// Mock uuid before anything else
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

jest.mock('../../../models');

const SessionRepository = require('../../../repositories/session-repository');
const { Session } = require('../../../models');
const { Op } = require('sequelize');

describe('SessionRepository', () => {
  let repository;
  let mockSession;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSession = {
      id: 'session-123',
      user_id: 'user-123',
      token_jti: 'jti-123',
      revoked_at: null,
      expires_at: new Date(Date.now() + 86400000),
    };

    repository = new SessionRepository();
  });

  describe('#findByJti', () => {
    it('should find session by JTI', async () => {
      Session.findOne = jest.fn().mockResolvedValue(mockSession);

      const result = await repository.findByJti('jti-123');

      expect(Session.findOne).toHaveBeenCalledWith({ where: { token_jti: 'jti-123' } });
      expect(result).toBe(mockSession);
    });
  });

  describe('#findByUserId', () => {
    it('should find all sessions by user ID', async () => {
      Session.findAll = jest.fn().mockResolvedValue([mockSession]);

      const result = await repository.findByUserId('user-123');

      expect(Session.findAll).toHaveBeenCalledWith({ where: { user_id: 'user-123' } });
      expect(result).toEqual([mockSession]);
    });
  });

  describe('#findActiveByUserId', () => {
    it('should find only active sessions by user ID', async () => {
      Session.findAll = jest.fn().mockResolvedValue([mockSession]);

      const result = await repository.findActiveByUserId('user-123');

      expect(Session.findAll).toHaveBeenCalledWith({
        where: {
          user_id: 'user-123',
          revoked_at: null,
        },
      });
      expect(result).toEqual([mockSession]);
    });
  });

  describe('#create', () => {
    it('should create session', async () => {
      const sessionData = {
        user_id: 'user-123',
        token_jti: 'jti-456',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        expires_at: new Date(),
      };
      Session.create = jest.fn().mockResolvedValue(mockSession);

      const result = await repository.create(sessionData);

      expect(Session.create).toHaveBeenCalledWith(sessionData);
      expect(result).toBe(mockSession);
    });
  });

  describe('#revoke', () => {
    it('should revoke session by JTI', async () => {
      Session.update = jest.fn().mockResolvedValue([1]);

      const result = await repository.revoke('jti-123');

      expect(Session.update).toHaveBeenCalledWith(
        { revoked_at: expect.any(Date) },
        { where: { token_jti: 'jti-123' } }
      );
      expect(result).toEqual([1]);
    });
  });

  describe('#revokeAllByUserId', () => {
    it('should revoke all active sessions for user', async () => {
      Session.update = jest.fn().mockResolvedValue([2]);

      const result = await repository.revokeAllByUserId('user-123');

      expect(Session.update).toHaveBeenCalledWith(
        { revoked_at: expect.any(Date) },
        { where: { user_id: 'user-123', revoked_at: null } }
      );
      expect(result).toEqual([2]);
    });
  });

  describe('#deleteExpired', () => {
    it('should delete expired sessions', async () => {
      Session.destroy = jest.fn().mockResolvedValue(5);

      const result = await repository.deleteExpired();

      expect(Session.destroy).toHaveBeenCalledWith({
        where: { expires_at: { [Op.lt]: expect.any(Date) } },
      });
      expect(result).toBe(5);
    });
  });
});
