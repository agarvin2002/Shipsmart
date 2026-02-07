/**
 * UserRepository Unit Tests
 */

// Mock uuid before anything else
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

jest.mock('../../../models');

const UserRepository = require('../../../repositories/user-repository');
const { User } = require('../../../models');

describe('UserRepository', () => {
  let repository;
  let mockUser;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      update: jest.fn(),
      destroy: jest.fn(),
    };

    repository = new UserRepository();
  });

  describe('#findById', () => {
    it('should find user by ID', async () => {
      User.findByPk = jest.fn().mockResolvedValue(mockUser);

      const result = await repository.findById('user-123');

      expect(User.findByPk).toHaveBeenCalledWith('user-123');
      expect(result).toBe(mockUser);
    });
  });

  describe('#findByEmail', () => {
    it('should find user by email', async () => {
      User.findOne = jest.fn().mockResolvedValue(mockUser);

      const result = await repository.findByEmail('test@example.com');

      expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(result).toBe(mockUser);
    });
  });

  describe('#findAll', () => {
    it('should find all users with filters', async () => {
      User.findAll = jest.fn().mockResolvedValue([mockUser]);

      const result = await repository.findAll({ status: 'active' });

      expect(User.findAll).toHaveBeenCalledWith({ where: { status: 'active' } });
      expect(result).toEqual([mockUser]);
    });
  });

  describe('#findWithAddresses', () => {
    it('should find user with addresses', async () => {
      User.findByPk = jest.fn().mockResolvedValue(mockUser);

      const result = await repository.findWithAddresses('user-123');

      expect(User.findByPk).toHaveBeenCalledWith('user-123', {
        include: [{ association: 'addresses' }],
      });
      expect(result).toBe(mockUser);
    });
  });

  describe('#findWithCredentials', () => {
    it('should find user with carrier credentials', async () => {
      User.findByPk = jest.fn().mockResolvedValue(mockUser);

      const result = await repository.findWithCredentials('user-123');

      expect(User.findByPk).toHaveBeenCalledWith('user-123', {
        include: [{ association: 'carrierCredentials' }],
      });
      expect(result).toBe(mockUser);
    });
  });

  describe('#create', () => {
    it('should create user', async () => {
      const userData = { email: 'new@example.com', password_hash: 'hash' };
      User.create = jest.fn().mockResolvedValue(mockUser);

      const result = await repository.create(userData);

      expect(User.create).toHaveBeenCalledWith(userData);
      expect(result).toBe(mockUser);
    });
  });

  describe('#update', () => {
    it('should update user', async () => {
      User.findByPk = jest.fn().mockResolvedValue(mockUser);
      mockUser.update.mockResolvedValue(mockUser);

      const result = await repository.update('user-123', { first_name: 'Jane' });

      expect(User.findByPk).toHaveBeenCalledWith('user-123');
      expect(mockUser.update).toHaveBeenCalledWith({ first_name: 'Jane' });
      expect(result).toBe(mockUser);
    });

    it('should return null if user not found', async () => {
      User.findByPk = jest.fn().mockResolvedValue(null);

      const result = await repository.update('user-not-found', {});

      expect(result).toBeNull();
    });
  });

  describe('#updatePassword', () => {
    it('should update user password', async () => {
      User.findByPk = jest.fn().mockResolvedValue(mockUser);
      mockUser.update.mockResolvedValue(mockUser);

      const result = await repository.updatePassword('user-123', 'new_hash');

      expect(mockUser.update).toHaveBeenCalledWith({ password_hash: 'new_hash' });
      expect(result).toBe(mockUser);
    });
  });

  describe('#updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      User.findByPk = jest.fn().mockResolvedValue(mockUser);
      mockUser.update.mockResolvedValue(mockUser);

      await repository.updateLastLogin('user-123');

      expect(mockUser.update).toHaveBeenCalledWith({ last_login_at: expect.any(Date) });
    });
  });

  describe('#softDelete', () => {
    it('should soft delete user by setting status to inactive', async () => {
      User.findByPk = jest.fn().mockResolvedValue(mockUser);
      mockUser.update.mockResolvedValue(mockUser);

      const result = await repository.softDelete('user-123');

      expect(mockUser.update).toHaveBeenCalledWith({ status: 'inactive' });
      expect(result).toBe(mockUser);
    });
  });

  describe('#setEmailVerified', () => {
    it('should set email as verified', async () => {
      User.findByPk = jest.fn().mockResolvedValue(mockUser);
      mockUser.update.mockResolvedValue(mockUser);

      await repository.setEmailVerified('user-123');

      expect(mockUser.update).toHaveBeenCalledWith({
        email_verified: true,
        email_verification_token: null,
      });
    });
  });

  describe('#setVerificationToken', () => {
    it('should set email verification token', async () => {
      User.findByPk = jest.fn().mockResolvedValue(mockUser);
      mockUser.update.mockResolvedValue(mockUser);

      await repository.setVerificationToken('user-123', 'token-abc');

      expect(mockUser.update).toHaveBeenCalledWith({ email_verification_token: 'token-abc' });
    });
  });

  describe('#setResetToken', () => {
    it('should set password reset token with expiry', async () => {
      User.findByPk = jest.fn().mockResolvedValue(mockUser);
      mockUser.update.mockResolvedValue(mockUser);

      const expiresAt = new Date();
      await repository.setResetToken('user-123', 'reset-token', expiresAt);

      expect(mockUser.update).toHaveBeenCalledWith({
        password_reset_token: 'reset-token',
        password_reset_expires_at: expiresAt,
      });
    });
  });

  describe('#clearResetToken', () => {
    it('should clear password reset token', async () => {
      User.findByPk = jest.fn().mockResolvedValue(mockUser);
      mockUser.update.mockResolvedValue(mockUser);

      await repository.clearResetToken('user-123');

      expect(mockUser.update).toHaveBeenCalledWith({
        password_reset_token: null,
        password_reset_expires_at: null,
      });
    });
  });

  describe('#findByResetToken', () => {
    it('should find user by reset token', async () => {
      User.findOne = jest.fn().mockResolvedValue(mockUser);

      const result = await repository.findByResetToken('reset-token');

      expect(User.findOne).toHaveBeenCalledWith({
        where: { password_reset_token: 'reset-token' },
      });
      expect(result).toBe(mockUser);
    });
  });

  describe('#findByVerificationToken', () => {
    it('should find user by verification token', async () => {
      User.findOne = jest.fn().mockResolvedValue(mockUser);

      const result = await repository.findByVerificationToken('verify-token');

      expect(User.findOne).toHaveBeenCalledWith({
        where: { email_verification_token: 'verify-token' },
      });
      expect(result).toBe(mockUser);
    });
  });
});
