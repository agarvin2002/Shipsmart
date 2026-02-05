/**
 * AuthPresenter Unit Tests
 *
 * Tests authentication presenter for formatting auth responses.
 */

// Mock UserPresenter
jest.mock('../../../presenters/user-presenter');

const AuthPresenter = require('../../../presenters/auth-presenter');
const UserPresenter = require('../../../presenters/user-presenter');

describe('AuthPresenter', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock UserPresenter.present
    UserPresenter.present = jest.fn((user) => ({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
    }));
  });

  describe('.presentLoginResponse', () => {
    it('should format login response with token and user', () => {
      const data = {
        access_token: 'jwt-token-abc123',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
        },
      };

      const result = AuthPresenter.presentLoginResponse(data);

      expect(result).toEqual({
        access_token: 'jwt-token-abc123',
        token_type: 'Bearer',
        expires_in: 86400,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
        },
      });
      expect(UserPresenter.present).toHaveBeenCalledWith(data.user);
    });
  });

  describe('.presentRegisterResponse', () => {
    it('should format registration response with user and message', () => {
      const user = {
        id: 'user-456',
        email: 'newuser@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
      };

      const result = AuthPresenter.presentRegisterResponse(user);

      expect(result).toEqual({
        user: {
          id: 'user-456',
          email: 'newuser@example.com',
          first_name: 'Jane',
          last_name: 'Smith',
        },
        message: 'Registration successful. Please verify your email.',
      });
      expect(UserPresenter.present).toHaveBeenCalledWith(user);
    });
  });

  describe('.presentLogoutResponse', () => {
    it('should return logout success message', () => {
      const result = AuthPresenter.presentLogoutResponse();

      expect(result).toEqual({
        message: 'Logged out successfully',
      });
    });
  });

  describe('.presentPasswordResetRequest', () => {
    it('should return generic password reset message for security', () => {
      const result = AuthPresenter.presentPasswordResetRequest();

      expect(result).toEqual({
        message: 'If the email exists, a password reset link has been sent.',
      });
    });
  });

  describe('.presentPasswordResetSuccess', () => {
    it('should return password reset success message', () => {
      const result = AuthPresenter.presentPasswordResetSuccess();

      expect(result).toEqual({
        message: 'Password reset successfully. Please login with your new password.',
      });
    });
  });

  describe('.presentEmailVerificationSuccess', () => {
    it('should return email verification success message', () => {
      const result = AuthPresenter.presentEmailVerificationSuccess();

      expect(result).toEqual({
        message: 'Email verified successfully. You can now login.',
      });
    });
  });
});
