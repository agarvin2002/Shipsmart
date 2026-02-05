/**
 * Test Helpers
 *
 * Factory functions for creating mock objects used in tests.
 * Based on pack-courier-frontline-service patterns adapted for Jest.
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Express Request/Response Mocking
 */

function createMockRequest(overrides = {}) {
  return {
    method: overrides.method || 'GET',
    url: overrides.url || '/',
    params: overrides.params || {},
    query: overrides.query || {},
    body: overrides.body || {},
    headers: overrides.headers || {},
    user: overrides.user || null,
    id: overrides.id || uuidv4(),
    ip: overrides.ip || '127.0.0.1',
    ...overrides,
  };
}

function createMockResponse() {
  const res = {
    status: jest.fn().returnsThis(),
    json: jest.fn().returnsThis(),
    send: jest.fn().returnsThis(),
    sendStatus: jest.fn().returnsThis(),
    set: jest.fn().returnsThis(),
    cookie: jest.fn().returnsThis(),
    clearCookie: jest.fn().returnsThis(),
  };
  return res;
}

function createMockNext() {
  return jest.fn();
}

/**
 * HTTP Client Stubs (for carrier proxies)
 */

function createAxiosStub(responses = {}) {
  const stub = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    request: jest.fn(),
    create: jest.fn(),
  };

  // Configure responses if provided
  if (responses.get) stub.get.mockResolvedValue(responses.get);
  if (responses.post) stub.post.mockResolvedValue(responses.post);
  if (responses.put) stub.put.mockResolvedValue(responses.put);
  if (responses.delete) stub.delete.mockResolvedValue(responses.delete);

  // Make create return the stub itself for chaining
  stub.create.mockReturnValue(stub);

  return stub;
}

function createAxiosError(status, message, data = null) {
  const error = new Error(message);
  error.response = {
    status,
    statusText: message,
    data: data || { error: message },
    headers: {},
  };
  error.isAxiosError = true;
  return error;
}

/**
 * Sequelize Model Stubs (adapted from Mongoose patterns)
 */

function createSequelizeModelStub(data = {}) {
  return {
    findOne: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findAndCountAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn(),
    bulkCreate: jest.fn(),

    // Query builder methods
    where: jest.fn().returnsThis(),
    include: jest.fn().returnsThis(),
    order: jest.fn().returnsThis(),
    limit: jest.fn().returnsThis(),
    offset: jest.fn().returnsThis(),
  };
}

function createSequelizeMockInstance(data = {}) {
  const instance = {
    ...data,
    dataValues: data,
    get: jest.fn((key) => (key ? data[key] : data)),
    set: jest.fn((key, value) => {
      data[key] = value;
    }),
    save: jest.fn().mockResolvedValue(instance),
    update: jest.fn((updates) => {
      Object.assign(data, updates);
      return Promise.resolve(instance);
    }),
    destroy: jest.fn().mockResolvedValue(instance),
    reload: jest.fn().mockResolvedValue(instance),
    toJSON: jest.fn(() => ({ ...data })),
  };
  return instance;
}

/**
 * Domain-Specific Stubs
 */

function createMockUser(overrides = {}) {
  return {
    id: overrides.id || uuidv4(),
    email: overrides.email || 'test@example.com',
    password_hash: overrides.password_hash || '$2b$10$hashedpassword',
    first_name: overrides.first_name || 'Test',
    last_name: overrides.last_name || 'User',
    company_name: overrides.company_name || null,
    phone: overrides.phone || null,
    status: overrides.status || 'active',
    email_verified: overrides.email_verified !== undefined ? overrides.email_verified : true,
    email_verification_token: overrides.email_verification_token || null,
    reset_password_token: overrides.reset_password_token || null,
    reset_password_expires: overrides.reset_password_expires || null,
    last_login_at: overrides.last_login_at || null,
    created_at: overrides.created_at || new Date(),
    updated_at: overrides.updated_at || new Date(),
    ...overrides,
  };
}

function createMockCarrierCredential(carrier = 'fedex', overrides = {}) {
  return {
    id: overrides.id || uuidv4(),
    user_id: overrides.user_id || uuidv4(),
    carrier: carrier,
    client_id_encrypted: overrides.client_id_encrypted || `encrypted_${carrier}_client_id`,
    client_secret_encrypted: overrides.client_secret_encrypted || `encrypted_${carrier}_client_secret`,
    account_numbers: overrides.account_numbers || null,
    is_active: overrides.is_active !== undefined ? overrides.is_active : true,
    validation_status: overrides.validation_status || 'valid',
    last_validated_at: overrides.last_validated_at || new Date(),
    selected_service_ids: overrides.selected_service_ids || null,
    created_at: overrides.created_at || new Date(),
    updated_at: overrides.updated_at || new Date(),
    ...overrides,
  };
}

function createMockAddress(type = 'origin', overrides = {}) {
  const defaults = type === 'origin' ? {
    postal_code: '10001',
    city: 'New York',
    state_province: 'NY',
    country: 'US',
  } : {
    postal_code: '90210',
    city: 'Beverly Hills',
    state_province: 'CA',
    country: 'US',
  };

  return {
    id: overrides.id || uuidv4(),
    user_id: overrides.user_id || uuidv4(),
    address_type: type,
    street_address_1: overrides.street_address_1 || '123 Main St',
    street_address_2: overrides.street_address_2 || null,
    company_name: overrides.company_name || null,
    phone: overrides.phone || null,
    is_default: overrides.is_default !== undefined ? overrides.is_default : false,
    address_label: overrides.address_label || `${type} Address`,
    created_at: overrides.created_at || new Date(),
    updated_at: overrides.updated_at || new Date(),
    ...defaults,
    ...overrides,
  };
}

function createMockPackage(overrides = {}) {
  return {
    weight: overrides.weight || 10,
    weight_units: overrides.weight_units || 'LB',
    length: overrides.length || 12,
    width: overrides.width || 8,
    height: overrides.height || 6,
    dimension_units: overrides.dimension_units || 'IN',
    package_type: overrides.package_type || 'YOUR_PACKAGING',
    declared_value: overrides.declared_value || null,
    description: overrides.description || null,
    ...overrides,
  };
}

function createMockRate(carrier = 'fedex', overrides = {}) {
  return {
    id: overrides.id || uuidv4(),
    user_id: overrides.user_id || uuidv4(),
    carrier: carrier,
    service_name: overrides.service_name || `${carrier.toUpperCase()} Ground`,
    service_type: overrides.service_type || 'GROUND',
    rate_amount: overrides.rate_amount || '15.50',
    currency: overrides.currency || 'USD',
    delivery_days: overrides.delivery_days || 3,
    delivery_date: overrides.delivery_date || null,
    shipment_id: overrides.shipment_id || null,
    raw_response: overrides.raw_response || null,
    fetched_at: overrides.fetched_at || new Date(),
    created_at: overrides.created_at || new Date(),
    ...overrides,
  };
}

function createMockSession(overrides = {}) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  return {
    id: overrides.id || uuidv4(),
    user_id: overrides.user_id || uuidv4(),
    token_jti: overrides.token_jti || uuidv4(),
    device_info: overrides.device_info || 'Test Browser',
    ip_address: overrides.ip_address || '127.0.0.1',
    expires_at: overrides.expires_at || expiresAt,
    revoked_at: overrides.revoked_at || null,
    created_at: overrides.created_at || new Date(),
    ...overrides,
  };
}

/**
 * Context Helpers
 */

function createTestContext(userId = null, overrides = {}) {
  return {
    currentUser: overrides.currentUser || (userId ? { id: userId } : null),
    requestId: overrides.requestId || uuidv4(),
    ...overrides,
  };
}

/**
 * Redis Mock
 */

function createRedisMock() {
  return {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    setex: jest.fn(),
    ttl: jest.fn(),
    exists: jest.fn(),
    keys: jest.fn(),
    flushall: jest.fn(),
  };
}

/**
 * Bull Queue Mock
 */

function createBullQueueMock() {
  return {
    add: jest.fn(),
    process: jest.fn(),
    getJob: jest.fn(),
    getJobs: jest.fn(),
    clean: jest.fn(),
    close: jest.fn(),
  };
}

module.exports = {
  // Express mocking
  createMockRequest,
  createMockResponse,
  createMockNext,

  // HTTP client mocking
  createAxiosStub,
  createAxiosError,

  // Sequelize mocking
  createSequelizeModelStub,
  createSequelizeMockInstance,

  // Domain stubs
  createMockUser,
  createMockCarrierCredential,
  createMockAddress,
  createMockPackage,
  createMockRate,
  createMockSession,

  // Context helpers
  createTestContext,

  // Service mocks
  createRedisMock,
  createBullQueueMock,
};
