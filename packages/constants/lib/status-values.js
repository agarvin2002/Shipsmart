const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
};

const CREDENTIAL_STATUS = {
  PENDING: 'pending',
  VALID: 'valid',
  INVALID: 'invalid',
  EXPIRED: 'expired',
};

const JOB_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

module.exports = {
  USER_STATUS,
  CREDENTIAL_STATUS,
  JOB_STATUS,
};
