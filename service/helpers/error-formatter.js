class ErrorFormatter {
  static formatValidationError(error, requestId) {
    if (error.isJoi) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, ''),
        type: detail.type,
      }));

      return {
        success: false,
        request_id: requestId,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors,
        },
      };
    }

    return {
      success: false,
      request_id: requestId,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message || 'Validation failed',
      },
    };
  }

  static formatError(message, requestId, statusCode = 400) {
    return {
      success: false,
      request_id: requestId,
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'BAD_REQUEST',
        message,
      },
    };
  }

  static formatSuccess(data, requestId) {
    return {
      success: true,
      request_id: requestId,
      data,
    };
  }
}

module.exports = ErrorFormatter;
