/**
 * Logger Mock for Testing
 * Provides mock logger functions that can be spied on in tests
 */

// Create mock logger functions
const loggerMock = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

// Set as global logger for use in application code
global.logger = loggerMock;

module.exports = loggerMock;
