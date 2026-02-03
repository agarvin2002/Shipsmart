/**
 * UserRepository Integration Tests
 * FIXED VERSION - Respects database schema constraints
 */

const UserRepository = require('../../../repositories/user-repository');
const { User } = require('../../../models');
const { cleanDatabase, createTestUser } = require('../../utils/db-cleaner');
const bcrypt = require('bcrypt');

describe('UserRepository Integration Tests', () => {
  let userRepository;

  beforeAll(() => {
    userRepository = new UserRepository();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('#findByEmail', () => {
    it('should find user by email address', async () => {
      const testUser = await createTestUser({
        email: 'john.doe@example.com',
        first_name: 'John',
        last_name: 'Doe'
      });

      const foundUser = await userRepository.findByEmail('john.doe@example.com');

      expect(foundUser).toBeDefined();
      expect(foundUser.id).toBe(testUser.id);
      expect(foundUser.email).toBe('john.doe@example.com');
    });

    it('should return null for non-existent email', async () => {
      const foundUser = await userRepository.findByEmail('nonexistent@example.com');
      expect(foundUser).toBeNull();
    });
  });

  describe('#findById', () => {
    it('should find user by ID', async () => {
      const testUser = await createTestUser({ email: 'user@example.com' });
      const foundUser = await userRepository.findById(testUser.id);

      expect(foundUser).toBeDefined();
      expect(foundUser.id).toBe(testUser.id);
    });

    it('should return null for non-existent ID', async () => {
      const foundUser = await userRepository.findById(999999);
      expect(foundUser).toBeNull();
    });
  });

  describe('#create', () => {
    it('should create a new user with all fields', async () => {
      const userData = {
        email: 'newuser@example.com',
        password_hash: await bcrypt.hash('password123', 10),
        first_name: 'Jane',
        last_name: 'Smith',
        company_name: 'Acme Corp',
        phone: '+1-234-567-8900'
      };

      const createdUser = await userRepository.create(userData);

      expect(createdUser.id).toBeDefined();
      expect(createdUser.email).toBe('newuser@example.com');
      expect(createdUser.first_name).toBe('Jane');
      expect(createdUser.status).toBe('active');
    });

    it('should throw error for duplicate email', async () => {
      await createTestUser({ email: 'duplicate@example.com' });

      await expect(
        userRepository.create({
          email: 'duplicate@example.com',
          password_hash: await bcrypt.hash('password', 10),
          first_name: 'Test',
          last_name: 'User'
        })
      ).rejects.toThrow();
    });
  });

  describe('#update', () => {
    it('should update user fields', async () => {
      const user = await createTestUser({
        email: 'before@example.com',
        first_name: 'Before'
      });

      const updatedUser = await userRepository.update(user.id, {
        first_name: 'After',
        company_name: 'New Company'
      });

      expect(updatedUser.first_name).toBe('After');
      expect(updatedUser.company_name).toBe('New Company');
    });

    it('should return null when updating non-existent user', async () => {
      const result = await userRepository.update(999999, { first_name: 'Test' });
      expect(result).toBeNull();
    });
  });

  describe('#softDelete', () => {
    it('should set user status to inactive', async () => {
      const user = await createTestUser({ email: 'active@example.com' });
      await userRepository.softDelete(user.id);

      const foundUser = await User.findByPk(user.id);
      expect(foundUser.status).toBe('inactive');
    });
  });

  describe('#updatePassword', () => {
    it('should update user password hash', async () => {
      const oldPasswordHash = await bcrypt.hash('oldpassword', 10);
      const user = await createTestUser({ password_hash: oldPasswordHash });

      const newPasswordHash = await bcrypt.hash('newpassword', 10);
      await userRepository.updatePassword(user.id, newPasswordHash);

      const foundUser = await User.findByPk(user.id);
      expect(foundUser.password_hash).toBe(newPasswordHash);
    });
  });

  describe('email verification', () => {
    it('should set verification token', async () => {
      const user = await createTestUser({ email: 'verify@example.com' });
      await userRepository.setVerificationToken(user.id, 'token-123');

      const foundUser = await User.findByPk(user.id);
      expect(foundUser.email_verification_token).toBe('token-123');
    });

    it('should mark email as verified', async () => {
      const user = await createTestUser({ email_verified: false });
      await userRepository.setEmailVerified(user.id);

      const foundUser = await User.findByPk(user.id);
      expect(foundUser.email_verified).toBe(true);
    });

    it('should find user by verification token', async () => {
      const user = await User.create({
        email: 'token@example.com',
        password_hash: await bcrypt.hash('password', 10),
        first_name: 'Token',
        last_name: 'User',
        email_verification_token: 'unique-token-456'
      });

      const foundUser = await userRepository.findByVerificationToken('unique-token-456');
      expect(foundUser.id).toBe(user.id);
    });
  });

  describe('password reset', () => {
    it('should set reset token with expiration', async () => {
      const user = await createTestUser({ email: 'reset@example.com' });
      const expiresAt = new Date(Date.now() + 3600000);

      await userRepository.setResetToken(user.id, 'reset-token', expiresAt);

      const foundUser = await User.findByPk(user.id);
      expect(foundUser.password_reset_token).toBe('reset-token');
    });

    it('should find user by reset token', async () => {
      const user = await User.create({
        email: 'resettoken@example.com',
        password_hash: await bcrypt.hash('password', 10),
        first_name: 'Reset',
        last_name: 'Token',
        password_reset_token: 'reset-abc123',
        password_reset_expires_at: new Date(Date.now() + 3600000)
      });

      const foundUser = await userRepository.findByResetToken('reset-abc123');
      expect(foundUser.id).toBe(user.id);
    });

    it('should clear reset token after use', async () => {
      const user = await User.create({
        email: 'cleartoken@example.com',
        password_hash: await bcrypt.hash('password', 10),
        first_name: 'Clear',
        last_name: 'Token',
        password_reset_token: 'token-to-clear',
        password_reset_expires_at: new Date(Date.now() + 3600000)
      });

      await userRepository.clearResetToken(user.id);

      const foundUser = await User.findByPk(user.id);
      expect(foundUser.password_reset_token).toBeNull();
    });
  });
});
