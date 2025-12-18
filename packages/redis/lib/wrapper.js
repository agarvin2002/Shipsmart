/* global logger */
const { promisify } = require('util');
const { sprintf } = require('sprintf-js');
const { RedisClient } = require('./config');
const { RedisError } = require('@shipsmart/errors');

const MULTI_GET = 'get';
const MULTI_DELETE = 'del';

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
      logger.debug(`[redis] Getting key: ${key}`);
      const promisedGet = promisify(RedisClient.get).bind(RedisClient);
      const value = await promisedGet(key);
      logger.debug(`[redis] Key retrieved: ${key}, exists: ${value !== null}`);
      return value;
    } catch (error) {
      logger.error(`[redis] Error getting key ${key}: ${error.message}`, { stack: error.stack });
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
      logger.debug(`[redis] Setting key: ${key}, value length: ${value?.length || 0}`);
      const promisedSet = promisify(RedisClient.set).bind(RedisClient);
      const result = await promisedSet(key, value);
      logger.info(`[redis] Key set successfully: ${key}`);
      return result;
    } catch (error) {
      logger.error(`[redis] Error setting key ${key}: ${error.message}`, { stack: error.stack });
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
      logger.debug(`[redis] Setting key with expiry: ${key}, TTL: ${expiry}s, value length: ${value?.length || 0}`);
      const promisedSet = promisify(RedisClient.set).bind(RedisClient);
      const result = await promisedSet(key, value, 'EX', expiry);
      logger.info(`[redis] Key set with expiry successfully: ${key}, TTL: ${expiry}s`);
      return result;
    } catch (error) {
      logger.error(`[redis] Error setting key ${key} with expiry ${expiry}s: ${error.message}`, { stack: error.stack });
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
      logger.debug(`[redis] Deleting key: ${key}`);
      const promisedDel = promisify(RedisClient.del).bind(RedisClient);
      const deletedCount = await promisedDel(key);
      logger.info(`[redis] Key deleted: ${key}, count: ${deletedCount}`);
      return deletedCount;
    } catch (error) {
      logger.error(`[redis] Error deleting key ${key}: ${error.message}`, { stack: error.stack });
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
      logger.debug(`[redis] Incrementing key: ${key}`);
      const promisedIncr = promisify(RedisClient.incr).bind(RedisClient);
      const newValue = await promisedIncr(key);
      logger.debug(`[redis] Key incremented: ${key}, new value: ${newValue}`);
      return newValue;
    } catch (error) {
      logger.error(`[redis] Error incrementing key ${key}: ${error.message}`, { stack: error.stack });
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
      logger.debug(`[redis] Decrementing key: ${key}`);
      const promisedDecr = promisify(RedisClient.decr).bind(RedisClient);
      const newValue = await promisedDecr(key);
      logger.debug(`[redis] Key decremented: ${key}, new value: ${newValue}`);
      return newValue;
    } catch (error) {
      logger.error(`[redis] Error decrementing key ${key}: ${error.message}`, { stack: error.stack });
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
      logger.debug(`[redis] Getting TTL for key: ${key}`);
      const promisedTtl = promisify(RedisClient.ttl).bind(RedisClient);
      const ttl = await promisedTtl(key);
      const ttlStatus = ttl === -2 ? 'key does not exist' : ttl === -1 ? 'no expiry' : `${ttl}s remaining`;
      logger.debug(`[redis] TTL retrieved for key: ${key}, status: ${ttlStatus}`);
      return ttl;
    } catch (error) {
      logger.error(`[redis] Error getting TTL for key ${key}: ${error.message}`, { stack: error.stack });
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
      logger.debug(`[redis] Checking existence of key: ${key}`);
      const promisedExists = promisify(RedisClient.exists).bind(RedisClient);
      const result = await promisedExists(key);
      const exists = result === 1;
      logger.debug(`[redis] Key existence check: ${key}, exists: ${exists}`);
      return exists;
    } catch (error) {
      logger.error(`[redis] Error checking existence of key ${key}: ${error.message}`, { stack: error.stack });
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
        logger.debug(`[redis] Executing multiGet for ${keys.length} keys`);
        const multi = RedisWrapper.getMultiObj(keys, MULTI_GET);
        multi.exec((err, response) => {
          if (err) {
            logger.error(`[redis] Error in multiGet for ${keys.length} keys: ${err.message}`, { stack: err.stack });
            reject(new RedisError('Failed to execute multiGet'));
          } else {
            const successCount = response.filter(v => v !== null).length;
            logger.info(`[redis] MultiGet completed: ${successCount}/${keys.length} keys found`);
            resolve(response);
          }
        });
      } catch (error) {
        logger.error(`[redis] Error in multiGet: ${error.message}`, { stack: error.stack });
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
        logger.debug(`[redis] Executing multiDelete for ${keys.length} keys`);
        const multi = RedisWrapper.getMultiObj(keys, MULTI_DELETE);
        multi.exec((err, response) => {
          if (err) {
            logger.error(`[redis] Error in multiDelete for ${keys.length} keys: ${err.message}`, { stack: err.stack });
            reject(new RedisError('Failed to execute multiDelete'));
          } else {
            const deletedCount = response.reduce((sum, count) => sum + count, 0);
            logger.info(`[redis] MultiDelete completed: ${deletedCount} keys deleted out of ${keys.length} requested`);
            resolve(response);
          }
        });
      } catch (error) {
        logger.error(`[redis] Error in multiDelete: ${error.message}`, { stack: error.stack });
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
        const keys = Object.keys(keyValue);
        logger.debug(`[redis] Executing multiSet for ${keys.length} keys`);
        const multi = RedisClient.multi();
        keys.forEach((key) => {
          multi.set(key, keyValue[key]);
        });
        multi.exec((err, response) => {
          if (err) {
            logger.error(`[redis] Error in multiSet for ${keys.length} keys: ${err.message}`, { stack: err.stack });
            reject(new RedisError('Failed to execute multiSet'));
          } else {
            const successCount = response.filter(r => r === 'OK').length;
            logger.info(`[redis] MultiSet completed: ${successCount}/${keys.length} keys set successfully`);
            resolve(response);
          }
        });
      } catch (error) {
        logger.error(`[redis] Error in multiSet: ${error.message}`, { stack: error.stack });
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
      const formattedKey = sprintf(key, data);
      logger.debug(`[redis] Key formatted: template="${key}", result="${formattedKey}"`);
      return formattedKey;
    } catch (error) {
      logger.error(`[redis] Error formatting key template="${key}": ${error.message}`, { stack: error.stack, data });
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
      logger.info(`[redis] Invalidating keys by pattern: ${pattern}`);
      const promisedKeys = promisify(RedisClient.keys).bind(RedisClient);
      const keys = await promisedKeys(pattern);

      if (keys.length === 0) {
        logger.info(`[redis] No keys found matching pattern: ${pattern}`);
        return 0;
      }

      logger.debug(`[redis] Found ${keys.length} keys matching pattern: ${pattern}`);
      const results = await RedisWrapper.multiDelete(keys);
      const deletedCount = results.reduce((sum, count) => sum + count, 0);

      logger.info(`[redis] Invalidation complete: ${deletedCount} keys deleted for pattern: ${pattern}`);
      return deletedCount;
    } catch (error) {
      logger.error(`[redis] Error invalidating by pattern ${pattern}: ${error.message}`, { stack: error.stack });
      throw new RedisError(`Failed to invalidate pattern: ${pattern}`);
    }
  }
}

module.exports = RedisWrapper;
