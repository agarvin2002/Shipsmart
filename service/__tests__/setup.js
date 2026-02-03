const { sequelize } = require('../models');

module.exports = async () => {
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

  console.log('Setting up test environment...');

  try {
    // Run migrations on test database (sync with force: true drops and recreates)
    await sequelize.sync({ force: true });
    console.log('Test database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize test database:', error);
    throw error;
  }
};
