/**
 * AuthService Unit Tests
 * Tests business logic with mocked dependencies
 */

// Mock uuid before any imports (to avoid ES module issues)
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-123')
}));

const AuthService = require('../../../services/auth-service');
const UserRepository = require('../../../repositories/user-repository');
const SessionRepository = require('../../../repositories/session-repository');
const JwtHelper = require('../../../helpers/jwt-helper');
const bcrypt = require('bcrypt');

// Mock all dependencies
jest.mock('../../../repositories/user-repository');
jest.mock('../../../repositories/session-repository');
jest.mock('../../../helpers/jwt-helper');
jest.mock('bcrypt');

describe('AuthService Unit Tests', () => {
  let authService;
  let mockUserRepo;
  let mockSessionRepo;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create service instance
    authService = new AuthService();

    // Get mock instances
    mockUserRepo = authService.userRepository;
    mockSessionRepo = authService.sessionRepository;
  });

  describe('#register', () => {
    it('should successfully register a new user', async () => {
      // Arrange
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe',
        company_name: 'Acme Corp',
        phone: '+1-234-567-8900'
      };

      const hashedPassword = 'hashed_password_123';
      const createdUser = {
        id: 1,
        email: 'newuser@example.com',
        first_name: 'John',
        last_name: 'Doe',
        company_name: 'Acme Corp',
        phone: '+1-234-567-8900',
        password_hash: hashedPassword,
        status: 'active',
        toJSON: function() {
          return { ...this };
        }
      };

      // Mock implementations
      mockUserRepo.findByEmail.mockResolvedValue(null); // No existing user
      bcrypt.hash.mockResolvedValue(hashedPassword);
      mockUserRepo.create.mockResolvedValue(createdUser);

      // Act
      const result = await authService.register(userData);

      // Assert
      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
      expect(mockUserRepo.create).toHaveBeenCalledWith({
        email: userData.email,
        password_hash: hashedPassword,
        first_name: userData.first_name,
        last_name: userData.last_name,
        company_name: userData.company_name,
        phone: userData.phone
      });

      // Verify password_hash is not returned
      expect(result.password_hash).toBeUndefined();
      expect(result.email).toBe(userData.email);
      expect(result.first_name).toBe(userData.first_name);
    });

    it('should return error when email already exists', async () => {
      // Arrange
      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe'
      };

      const existingUser = {
        id: 1,
        email: 'existing@example.com'
      };

      mockUserRepo.findByEmail.mockResolvedValue(existingUser);

      // Act
      const result = await authService.register(userData);

      // Assert
      expect(result.error).toBe('Email already registered');
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockUserRepo.create).not.toHaveBeenCalled();
    });

    it('should throw error when repository fails', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        first_name: 'Test',
        last_name: 'User'
      };

      mockUserRepo.findByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashed');
      mockUserRepo.create.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(authService.register(userData)).rejects.toThrow('Database error');
    });
  });

  describe('#login', () => {
    it('should successfully login with valid credentials', async () => {
      // Arrange
      const email = 'user@example.com';
      const password = 'password123';
      const ipAddress = '192.168.1.1';
      const deviceInfo = 'Mozilla/5.0';

      const user = {
        id: 1,
        email: 'user@example.com',
        password_hash: 'hashed_password',
        status: 'active',
        first_name: 'John',
        last_name: 'Doe',
        toJSON: function() {
          const { password_hash, ...userWithoutPassword } = this;
          return userWithoutPassword;
        }
      };

      const tokenData = {
        token: 'jwt_token_abc123',
        jti: 'unique_jti_123'
      };

      // Mock implementations
      mockUserRepo.findByEmail.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true);
      JwtHelper.generateAccessToken.mockReturnValue(tokenData);
      mockSessionRepo.create.mockResolvedValue({ id: 1 });
      mockUserRepo.updateLastLogin.mockResolvedValue();

      // Act
      const result = await authService.login(email, password, ipAddress, deviceInfo);

      // Assert
      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith(email);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, user.password_hash);
      expect(JwtHelper.generateAccessToken).toHaveBeenCalledWith(user);
      expect(mockSessionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: user.id,
          token_jti: tokenData.jti,
          device_info: deviceInfo,
          ip_address: ipAddress
        })
      );
      expect(mockUserRepo.updateLastLogin).toHaveBeenCalledWith(user.id);

      expect(result.access_token).toBe(tokenData.token);
      expect(result.user).toBeDefined();
      expect(result.user.password_hash).toBeUndefined();
    });

    it('should return error when user not found', async () => {
      // Arrange
      const email = 'nonexistent@example.com';
      const password = 'password123';

      mockUserRepo.findByEmail.mockResolvedValue(null);

      // Act
      const result = await authService.login(email, password, '127.0.0.1', 'Device');

      // Assert
      expect(result.error).toBe('Invalid credentials');
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(JwtHelper.generateAccessToken).not.toHaveBeenCalled();
    });

    it('should return error when account is inactive', async () => {
      // Arrange
      const email = 'inactive@example.com';
      const password = 'password123';

      const user = {
        id: 1,
        email: 'inactive@example.com',
        password_hash: 'hashed',
        status: 'inactive'
      };

      mockUserRepo.findByEmail.mockResolvedValue(user);

      // Act
      const result = await authService.login(email, password, '127.0.0.1', 'Device');

      // Assert
      expect(result.error).toBe('Account is inactive or suspended');
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return error when password is invalid', async () => {
      // Arrange
      const email = 'user@example.com';
      const password = 'wrong_password';

      const user = {
        id: 1,
        email: 'user@example.com',
        password_hash: 'hashed_password',
        status: 'active'
      };

      mockUserRepo.findByEmail.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(false);

      // Act
      const result = await authService.login(email, password, '127.0.0.1', 'Device');

      // Assert
      expect(result.error).toBe('Invalid credentials');
      expect(JwtHelper.generateAccessToken).not.toHaveBeenCalled();
      expect(mockSessionRepo.create).not.toHaveBeenCalled();
    });

    it('should return error when account is suspended', async () => {
      // Arrange
      const user = {
        id: 1,
        email: 'suspended@example.com',
        password_hash: 'hashed',
        status: 'suspended'
      };

      mockUserRepo.findByEmail.mockResolvedValue(user);

      // Act
      const result = await authService.login('suspended@example.com', 'password', '127.0.0.1', 'Device');

      // Assert
      expect(result.error).toBe('Account is inactive or suspended');
    });
  });

  describe('#logout', () => {
    it('should successfully logout user', async () => {
      // Arrange
      const jti = 'token_jti_123';

      mockSessionRepo.revoke.mockResolvedValue({ id: 1 });

      // Act
      const result = await authService.logout(jti);

      // Assert
      expect(mockSessionRepo.revoke).toHaveBeenCalledWith(jti);
      expect(result.message).toBe('Logged out successfully');
    });

    it('should throw error when session revocation fails', async () => {
      // Arrange
      const jti = 'token_jti_123';

      mockSessionRepo.revoke.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(authService.logout(jti)).rejects.toThrow('Database error');
    });
  });

  describe('#forgotPassword', () => {
    it('should generate reset token for existing user', async () => {
      // Arrange
      const email = 'user@example.com';
      const user = {
        id: 1,
        email: 'user@example.com'
      };

      mockUserRepo.findByEmail.mockResolvedValue(user);
      mockUserRepo.setResetToken.mockResolvedValue();

      // Act
      const result = await authService.forgotPassword(email);

      // Assert
      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith(email);
      expect(mockUserRepo.setResetToken).toHaveBeenCalledWith(
        user.id,
        expect.any(String), // Token (random hex)
        expect.any(Date)     // Expires at (1 hour from now)
      );
      expect(result.message).toBe('If email exists, password reset link has been sent');
    });

    it('should return generic message for non-existent user (security)', async () => {
      // Arrange
      const email = 'nonexistent@example.com';

      mockUserRepo.findByEmail.mockResolvedValue(null);

      // Act
      const result = await authService.forgotPassword(email);

      // Assert
      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith(email);
      expect(mockUserRepo.setResetToken).not.toHaveBeenCalled();
      // Should return same message to prevent email enumeration
      expect(result.message).toBe('If email exists, password reset link has been sent');
    });

    it('should set token expiration to 1 hour from now', async () => {
      // Arrange
      const email = 'user@example.com';
      const user = { id: 1, email };
      const now = new Date();

      mockUserRepo.findByEmail.mockResolvedValue(user);
      mockUserRepo.setResetToken.mockResolvedValue();

      // Act
      await authService.forgotPassword(email);

      // Assert
      expect(mockUserRepo.setResetToken).toHaveBeenCalled();
      const callArgs = mockUserRepo.setResetToken.mock.calls[0];
      const expiresAt = callArgs[2];

      // Should expire approximately 1 hour from now (within 5 seconds tolerance)
      const expectedExpiry = new Date(now.getTime() + 60 * 60 * 1000);
      const diff = Math.abs(expiresAt.getTime() - expectedExpiry.getTime());
      expect(diff).toBeLessThan(5000); // Within 5 seconds
    });
  });

  describe('#resetPassword', () => {
    it('should successfully reset password with valid token', async () => {
      // Arrange
      const token = 'valid_reset_token';
      const newPassword = 'new_password_123';
      const newPasswordHash = 'new_hashed_password';

      const user = {
        id: 1,
        email: 'user@example.com',
        password_reset_token: token,
        password_reset_expires_at: new Date(Date.now() + 3600000) // 1 hour from now
      };

      mockUserRepo.findByResetToken.mockResolvedValue(user);
      bcrypt.hash.mockResolvedValue(newPasswordHash);
      mockUserRepo.updatePassword.mockResolvedValue();
      mockUserRepo.clearResetToken.mockResolvedValue();

      // Act
      const result = await authService.resetPassword(token, newPassword);

      // Assert
      expect(mockUserRepo.findByResetToken).toHaveBeenCalledWith(token);
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(mockUserRepo.updatePassword).toHaveBeenCalledWith(user.id, newPasswordHash);
      expect(mockUserRepo.clearResetToken).toHaveBeenCalledWith(user.id);
      expect(result.message).toBe('Password reset successfully');
    });

    it('should return error when token is invalid', async () => {
      // Arrange
      const token = 'invalid_token';
      const newPassword = 'new_password';

      mockUserRepo.findByResetToken.mockResolvedValue(null);

      // Act
      const result = await authService.resetPassword(token, newPassword);

      // Assert
      expect(result.error).toBe('Invalid or expired reset token');
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockUserRepo.updatePassword).not.toHaveBeenCalled();
    });

    it('should return error when token is expired', async () => {
      // Arrange
      const token = 'expired_token';
      const newPassword = 'new_password';

      const user = {
        id: 1,
        email: 'user@example.com',
        password_reset_token: token,
        password_reset_expires_at: new Date(Date.now() - 3600000) // 1 hour ago (expired)
      };

      mockUserRepo.findByResetToken.mockResolvedValue(user);

      // Act
      const result = await authService.resetPassword(token, newPassword);

      // Assert
      expect(result.error).toBe('Invalid or expired reset token');
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockUserRepo.updatePassword).not.toHaveBeenCalled();
    });

    it('should return error when user has no expiration date', async () => {
      // Arrange
      const token = 'token_no_expiry';
      const newPassword = 'new_password';

      const user = {
        id: 1,
        email: 'user@example.com',
        password_reset_token: token,
        password_reset_expires_at: null
      };

      mockUserRepo.findByResetToken.mockResolvedValue(user);

      // Act
      const result = await authService.resetPassword(token, newPassword);

      // Assert
      expect(result.error).toBe('Invalid or expired reset token');
    });
  });

  describe('#verifyEmail', () => {
    it('should successfully verify email with valid token', async () => {
      // Arrange
      const token = 'email_verification_token';
      const user = {
        id: 1,
        email: 'user@example.com',
        email_verification_token: token,
        email_verified: false
      };

      mockUserRepo.findByVerificationToken.mockResolvedValue(user);
      mockUserRepo.setEmailVerified.mockResolvedValue();

      // Act
      const result = await authService.verifyEmail(token);

      // Assert
      expect(mockUserRepo.findByVerificationToken).toHaveBeenCalledWith(token);
      expect(mockUserRepo.setEmailVerified).toHaveBeenCalledWith(user.id);
      expect(result.message).toBe('Email verified successfully');
    });

    it('should return error when token is invalid', async () => {
      // Arrange
      const token = 'invalid_token';

      mockUserRepo.findByVerificationToken.mockResolvedValue(null);

      // Act
      const result = await authService.verifyEmail(token);

      // Assert
      expect(result.error).toBe('Invalid verification token');
      expect(mockUserRepo.setEmailVerified).not.toHaveBeenCalled();
    });

    it('should throw error when verification fails', async () => {
      // Arrange
      const token = 'valid_token';
      const user = { id: 1 };

      mockUserRepo.findByVerificationToken.mockResolvedValue(user);
      mockUserRepo.setEmailVerified.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(authService.verifyEmail(token)).rejects.toThrow('Database error');
    });
  });
});
