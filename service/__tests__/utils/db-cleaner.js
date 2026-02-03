const { sequelize } = require('../../models');
const bcrypt = require('bcrypt');

/**
 * Clean all data from test database
 * Truncates all tables in reverse order to respect foreign key constraints
 */
async function cleanDatabase() {
  // List of all tables in reverse dependency order
  const tables = [
    'rate_history',
    'rates',
    'shipments',
    'carrier_api_logs',
    'api_request_logs',
    'sessions',
    'carrier_credentials',
    'user_addresses',
    'checks',
    'users',
    'carrier_services',
    'carriers',
    'carrier_configurations'
  ];

  try {
    // Disable foreign key checks for PostgreSQL
    await sequelize.query('SET session_replication_role = replica;');

    // Truncate each table
    for (const table of tables) {
      try {
        await sequelize.query(`TRUNCATE TABLE "${table}" CASCADE;`);
      } catch (error) {
        // Table might not exist yet, continue
        if (!error.message.includes('does not exist')) {
          console.warn(`Warning: Failed to truncate table ${table}:`, error.message);
        }
      }
    }

    // Re-enable foreign key checks
    await sequelize.query('SET session_replication_role = origin;');
  } catch (error) {
    console.error('Error cleaning database:', error);
    throw error;
  }
}

/**
 * Create a test user with default or custom attributes
 * @param {Object} overrides - Custom user attributes
 * @returns {Promise<Object>} Created user instance
 */
async function createTestUser(overrides = {}) {
  const { User } = require('../../models');

  const defaultUser = {
    email: overrides.email || `test${Date.now()}${Math.random()}@example.com`,
    password_hash: await bcrypt.hash(overrides.password || 'password123', 10),
    first_name: overrides.first_name || 'Test',
    last_name: overrides.last_name || 'User',
    status: overrides.status || 'active',
    email_verified: overrides.email_verified !== undefined ? overrides.email_verified : true,
    company_name: overrides.company_name || null,
    phone: overrides.phone || null
  };

  return await User.create(defaultUser);
}

/**
 * Create a test carrier credential with encryption
 * @param {string} userId - User ID
 * @param {Object} overrides - Custom credential attributes
 * @returns {Promise<Object>} Created credential instance
 */
async function createTestCarrierCredential(userId, overrides = {}) {
  const { CarrierCredential } = require('../../models');
  const CryptoHelper = require('../../helpers/crypto-helper');

  const defaultCredential = {
    user_id: userId,
    carrier: overrides.carrier || 'fedex',
    client_id_encrypted: CryptoHelper.encrypt(overrides.client_id || 'test_client_id'),
    client_secret_encrypted: CryptoHelper.encrypt(overrides.client_secret || 'test_client_secret'),
    is_active: overrides.is_active !== undefined ? overrides.is_active : true,
    validation_status: overrides.validation_status || 'valid',
    account_numbers: overrides.account_numbers || null,
    selected_service_ids: overrides.selected_service_ids || null
  };

  return await CarrierCredential.create(defaultCredential);
}

/**
 * Create a test address for a user
 * @param {string} userId - User ID
 * @param {Object} overrides - Custom address attributes
 * @returns {Promise<Object>} Created address instance
 */
async function createTestAddress(userId, overrides = {}) {
  const { UserAddress } = require('../../models');

  const defaultAddress = {
    user_id: userId,
    address_type: overrides.address_type || 'source',
    postal_code: overrides.postal_code || '10001',
    city: overrides.city || 'New York',
    state_province: overrides.state_province || 'NY',
    country: overrides.country || 'US',
    street_address_1: overrides.street_address_1 || '123 Test St',
    street_address_2: overrides.street_address_2 || null,
    company_name: overrides.company_name || null,
    phone: overrides.phone || null,
    is_default: overrides.is_default !== undefined ? overrides.is_default : false,
    address_label: overrides.address_label || 'Test Address'
  };

  return await UserAddress.create(defaultAddress);
}

/**
 * Create a test rate
 * @param {string} userId - User ID
 * @param {Object} overrides - Custom rate attributes
 * @returns {Promise<Object>} Created rate instance
 */
async function createTestRate(userId, overrides = {}) {
  const { Rate } = require('../../models');

  const defaultRate = {
    user_id: userId,
    carrier: 'fedex',
    service_name: 'FedEx Ground',
    rate_amount: '15.50',
    currency: 'USD',
    delivery_days: 3,
    shipment_id: null,
    raw_response: null,
    ...overrides  // Merge all overrides to allow fetched_at and other fields
  };

  return await Rate.create(defaultRate);
}

/**
 * Create a test session for a user
 * @param {string} userId - User ID
 * @param {string} jti - JWT ID
 * @param {Object} overrides - Custom session attributes
 * @returns {Promise<Object>} Created session instance
 */
async function createTestSession(userId, jti, overrides = {}) {
  const { Session } = require('../../models');

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const defaultSession = {
    user_id: userId,
    token_jti: jti,
    device_info: overrides.device_info || 'Test Browser',
    ip_address: overrides.ip_address || '127.0.0.1',
    expires_at: overrides.expires_at || expiresAt,
    revoked_at: overrides.revoked_at || null
  };

  return await Session.create(defaultSession);
}

module.exports = {
  cleanDatabase,
  createTestUser,
  createTestCarrierCredential,
  createTestAddress,
  createTestRate,
  createTestSession
};
