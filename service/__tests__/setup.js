/**
 * Per-File Test Setup
 *
 * This runs BEFORE each test file.
 * Database initialization is handled by globalSetup.js
 *
 * This file only:
 * - Sets environment variables
 * - Mocks global logger
 */

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Set test encryption key (32 characters for AES-256)
process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';

// Mock global logger to prevent actual logging during tests
global.logger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};
