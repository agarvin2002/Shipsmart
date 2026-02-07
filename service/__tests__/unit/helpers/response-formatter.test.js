/**
 * ResponseFormatter Unit Tests
 */

const { ResponseFormatter } = require('@shipsmart/http');

describe('ResponseFormatter', () => {
  describe('.formatValidationError', () => {
    it('should format Joi validation error', () => {
      const joiError = {
        isJoi: true,
        details: [
          {
            path: ['email'],
            message: '"email" is required',
            type: 'any.required',
          },
          {
            path: ['password', 'length'],
            message: '"password" must be at least 8 characters',
            type: 'string.min',
          },
        ],
      };

      const result = ResponseFormatter.formatValidationError(joiError, 'req-123');

      expect(result).toEqual({
        success: false,
        request_id: 'req-123',
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: [
            {
              field: 'email',
              message: 'email is required',
              type: 'any.required',
            },
            {
              field: 'password.length',
              message: 'password must be at least 8 characters',
              type: 'string.min',
            },
          ],
        },
      });
    });

    it('should format non-Joi validation error', () => {
      const error = {
        message: 'Invalid input data',
      };

      const result = ResponseFormatter.formatValidationError(error, 'req-456');

      expect(result).toEqual({
        success: false,
        request_id: 'req-456',
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
        },
      });
    });

    it('should handle error without message', () => {
      const error = {};

      const result = ResponseFormatter.formatValidationError(error, 'req-789');

      expect(result.error.message).toBe('Validation failed');
    });
  });

  describe('.formatError', () => {
    it('should format generic error', () => {
      const result = ResponseFormatter.formatError('Something went wrong', 'req-123');

      expect(result).toEqual({
        success: false,
        request_id: 'req-123',
        error: {
          code: 'BAD_REQUEST',
          message: 'Something went wrong',
        },
      });
    });

    it('should format NOT_FOUND error for 404 status', () => {
      const result = ResponseFormatter.formatError('Resource not found', 'req-456', 404);

      expect(result).toEqual({
        success: false,
        request_id: 'req-456',
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
        },
      });
    });

    it('should use BAD_REQUEST for non-404 status codes', () => {
      const result = ResponseFormatter.formatError('Unauthorized', 'req-789', 401);

      expect(result.error.code).toBe('BAD_REQUEST');
    });
  });

  describe('.formatSuccess', () => {
    it('should format success response with data', () => {
      const data = {
        user: { id: 'user-123', email: 'test@example.com' },
        token: 'jwt-token',
      };

      const result = ResponseFormatter.formatSuccess(data, 'req-123');

      expect(result).toEqual({
        success: true,
        request_id: 'req-123',
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
          token: 'jwt-token',
        },
      });
    });

    it('should handle null data', () => {
      const result = ResponseFormatter.formatSuccess(null, 'req-456');

      expect(result).toEqual({
        success: true,
        request_id: 'req-456',
        data: null,
      });
    });
  });
});
