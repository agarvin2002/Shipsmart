/**
 * Test Fixtures
 *
 * Reusable test data organized by complexity layers:
 * - Layer 1: Primitives (addresses, contacts)
 * - Layer 2: Composites (packages, shipments)
 * - Layer 3: Domain (users, credentials)
 * - Layer 4: Request/Response templates
 */

/**
 * Layer 1: Primitive Fixtures
 */

const ADDRESSES = {
  DOMESTIC_ORIGIN: {
    postal_code: '10001',
    city: 'New York',
    state_province: 'NY',
    country: 'US',
    street_address_1: '123 Main St',
    street_address_2: null,
  },

  DOMESTIC_DESTINATION: {
    postal_code: '90210',
    city: 'Beverly Hills',
    state_province: 'CA',
    country: 'US',
    street_address_1: '456 Sunset Blvd',
    street_address_2: null,
  },

  INTERNATIONAL_ORIGIN: {
    postal_code: '10001',
    city: 'New York',
    state_province: 'NY',
    country: 'US',
    street_address_1: '789 Broadway',
    street_address_2: null,
  },

  INTERNATIONAL_DESTINATION: {
    postal_code: 'M5V 2T6',
    city: 'Toronto',
    state_province: 'ON',
    country: 'CA',
    street_address_1: '301 Front St',
    street_address_2: null,
  },
};

const CONTACTS = {
  DEFAULT: {
    name: 'John Doe',
    company: 'ACME Corp',
    phone: '+1-555-123-4567',
    email: 'john.doe@acme.com',
  },

  RECIPIENT: {
    name: 'Jane Smith',
    company: 'Example Inc',
    phone: '+1-555-987-6543',
    email: 'jane.smith@example.com',
  },
};

/**
 * Layer 2: Composite Fixtures
 */

const PACKAGES = {
  SMALL: {
    weight: 1,
    weight_units: 'LB',
    length: 6,
    width: 4,
    height: 2,
    dimension_units: 'IN',
    package_type: 'YOUR_PACKAGING',
  },

  MEDIUM: {
    weight: 10,
    weight_units: 'LB',
    length: 12,
    width: 8,
    height: 6,
    dimension_units: 'IN',
    package_type: 'YOUR_PACKAGING',
  },

  LARGE: {
    weight: 50,
    weight_units: 'LB',
    length: 24,
    width: 18,
    height: 12,
    dimension_units: 'IN',
    package_type: 'YOUR_PACKAGING',
  },

  HEAVY: {
    weight: 100,
    weight_units: 'LB',
    length: 30,
    width: 24,
    height: 18,
    dimension_units: 'IN',
    package_type: 'YOUR_PACKAGING',
  },

  ENVELOPE: {
    weight: 0.5,
    weight_units: 'LB',
    length: 12,
    width: 9,
    height: 0.5,
    dimension_units: 'IN',
    package_type: 'ENVELOPE',
  },
};

const SHIPMENTS = {
  DOMESTIC_SMALL: {
    origin: ADDRESSES.DOMESTIC_ORIGIN,
    destination: ADDRESSES.DOMESTIC_DESTINATION,
    packages: [PACKAGES.SMALL],
    service_type: 'GROUND',
  },

  DOMESTIC_MEDIUM: {
    origin: ADDRESSES.DOMESTIC_ORIGIN,
    destination: ADDRESSES.DOMESTIC_DESTINATION,
    packages: [PACKAGES.MEDIUM],
    service_type: 'GROUND',
  },

  DOMESTIC_MULTI_PACKAGE: {
    origin: ADDRESSES.DOMESTIC_ORIGIN,
    destination: ADDRESSES.DOMESTIC_DESTINATION,
    packages: [PACKAGES.SMALL, PACKAGES.MEDIUM],
    service_type: 'GROUND',
  },

  INTERNATIONAL: {
    origin: ADDRESSES.INTERNATIONAL_ORIGIN,
    destination: ADDRESSES.INTERNATIONAL_DESTINATION,
    packages: [PACKAGES.MEDIUM],
    service_type: 'INTERNATIONAL_ECONOMY',
  },

  EXPRESS: {
    origin: ADDRESSES.DOMESTIC_ORIGIN,
    destination: ADDRESSES.DOMESTIC_DESTINATION,
    packages: [PACKAGES.MEDIUM],
    service_type: 'EXPRESS',
  },
};

/**
 * Layer 3: Domain Fixtures
 */

const USERS = {
  ACTIVE: {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'active@example.com',
    password_hash: '$2b$10$hashedpasswordactive',
    first_name: 'Active',
    last_name: 'User',
    status: 'active',
    email_verified: true,
    company_name: 'Active Company',
    phone: '+1-555-111-1111',
  },

  INACTIVE: {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'inactive@example.com',
    password_hash: '$2b$10$hashedpasswordinactive',
    first_name: 'Inactive',
    last_name: 'User',
    status: 'inactive',
    email_verified: true,
  },

  UNVERIFIED: {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'unverified@example.com',
    password_hash: '$2b$10$hashedpasswordunverified',
    first_name: 'Unverified',
    last_name: 'User',
    status: 'active',
    email_verified: false,
    email_verification_token: 'verification_token_123',
  },

  ADMIN: {
    id: '00000000-0000-0000-0000-000000000004',
    email: 'admin@example.com',
    password_hash: '$2b$10$hashedpasswordadmin',
    first_name: 'Admin',
    last_name: 'User',
    status: 'active',
    email_verified: true,
    role: 'admin',
  },
};

const CREDENTIALS = {
  FEDEX_VALID: {
    id: '00000000-0000-0000-0000-000000000101',
    carrier: 'fedex',
    client_id_encrypted: 'encrypted_fedex_client_id_123',
    client_secret_encrypted: 'encrypted_fedex_client_secret_456',
    is_active: true,
    validation_status: 'valid',
    account_numbers: ['123456789'],
  },

  UPS_VALID: {
    id: '00000000-0000-0000-0000-000000000102',
    carrier: 'ups',
    client_id_encrypted: 'encrypted_ups_client_id_123',
    client_secret_encrypted: 'encrypted_ups_client_secret_456',
    is_active: true,
    validation_status: 'valid',
    account_numbers: ['987654321'],
  },

  USPS_VALID: {
    id: '00000000-0000-0000-0000-000000000103',
    carrier: 'usps',
    client_id_encrypted: 'encrypted_usps_client_id_123',
    client_secret_encrypted: 'encrypted_usps_client_secret_456',
    is_active: true,
    validation_status: 'valid',
  },

  DHL_VALID: {
    id: '00000000-0000-0000-0000-000000000104',
    carrier: 'dhl',
    client_id_encrypted: 'encrypted_dhl_client_id_123',
    client_secret_encrypted: 'encrypted_dhl_client_secret_456',
    is_active: true,
    validation_status: 'valid',
  },

  INVALID: {
    id: '00000000-0000-0000-0000-000000000105',
    carrier: 'fedex',
    client_id_encrypted: 'encrypted_invalid_client_id',
    client_secret_encrypted: 'encrypted_invalid_client_secret',
    is_active: false,
    validation_status: 'invalid',
  },
};

/**
 * Layer 4: Request/Response Templates
 */

const RATE_REQUESTS = {
  DOMESTIC: {
    origin: ADDRESSES.DOMESTIC_ORIGIN,
    destination: ADDRESSES.DOMESTIC_DESTINATION,
    packages: [PACKAGES.MEDIUM],
  },

  INTERNATIONAL: {
    origin: ADDRESSES.INTERNATIONAL_ORIGIN,
    destination: ADDRESSES.INTERNATIONAL_DESTINATION,
    packages: [PACKAGES.MEDIUM],
  },

  MULTI_PACKAGE: {
    origin: ADDRESSES.DOMESTIC_ORIGIN,
    destination: ADDRESSES.DOMESTIC_DESTINATION,
    packages: [PACKAGES.SMALL, PACKAGES.MEDIUM, PACKAGES.LARGE],
  },
};

const RATE_RESPONSES = {
  FEDEX_GROUND: {
    carrier: 'fedex',
    service_name: 'FedEx Ground',
    service_type: 'GROUND',
    rate_amount: '15.50',
    currency: 'USD',
    delivery_days: 3,
  },

  UPS_GROUND: {
    carrier: 'ups',
    service_name: 'UPS Ground',
    service_type: 'GROUND',
    rate_amount: '16.75',
    currency: 'USD',
    delivery_days: 3,
  },

  USPS_PRIORITY: {
    carrier: 'usps',
    service_name: 'USPS Priority Mail',
    service_type: 'PRIORITY',
    rate_amount: '12.50',
    currency: 'USD',
    delivery_days: 2,
  },

  FEDEX_EXPRESS: {
    carrier: 'fedex',
    service_name: 'FedEx 2Day',
    service_type: 'EXPRESS',
    rate_amount: '45.00',
    currency: 'USD',
    delivery_days: 2,
  },
};

const AUTH_REQUESTS = {
  LOGIN: {
    email: 'active@example.com',
    password: 'password123',
  },

  REGISTER: {
    email: 'newuser@example.com',
    password: 'SecurePassword123!',
    first_name: 'New',
    last_name: 'User',
    company_name: 'New Company',
    phone: '+1-555-222-2222',
  },

  FORGOT_PASSWORD: {
    email: 'active@example.com',
  },

  RESET_PASSWORD: {
    token: 'reset_token_123456',
    password: 'NewSecurePassword456!',
  },

  VERIFY_EMAIL: {
    token: 'verification_token_123456',
  },
};

const JWT_TOKENS = {
  VALID: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJqdGkiOiJhYmMxMjMiLCJpYXQiOjE2MDk0NTkyMDB9.test',
  EXPIRED: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJqdGkiOiJleHBpcmVkIiwiaWF0IjoxNjA5NDU5MjAwLCJleHAiOjE2MDk0NTkyMDF9.test',
  INVALID: 'invalid.jwt.token',
};

module.exports = {
  // Primitives
  ADDRESSES,
  CONTACTS,

  // Composites
  PACKAGES,
  SHIPMENTS,

  // Domain
  USERS,
  CREDENTIALS,

  // Requests/Responses
  RATE_REQUESTS,
  RATE_RESPONSES,
  AUTH_REQUESTS,
  JWT_TOKENS,
};
