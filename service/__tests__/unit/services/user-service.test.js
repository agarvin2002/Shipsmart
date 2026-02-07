/**
 * UserService Unit Tests
 *
 * Tests user management business logic including caching.
 */

// Mock uuid before anything else
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

// Mock dependencies
jest.mock('bcrypt');
jest.mock('../../../repositories/user-repository');
jest.mock('@shipsmart/redis');

const UserService = require('../../../services/user-service');
const bcrypt = require('bcrypt');
const UserRepository = require('../../../repositories/user-repository');
const { RedisWrapper, RedisKeys } = require('@shipsmart/redis');
const { NotFoundError, AuthenticationError } = require('@shipsmart/errors');
const { createMockUser } = require('../../utils/test-helpers');

describe('UserService', () => {
  let userService;
  let mockUserRepository;
  let mockUser;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup UserRepository mock
    mockUserRepository = {
      findById: jest.fn(),
      findWithAddresses: jest.fn(),
      update: jest.fn(),
      updatePassword: jest.fn(),
      softDelete: jest.fn(),
    };
    UserRepository.mockImplementation(() => mockUserRepository);

    // Setup RedisWrapper mock
    RedisWrapper.getRedisKey = jest.fn((key, params) => `user:${params.userId}`);
    RedisWrapper.get = jest.fn();
    RedisWrapper.setWithExpiry = jest.fn();
    RedisWrapper.del = jest.fn();

    // Setup global logger
    global.logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    // Create mock user
    mockUser = createMockUser({
      id: 'user-123',
      email: 'test@example.com',
      password_hash: 'hashed_password',
      password_reset_token: 'reset_token',
      email_verification_token: 'verify_token',
    });

    mockUser.toJSON = jest.fn(() => ({ ...mockUser }));

    userService = new UserService();
  });

  afterEach(() => {
    delete global.logger;
  });

  describe('#getUserById', () => {
    it('should return cached user when cache hit', async () => {
      const cachedUser = {
        id: 'user-123',
        email: 'test@example.com',
        _cache: {
          from_cache: false,
          cached_at: '2024-02-05T12:00:00.000Z',
        },
      };

      RedisWrapper.get.mockResolvedValue(JSON.stringify(cachedUser));

      const result = await userService.getUserById('user-123');

      expect(RedisWrapper.get).toHaveBeenCalledWith('user:user-123');
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
      expect(result._cache.from_cache).toBe(true);
      expect(global.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('cache_hit')
      );
    });

    it('should fetch from database and cache when cache miss', async () => {
      RedisWrapper.get.mockResolvedValue(null);
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.getUserById('user-123');

      expect(RedisWrapper.get).toHaveBeenCalledWith('user:user-123');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-123');
      expect(RedisWrapper.setWithExpiry).toHaveBeenCalledWith(
        'user:user-123',
        expect.any(String),
        300
      );
      expect(result._cache.from_cache).toBe(false);
      expect(result._cache.cached_at).toBeDefined();
      expect(global.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('cache_miss')
      );
    });

    it('should remove sensitive fields from response', async () => {
      RedisWrapper.get.mockResolvedValue(null);
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.getUserById('user-123');

      expect(result.password_hash).toBeUndefined();
      expect(result.password_reset_token).toBeUndefined();
      expect(result.email_verification_token).toBeUndefined();
      expect(result.email).toBe('test@example.com');
    });

    it('should handle user not found', async () => {
      RedisWrapper.get.mockResolvedValue(null);
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.getUserById('user-not-found')).rejects.toThrow(NotFoundError);
      expect(RedisWrapper.setWithExpiry).not.toHaveBeenCalled();
    });

    it('should handle errors and throw', async () => {
      const dbError = new Error('Database connection failed');
      RedisWrapper.get.mockResolvedValue(null);
      mockUserRepository.findById.mockRejectedValue(dbError);

      await expect(userService.getUserById('user-123')).rejects.toThrow(
        'Database connection failed'
      );

      expect(global.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching user by id')
      );
    });
  });

  describe('#updateUser', () => {
    it('should update user and invalidate cache', async () => {
      const updatedData = { first_name: 'Jane' };
      mockUserRepository.update.mockResolvedValue(mockUser);

      const result = await userService.updateUser('user-123', updatedData);

      expect(mockUserRepository.update).toHaveBeenCalledWith('user-123', updatedData);
      expect(RedisWrapper.del).toHaveBeenCalledWith('user:user-123');
      expect(result.password_hash).toBeUndefined();
      expect(result.email).toBe('test@example.com');
    });

    it('should handle user not found', async () => {
      mockUserRepository.update.mockResolvedValue(null);

      await expect(userService.updateUser('user-not-found', {})).rejects.toThrow(NotFoundError);
      expect(RedisWrapper.del).not.toHaveBeenCalled();
    });

    it('should handle errors and throw', async () => {
      const dbError = new Error('Update failed');
      mockUserRepository.update.mockRejectedValue(dbError);

      await expect(userService.updateUser('user-123', {})).rejects.toThrow(
        'Update failed'
      );

      expect(global.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error updating user')
      );
    });
  });

  describe('#changePassword', () => {
    it('should change password when current password is correct', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('new_hashed_password');

      const result = await userService.changePassword(
        'user-123',
        'current_password',
        'new_password'
      );

      expect(bcrypt.compare).toHaveBeenCalledWith('current_password', 'hashed_password');
      expect(bcrypt.hash).toHaveBeenCalledWith('new_password', 10);
      expect(mockUserRepository.updatePassword).toHaveBeenCalledWith(
        'user-123',
        'new_hashed_password'
      );
      expect(result).toEqual({ message: 'Password changed successfully' });
    });

    it('should reject when current password is incorrect', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        userService.changePassword('user-123', 'wrong_password', 'new_password')
      ).rejects.toThrow(AuthenticationError);

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockUserRepository.updatePassword).not.toHaveBeenCalled();
    });

    it('should handle user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        userService.changePassword('user-not-found', 'current', 'new')
      ).rejects.toThrow(NotFoundError);

      expect(bcrypt.compare).not.toHaveBeenCalled();
    });
  });

  describe('#deleteUser', () => {
    it('should soft delete user and invalidate cache', async () => {
      mockUserRepository.softDelete.mockResolvedValue(true);

      const result = await userService.deleteUser('user-123');

      expect(mockUserRepository.softDelete).toHaveBeenCalledWith('user-123');
      expect(RedisWrapper.del).toHaveBeenCalledWith('user:user-123');
      expect(result).toEqual({ message: 'Account deleted successfully' });
    });

    it('should handle user not found', async () => {
      mockUserRepository.softDelete.mockResolvedValue(null);

      await expect(userService.deleteUser('user-not-found')).rejects.toThrow(NotFoundError);
      expect(RedisWrapper.del).not.toHaveBeenCalled();
    });
  });

  describe('#getUserWithAddresses', () => {
    it('should return user with addresses', async () => {
      const userWithAddresses = {
        ...mockUser,
        addresses: [
          { id: 'addr-1', postal_code: '10001' },
          { id: 'addr-2', postal_code: '90210' },
        ],
      };
      userWithAddresses.toJSON = jest.fn(() => ({ ...userWithAddresses }));

      mockUserRepository.findWithAddresses.mockResolvedValue(userWithAddresses);

      const result = await userService.getUserWithAddresses('user-123');

      expect(mockUserRepository.findWithAddresses).toHaveBeenCalledWith('user-123');
      expect(result.password_hash).toBeUndefined();
      expect(result.addresses).toHaveLength(2);
      expect(result.addresses[0].postal_code).toBe('10001');
    });

    it('should handle user not found', async () => {
      mockUserRepository.findWithAddresses.mockResolvedValue(null);

      await expect(
        userService.getUserWithAddresses('user-not-found')
      ).rejects.toThrow(NotFoundError);
    });
  });
});
