/**
 * Global Test Teardown
 *
 * This file runs ONCE after all test suites complete.
 * It cleans up the database connection.
 */

module.exports = async () => {
  console.log('\n🧹 Global Test Teardown: Cleaning up...\n');

  // Ensure any lingering connections are closed
  try {
    const { sequelize } = require('../models');
    if (sequelize.connectionManager.pool) {
      await sequelize.close();
      console.log('✓ Database connections closed');
    }
  } catch (error) {
    // Connection might already be closed
    console.log('✓ Cleanup complete');
  }
};
