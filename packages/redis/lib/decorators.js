/* global logger */
const RedisWrapper = require('./wrapper');

/**
 * Cache Decorators
 *
 * Utility decorators for automatic caching of method results
 * Based on pack-courier-frontline-service patterns
 */

/**
 * Creates a cache decorator for class methods
 * @param {String} keyPattern - Redis key pattern (e.g., "USER:%(userId)s")
 * @param {Number} ttl - TTL in seconds (default: 86400 = 1 day)
 * @param {Function} keyResolver - Function to extract key data from method arguments
 * @returns {Function} Decorator function
 *
 * @example
 * class UserService {
 *   @withCache('USER:%(userId)s', 3600, (userId) => ({ userId }))
 *   async getUserById(userId) {
 *     return await User.findByPk(userId);
 *   }
 * }
 */
function withCache(keyPattern, ttl = 86400, keyResolver) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      try {
        // Resolve key data from arguments
        const keyData = keyResolver(...args);
        const cacheKey = RedisWrapper.getRedisKey(keyPattern, keyData);

        // Try cache first
        const cachedData = await RedisWrapper.get(cacheKey);
        if (cachedData) {
          logger.info(`[cache_hit] Key: ${cacheKey}`);
          const parsedData = JSON.parse(cachedData);
          if (parsedData._cache) {
            parsedData._cache.from_cache = true;
          }
          return parsedData;
        }

        // Cache miss - execute original method
        logger.info(`[cache_miss] Key: ${cacheKey}`);
        const result = await originalMethod.apply(this, args);

        if (result && !result.error) {
          // Add cache metadata
          const dataWithCache = {
            ...result,
            _cache: {
              from_cache: false,
              cached_at: new Date().toISOString(),
            },
          };

          // Store in cache
          await RedisWrapper.setWithExpiry(cacheKey, JSON.stringify(dataWithCache), ttl);
          logger.info(`[cache_set] Key: ${cacheKey} (TTL: ${ttl}s)`);

          return dataWithCache;
        }

        return result;
      } catch (error) {
        logger.error(`[cache_decorator_error] ${error.message}`, { stack: error.stack });
        // On cache error, fall back to original method
        return await originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

/**
 * Invalidate cache decorator
 * Automatically invalidates cache after method execution
 *
 * @param {String} keyPattern - Redis key pattern to invalidate
 * @param {Function} keyResolver - Function to extract key data from method arguments
 * @returns {Function} Decorator function
 *
 * @example
 * class UserService {
 *   @invalidateCache('USER:%(userId)s', (userId) => ({ userId }))
 *   async updateUser(userId, data) {
 *     return await User.update(data, { where: { id: userId } });
 *   }
 * }
 */
function invalidateCache(keyPattern, keyResolver) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      try {
        // Execute original method first
        const result = await originalMethod.apply(this, args);

        // Invalidate cache after successful execution
        if (result && !result.error) {
          const keyData = keyResolver(...args);
          const cacheKey = RedisWrapper.getRedisKey(keyPattern, keyData);
          await RedisWrapper.del(cacheKey);
          logger.info(`[cache_invalidated] Key: ${cacheKey}`);
        }

        return result;
      } catch (error) {
        logger.error(`[invalidate_decorator_error] ${error.message}`, { stack: error.stack });
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Manual cache wrapper function (for use without decorators)
 * @param {String} keyPattern - Redis key pattern
 * @param {Object} keyData - Data for key interpolation
 * @param {Function} fetchFunction - Async function to fetch data on cache miss
 * @param {Number} ttl - TTL in seconds
 * @returns {Promise<any>} Cached or fetched data
 */
async function cacheWrap(keyPattern, keyData, fetchFunction, ttl = 86400) {
  try {
    const cacheKey = RedisWrapper.getRedisKey(keyPattern, keyData);

    // Try cache first
    const cachedData = await RedisWrapper.get(cacheKey);
    if (cachedData) {
      logger.info(`[cache_hit] Key: ${cacheKey}`);
      const parsedData = JSON.parse(cachedData);
      if (parsedData._cache) {
        parsedData._cache.from_cache = true;
      }
      return parsedData;
    }

    // Cache miss - fetch data
    logger.info(`[cache_miss] Key: ${cacheKey}`);
    const result = await fetchFunction();

    if (result && !result.error) {
      const dataWithCache = {
        ...result,
        _cache: {
          from_cache: false,
          cached_at: new Date().toISOString(),
        },
      };

      await RedisWrapper.setWithExpiry(cacheKey, JSON.stringify(dataWithCache), ttl);
      logger.info(`[cache_set] Key: ${cacheKey} (TTL: ${ttl}s)`);

      return dataWithCache;
    }

    return result;
  } catch (error) {
    logger.error(`[cache_wrap_error] ${error.message}`, { stack: error.stack });
    // On error, fall back to fetching
    return await fetchFunction();
  }
}

module.exports = {
  withCache,
  invalidateCache,
  cacheWrap,
};
