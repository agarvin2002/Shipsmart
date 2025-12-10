/* global logger */
const bcrypt = require('bcrypt');
const UserRepository = require('../repositories/user-repository');
const { RedisWrapper, RedisKeys } = require('@shipsmart/redis');

class UserService {
  constructor() {
    this.userRepository = new UserRepository();
  }

  async getUserById(id) {
    try {
      const cacheKey = RedisWrapper.getRedisKey(RedisKeys.USER_DATA, { userId: id });
      const cacheExpiry = 300;

      let cachedData = await RedisWrapper.get(cacheKey);

      if (cachedData) {
        logger.info(`[cache_hit] User ${id} retrieved from Redis cache`);
        const userData = JSON.parse(cachedData);
        userData._cache.from_cache = true;
        return userData;
      }

      logger.info(`[cache_miss] User ${id} not in cache, fetching from database`);
      const user = await this.userRepository.findById(id);

      if (!user) {
        return { error: 'User not found' };
      }

      const userData = user.toJSON();
      delete userData.password_hash;
      delete userData.password_reset_token;
      delete userData.email_verification_token;

      const cachedAt = new Date().toISOString();
      const userWithCache = {
        ...userData,
        _cache: {
          from_cache: false,
          cached_at: cachedAt,
        },
      };

      await RedisWrapper.setWithExpiry(cacheKey, JSON.stringify(userWithCache), cacheExpiry);
      logger.info(`[cache_set] User ${id} stored in Redis cache with ${cacheExpiry}s TTL`);

      return userWithCache;
    } catch (error) {
      logger.error(`Error fetching user by id ${id}: ${error.stack}`);
      throw error;
    }
  }

  async updateUser(id, data) {
    try {
      const user = await this.userRepository.update(id, data);
      if (!user) {
        return { error: 'User not found' };
      }

      const cacheKey = RedisWrapper.getRedisKey(RedisKeys.USER_DATA, { userId: id });
      await RedisWrapper.del(cacheKey);

      const userData = user.toJSON();
      delete userData.password_hash;

      return userData;
    } catch (error) {
      logger.error(`Error updating user ${id}: ${error.stack}`);
      throw error;
    }
  }

  async changePassword(id, currentPassword, newPassword) {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        return { error: 'User not found' };
      }

      const isValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValid) {
        return { error: 'Current password is incorrect' };
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await this.userRepository.updatePassword(id, newHash);

      return { message: 'Password changed successfully' };
    } catch (error) {
      logger.error(`Error changing password for user ${id}: ${error.stack}`);
      throw error;
    }
  }

  async deleteUser(id) {
    try {
      const result = await this.userRepository.softDelete(id);
      if (!result) {
        return { error: 'User not found' };
      }

      const cacheKey = RedisWrapper.getRedisKey(RedisKeys.USER_DATA, { userId: id });
      await RedisWrapper.del(cacheKey);

      return { message: 'Account deleted successfully' };
    } catch (error) {
      logger.error(`Error deleting user ${id}: ${error.stack}`);
      throw error;
    }
  }

  async getUserWithAddresses(id) {
    try {
      const user = await this.userRepository.findWithAddresses(id);
      if (!user) {
        return { error: 'User not found' };
      }

      const userData = user.toJSON();
      delete userData.password_hash;

      return userData;
    } catch (error) {
      logger.error(`Error fetching user with addresses ${id}: ${error.stack}`);
      throw error;
    }
  }
}

module.exports = UserService;
