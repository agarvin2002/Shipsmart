/**
 * Redis Key Constants
 *
 * Centralized Redis key definitions using sprintf format
 * Based on pack-courier-frontline-service architecture
 *
 * Key Format: PREFIX:%(placeholder)s
 * Example: CHECK_DATA:%(checkId)s -> CHECK_DATA:123
 */

const RedisKeys = {
  // Check-related keys
  CHECK_DATA: 'CHECK_DATA:%(checkId)s',
  CHECK_LIST: 'CHECK_LIST',

  // Add more key patterns as needed
  // Example patterns:
  // USER_DATA: 'USER:%(userId)s',
  // SESSION: 'SESSION:%(sessionId)s',
  // RATE_LIMIT: 'RATE_LIMIT:%(ip)s',
};

module.exports = RedisKeys;
