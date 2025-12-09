/* global logger */
const { promisify } = require('util');
const { sprintf } = require('sprintf-js');
const cls = require('cls-hooked');
const { RedisClient } = require('./config');
const { RedisError } = require('@shipsmart/errors');

const MULTI_GET = 'get';
const MULTI_DELETE = 'del';

/**
 * Get namespace for request ID tracking
 * Returns null if namespace doesn't exist yet (during initialization)
 */
function getNamespace() {
  try {
    return cls.getNamespace('shipsmart_sequel_trans');
  } catch (error) {
    return null;
  }
}

/**
 * Format log message with request ID if available
 * @param {String} message - Log message
 * @returns {String} Formatted message with [requestId] prefix
 */
function formatLog(message) {
  const namespace = getNamespace();
  const requestId = namespace && namespace.get('requestId');
  return requestId ? `[${requestId}] ${message}` : message;
}

/**
 * RedisWrapper - Utility class for Redis operations
 * Provides promisified methods and common Redis patterns
 *
 * Based on pack-courier-frontline-service architecture
 */
class RedisWrapper {
  /**
   * Get single key from Redis
   * @param {String} key - Redis key
   * @returns {Promise<String|null>} Value or null if not found
   */
  static async get(key) {
    try {
      const promisedGet = promisify(RedisClient.get).bind(RedisClient);
      return await promisedGet(key);
    } catch (error) {
      logger.error(formatLog(`[redis] Error getting key ${key}: ${error.message}`));
      throw new RedisError(`Failed to get key: ${key}`);
    }
  }

  /**
   * Set single key in Redis (no expiry)
   * @param {String} key - Redis key
   * @param {String} value - Value to store
   * @returns {Promise<String>} OK on success
   */
  static async set(key, value) {
    try {
      const promisedSet = promisify(RedisClient.set).bind(RedisClient);
      return await promisedSet(key, value);
    } catch (error) {
      logger.error(formatLog(`[redis] Error setting key ${key}: ${error.message}`));
      throw new RedisError(`Failed to set key: ${key}`);
    }
  }

  /**
   * Set single key with expiry (TTL)
   * @param {String} key - Redis key
   * @param {String} value - Value to store
   * @param {Number} expiry - TTL in seconds (default: 86400 = 1 day)
   * @returns {Promise<String>} OK on success
   */
  static async setWithExpiry(key, value, expiry = 86400) {
    try {
      const promisedSet = promisify(RedisClient.set).bind(RedisClient);
      return await promisedSet(key, value, 'EX', expiry);
    } catch (error) {
      logger.error(formatLog(`[redis] Error setting key ${key} with expiry: ${error.message}`));
      throw new RedisError(`Failed to set key with expiry: ${key}`);
    }
  }

  /**
   * Delete single key from Redis
   * @param {String} key - Redis key to delete
   * @returns {Promise<Number>} Number of keys deleted
   */
  static async del(key) {
    try {
      const promisedDel = promisify(RedisClient.del).bind(RedisClient);
      return await promisedDel(key);
    } catch (error) {
      logger.error(formatLog(`[redis] Error deleting key ${key}: ${error.message}`));
      throw new RedisError(`Failed to delete key: ${key}`);
    }
  }

  /**
   * Increment counter
   * @param {String} key - Redis key
   * @returns {Promise<Number>} New value after increment
   */
  static async incr(key) {
    try {
      const promisedIncr = promisify(RedisClient.incr).bind(RedisClient);
      return await promisedIncr(key);
    } catch (error) {
      logger.error(formatLog(`[redis] Error incrementing key ${key}: ${error.message}`));
      throw new RedisError(`Failed to increment key: ${key}`);
    }
  }

  /**
   * Decrement counter
   * @param {String} key - Redis key
   * @returns {Promise<Number>} New value after decrement
   */
  static async decr(key) {
    try {
      const promisedDecr = promisify(RedisClient.decr).bind(RedisClient);
      return await promisedDecr(key);
    } catch (error) {
      logger.error(formatLog(`[redis] Error decrementing key ${key}: ${error.message}`));
      throw new RedisError(`Failed to decrement key: ${key}`);
    }
  }

  /**
   * Get TTL (time to live) for a key
   * @param {String} key - Redis key
   * @returns {Promise<Number>} TTL in seconds, -1 if no expiry, -2 if key doesn't exist
   */
  static async ttl(key) {
    try {
      const promisedTtl = promisify(RedisClient.ttl).bind(RedisClient);
      return await promisedTtl(key);
    } catch (error) {
      logger.error(formatLog(`[redis] Error getting TTL for key ${key}: ${error.message}`));
      throw new RedisError(`Failed to get TTL for key: ${key}`);
    }
  }

  /**
   * Check if key exists
   * @param {String} key - Redis key
   * @returns {Promise<Boolean>} True if exists
   */
  static async exists(key) {
    try {
      const promisedExists = promisify(RedisClient.exists).bind(RedisClient);
      const result = await promisedExists(key);
      return result === 1;
    } catch (error) {
      logger.error(formatLog(`[redis] Error checking existence of key ${key}: ${error.message}`));
      throw new RedisError(`Failed to check existence of key: ${key}`);
    }
  }

  /**
   * Helper for multi-operations
   * @param {Array} keys - Array of Redis keys
   * @param {String} type - Operation type (get/del)
   * @returns {Object} Redis multi object
   */
  static getMultiObj(keys, type) {
    const multi = RedisClient.multi();
    keys.forEach((key) => {
      if (type === MULTI_GET) {
        multi.get(key);
      } else if (type === MULTI_DELETE) {
        multi.del(key);
      }
    });
    return multi;
  }

  /**
   * Get multiple keys atomically
   * @param {Array} keys - Array of Redis keys
   * @returns {Promise<Array>} Array of values
   */
  static multiGet(keys) {
    return new Promise((resolve, reject) => {
      try {
        const multi = RedisWrapper.getMultiObj(keys, MULTI_GET);
        multi.exec((err, response) => {
          if (err) {
            logger.error(formatLog(`[redis] Error in multiGet: ${err.message}`));
            reject(new RedisError('Failed to execute multiGet'));
          } else {
            resolve(response);
          }
        });
      } catch (error) {
        logger.error(formatLog(`[redis] Error in multiGet: ${error.message}`));
        reject(new RedisError('Failed to execute multiGet'));
      }
    });
  }

  /**
   * Delete multiple keys atomically
   * @param {Array} keys - Array of Redis keys
   * @returns {Promise<Array>} Array of delete counts
   */
  static multiDelete(keys) {
    return new Promise((resolve, reject) => {
      try {
        const multi = RedisWrapper.getMultiObj(keys, MULTI_DELETE);
        multi.exec((err, response) => {
          if (err) {
            logger.error(formatLog(`[redis] Error in multiDelete: ${err.message}`));
            reject(new RedisError('Failed to execute multiDelete'));
          } else {
            resolve(response);
          }
        });
      } catch (error) {
        logger.error(formatLog(`[redis] Error in multiDelete: ${error.message}`));
        reject(new RedisError('Failed to execute multiDelete'));
      }
    });
  }

  /**
   * Set multiple keys atomically
   * @param {Object} keyValue - Object with key-value pairs
   * @returns {Promise<Array>} Array of OK responses
   */
  static multiSet(keyValue) {
    return new Promise((resolve, reject) => {
      try {
        const multi = RedisClient.multi();
        Object.keys(keyValue).forEach((key) => {
          multi.set(key, keyValue[key]);
        });
        multi.exec((err, response) => {
          if (err) {
            logger.error(formatLog(`[redis] Error in multiSet: ${err.message}`));
            reject(new RedisError('Failed to execute multiSet'));
          } else {
            resolve(response);
          }
        });
      } catch (error) {
        logger.error(formatLog(`[redis] Error in multiSet: ${error.message}`));
        reject(new RedisError('Failed to execute multiSet'));
      }
    });
  }

  /**
   * Format Redis keys with sprintf
   * @param {String} key - Key template with placeholders (e.g., "USER:%(userId)s")
   * @param {Object} data - Data object for placeholder replacement
   * @returns {String} Formatted Redis key
   * @example
   * RedisWrapper.getRedisKey("USER:%(userId)s", { userId: 123 })
   * // Returns: "USER:123"
   */
  static getRedisKey(key, data) {
    try {
      return sprintf(key, data);
    } catch (error) {
      logger.error(formatLog(`[redis] Error formatting key: ${error.message}`));
      throw new RedisError('Invalid Redis key data');
    }
  }

  /**
   * Get Redis client instance (for advanced operations)
   * @returns {Object} Redis client
   */
  static getClient() {
    return RedisClient;
  }

  /**
   * Invalidate cache by pattern
   * @param {String} pattern - Redis key pattern (e.g., "USER:*")
   * @returns {Promise<Number>} Number of keys deleted
   */
  static async invalidateByPattern(pattern) {
    try {
      const promisedKeys = promisify(RedisClient.keys).bind(RedisClient);
      const keys = await promisedKeys(pattern);

      if (keys.length === 0) {
        logger.info(formatLog(`[redis] No keys found matching pattern: ${pattern}`));
        return 0;
      }

      const results = await RedisWrapper.multiDelete(keys);
      const deletedCount = results.reduce((sum, count) => sum + count, 0);

      logger.info(formatLog(`[redis] Invalidated ${deletedCount} keys matching pattern: ${pattern}`));
      return deletedCount;
    } catch (error) {
      logger.error(formatLog(`[redis] Error invalidating by pattern ${pattern}: ${error.message}`));
      throw new RedisError(`Failed to invalidate pattern: ${pattern}`);
    }
  }
}

module.exports = RedisWrapper;
