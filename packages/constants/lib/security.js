const SECURITY = {
  BCRYPT_SALT_ROUNDS: 10,

  SENSITIVE_HEADERS: [
    'authorization',
    'x-api-key',
    'cookie',
    'set-cookie',
  ],

  SENSITIVE_FIELDS: [
    'password',
    'password_hash',
    'client_secret',
    'api_key',
    'token',
    'refresh_token',
    'encryption_key',
  ],
};

module.exports = {
  SECURITY,
};
