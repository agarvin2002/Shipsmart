/**
 * Global Test Setup
 *
 * This file runs ONCE before all test suites.
 * It initializes the test database by running sequelize.sync().
 *
 * Why Global Setup?
 * - Running sync({ force: true }) in parallel test files causes race conditions
 * - Tables get dropped/created simultaneously = errors
 * - Global setup ensures database is ready before ANY test runs
 */

module.exports = async () => {
  // Set environment before loading any modules
  process.env.NODE_ENV = 'test';
  process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';

  // Mock global logger BEFORE loading any modules that depend on it
  global.logger = {
    info: () => {},
    error: () => {},
    warn: () => {},
    debug: () => {}
  };

  console.log('\n🔧 Global Test Setup: Initializing test database...\n');

  // Now load sequelize (after env is set and logger is mocked)
  const { sequelize } = require('../models');

  try {
    // Authenticate connection
    await sequelize.authenticate();
    console.log('✓ Database connection established');

    // Sync all models (creates tables if they don't exist)
    // force: true drops existing tables first
    await sequelize.sync({ force: true });
    console.log('✓ Database schema synchronized');

    // Close connection (tests will open their own)
    await sequelize.close();
    console.log('✓ Setup connection closed\n');
  } catch (error) {
    console.error('✗ Global setup failed:', error.message);
    throw error;
  }
};
