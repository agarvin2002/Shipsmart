/**
 * Redis Key Constants
 *
 * Centralized Redis key definitions using sprintf format
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

  // Rate shopping keys
  RATE_CACHE: 'RATE:%(originId)s:%(destId)s:%(weight)s:%(service)s',
  RATE_LOCK: 'RATE_LOCK:%(cacheKey)s',
  CARRIER_TOKEN: 'CARRIER_TOKEN:%(carrier)s:%(clientId)s:%(userId)s',
  RATE_HISTORY: 'RATE_HISTORY:%(userId)s',
  CARRIER_STATUS: 'CARRIER_STATUS:%(carrier)s',
};

module.exports = RedisKeys;
