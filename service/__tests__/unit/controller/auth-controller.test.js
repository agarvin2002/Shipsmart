/**
 * AuthController Unit Tests
 *
 * Tests authentication controller handling of HTTP requests/responses.
 */

// Mock uuid before anything else
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

// Mock dependencies
jest.mock('../../../services/auth-service');
jest.mock('../../../validators/auth-validator');
jest.mock('@shipsmart/http');
jest.mock('../../../presenters/auth-presenter');

const AuthController = require('../../../controller/auth-controller');
const AuthService = require('../../../services/auth-service');
const AuthValidator = require('../../../validators/auth-validator');
const { ResponseFormatter } = require('@shipsmart/http');
const AuthPresenter = require('../../../presenters/auth-presenter');
const { createMockRequest, createMockResponse } = require('../../utils/test-helpers');

describe('AuthController', () => {
  let mockAuthService;
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup AuthService mock
    mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      verifyEmail: jest.fn(),
    };
    AuthService.mockImplementation(() => mockAuthService);

    // Setup ResponseFormatter mock
    ResponseFormatter.formatSuccess = jest.fn((data, requestId) => ({
      success: true,
      request_id: requestId,
      data,
    }));
    ResponseFormatter.formatError = jest.fn((message, requestId, statusCode) => ({
      success: false,
      request_id: requestId,
      error: { message, code: statusCode },
    }));
    ResponseFormatter.formatValidationError = jest.fn((error, requestId) => ({
      success: false,
      request_id: requestId,
      error: { message: 'Validation failed', details: error },
    }));

    // Setup global logger
    global.logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    // Create mock request and response
    req = createMockRequest();
    res = createMockResponse();
    next = jest.fn();
  });

  afterEach(() => {
    delete global.logger;
  });

  describe('.register', () => {
    it('should register user successfully with valid data', async () => {
      const mockValidator = {
        validate: jest.fn(),
        isValid: true,
        value: {
          email: 'test@example.com',
          password: 'SecurePassword123',
          first_name: 'John',
          last_name: 'Doe',
        },
      };
      AuthValidator.mockImplementation(() => mockValidator);

      const mockResult = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
      };
      mockAuthService.register.mockResolvedValue(mockResult);

      const mockPresentation = { user: mockResult, message: 'Registration successful' };
      AuthPresenter.presentRegisterResponse = jest.fn().mockReturnValue(mockPresentation);

      req.body = mockValidator.value;

      await AuthController.register(req, res, next);

      expect(AuthValidator).toHaveBeenCalledWith('register');
      expect(mockValidator.validate).toHaveBeenCalledWith(req.body);
      expect(mockAuthService.register).toHaveBeenCalledWith(mockValidator.value);
      expect(AuthPresenter.presentRegisterResponse).toHaveBeenCalledWith(mockResult);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith(
        ResponseFormatter.formatSuccess(mockPresentation, req.id)
      );
    });

    it('should return 400 when validation fails', async () => {
      const mockValidator = {
        validate: jest.fn(),
        isValid: false,
        error: { message: 'Email is required' },
      };
      AuthValidator.mockImplementation(() => mockValidator);

      req.body = { password: 'test' };

      await AuthController.register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        ResponseFormatter.formatValidationError(mockValidator.error, req.id)
      );
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it('should return 400 when service returns error', async () => {
      const mockValidator = {
        validate: jest.fn(),
        isValid: true,
        value: { email: 'test@example.com', password: 'test' },
      };
      AuthValidator.mockImplementation(() => mockValidator);

      mockAuthService.register.mockResolvedValue({
        error: 'Email already exists',
      });

      req.body = mockValidator.value;

      await AuthController.register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        ResponseFormatter.formatError('Email already exists', req.id, 400)
      );
    });

    it('should handle exceptions and call next', async () => {
      const mockValidator = {
        validate: jest.fn(),
        isValid: true,
        value: { email: 'test@example.com' },
      };
      AuthValidator.mockImplementation(() => mockValidator);

      const serviceError = new Error('Database error');
      mockAuthService.register.mockRejectedValue(serviceError);

      req.body = mockValidator.value;

      await AuthController.register(req, res, next);

      expect(next).toHaveBeenCalledWith(serviceError);
      expect(global.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Exception in register'),
        expect.any(Object)
      );
    });
  });

  describe('.login', () => {
    it('should login user successfully with valid credentials', async () => {
      const mockValidator = {
        validate: jest.fn(),
        isValid: true,
        value: {
          email: 'test@example.com',
          password: 'SecurePassword123',
        },
      };
      AuthValidator.mockImplementation(() => mockValidator);

      const mockResult = {
        user: { id: 'user-123', email: 'test@example.com' },
        token: 'jwt-token-abc',
      };
      mockAuthService.login.mockResolvedValue(mockResult);

      const mockPresentation = { ...mockResult, message: 'Login successful' };
      AuthPresenter.presentLoginResponse = jest.fn().mockReturnValue(mockPresentation);

      req.body = mockValidator.value;
      req.ip = '192.168.1.1';
      req.headers['user-agent'] = 'Mozilla/5.0';

      await AuthController.login(req, res, next);

      expect(mockAuthService.login).toHaveBeenCalledWith(
        'test@example.com',
        'SecurePassword123',
        '192.168.1.1',
        'Mozilla/5.0'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        ResponseFormatter.formatSuccess(mockPresentation, req.id)
      );
    });

    it('should return 400 when validation fails', async () => {
      const mockValidator = {
        validate: jest.fn(),
        isValid: false,
        error: { message: 'Email and password are required' },
      };
      AuthValidator.mockImplementation(() => mockValidator);

      req.body = {};

      await AuthController.login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should return 401 when service returns error', async () => {
      const mockValidator = {
        validate: jest.fn(),
        isValid: true,
        value: { email: 'test@example.com', password: 'wrong' },
      };
      AuthValidator.mockImplementation(() => mockValidator);

      mockAuthService.login.mockResolvedValue({
        error: 'Invalid credentials',
      });

      req.body = mockValidator.value;

      await AuthController.login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith(
        ResponseFormatter.formatError('Invalid credentials', req.id, 401)
      );
    });
  });

  describe('.logout', () => {
    it('should logout user successfully', async () => {
      req.user = { userId: 'user-123', jti: 'jwt-id-123' };
      mockAuthService.logout.mockResolvedValue({ message: 'Logged out' });

      const mockPresentation = { message: 'Logout successful' };
      AuthPresenter.presentLogoutResponse = jest.fn().mockReturnValue(mockPresentation);

      await AuthController.logout(req, res, next);

      expect(mockAuthService.logout).toHaveBeenCalledWith('jwt-id-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        ResponseFormatter.formatSuccess(mockPresentation, req.id)
      );
    });

    it('should return 401 when no JWT found', async () => {
      req.user = null;

      await AuthController.logout(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith(
        ResponseFormatter.formatError('Unauthorized', req.id, 401)
      );
      expect(mockAuthService.logout).not.toHaveBeenCalled();
    });

    it('should handle exceptions', async () => {
      req.user = { jti: 'jwt-id-123' };
      const serviceError = new Error('Logout failed');
      mockAuthService.logout.mockRejectedValue(serviceError);

      await AuthController.logout(req, res, next);

      expect(next).toHaveBeenCalledWith(serviceError);
    });
  });

  describe('.forgotPassword', () => {
    it('should process forgot password request successfully', async () => {
      const mockValidator = {
        validate: jest.fn(),
        isValid: true,
        value: { email: 'test@example.com' },
      };
      AuthValidator.mockImplementation(() => mockValidator);

      mockAuthService.forgotPassword.mockResolvedValue({ message: 'Email sent' });

      const mockPresentation = { message: 'Password reset email sent' };
      AuthPresenter.presentPasswordResetRequest = jest.fn().mockReturnValue(mockPresentation);

      req.body = mockValidator.value;

      await AuthController.forgotPassword(req, res, next);

      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith('test@example.com');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        ResponseFormatter.formatSuccess(mockPresentation, req.id)
      );
    });

    it('should return 400 when validation fails', async () => {
      const mockValidator = {
        validate: jest.fn(),
        isValid: false,
        error: { message: 'Email is required' },
      };
      AuthValidator.mockImplementation(() => mockValidator);

      req.body = {};

      await AuthController.forgotPassword(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockAuthService.forgotPassword).not.toHaveBeenCalled();
    });
  });

  describe('.resetPassword', () => {
    it('should reset password successfully with valid token', async () => {
      const mockValidator = {
        validate: jest.fn(),
        isValid: true,
        value: { token: 'reset-token-123', new_password: 'NewPassword123' },
      };
      AuthValidator.mockImplementation(() => mockValidator);

      mockAuthService.resetPassword.mockResolvedValue({ message: 'Password reset' });

      const mockPresentation = { message: 'Password reset successful' };
      AuthPresenter.presentPasswordResetSuccess = jest.fn().mockReturnValue(mockPresentation);

      req.body = mockValidator.value;

      await AuthController.resetPassword(req, res, next);

      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
        'reset-token-123',
        'NewPassword123'
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when validation fails', async () => {
      const mockValidator = {
        validate: jest.fn(),
        isValid: false,
        error: { message: 'Token and new password are required' },
      };
      AuthValidator.mockImplementation(() => mockValidator);

      req.body = {};

      await AuthController.resetPassword(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockAuthService.resetPassword).not.toHaveBeenCalled();
    });

    it('should return 400 when service returns error', async () => {
      const mockValidator = {
        validate: jest.fn(),
        isValid: true,
        value: { token: 'invalid-token', new_password: 'test' },
      };
      AuthValidator.mockImplementation(() => mockValidator);

      mockAuthService.resetPassword.mockResolvedValue({
        error: 'Invalid or expired token',
      });

      req.body = mockValidator.value;

      await AuthController.resetPassword(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        ResponseFormatter.formatError('Invalid or expired token', req.id, 400)
      );
    });
  });

  describe('.verifyEmail', () => {
    it('should verify email successfully with valid token', async () => {
      req.params = { token: 'verify-token-123' };
      mockAuthService.verifyEmail.mockResolvedValue({ message: 'Email verified' });

      const mockPresentation = { message: 'Email verified successfully' };
      AuthPresenter.presentEmailVerificationSuccess = jest.fn().mockReturnValue(mockPresentation);

      await AuthController.verifyEmail(req, res, next);

      expect(mockAuthService.verifyEmail).toHaveBeenCalledWith('verify-token-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        ResponseFormatter.formatSuccess(mockPresentation, req.id)
      );
    });

    it('should return 400 when no token provided', async () => {
      req.params = {};

      await AuthController.verifyEmail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        ResponseFormatter.formatError('Token is required', req.id, 400)
      );
      expect(mockAuthService.verifyEmail).not.toHaveBeenCalled();
    });

    it('should return 400 when service returns error', async () => {
      req.params = { token: 'invalid-token' };
      mockAuthService.verifyEmail.mockResolvedValue({
        error: 'Invalid or expired token',
      });

      await AuthController.verifyEmail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        ResponseFormatter.formatError('Invalid or expired token', req.id, 400)
      );
    });
  });
});
