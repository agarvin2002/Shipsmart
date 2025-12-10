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

  // User-related keys
  USER_DATA: 'USER_DATA:%(userId)s',
};

module.exports = RedisKeys;
