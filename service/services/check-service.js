/* global logger */
const { Check } = require('../models');
const { s3Wrapper, S3KeyGenerator } = require('@shipsmart/s3');
const { RedisWrapper, RedisKeys } = require('@shipsmart/redis');

class CheckService {
  async getAllChecks() {
    try {
      const checks = await Check.findAll({
        order: [['created_at', 'DESC']],
      });
      return checks;
    } catch (error) {
      logger.error(`Error fetching all checks: ${error.stack}`);
      throw error;
    }
  }

  async getCheckById(id) {
    try {
      // Generate Redis key for this check
      const cacheKey = RedisWrapper.getRedisKey(RedisKeys.CHECK_DATA, { checkId: id });
      const cacheExpiry = 10; // 10 seconds TTL

      // Try to get from cache first
      let cachedData = await RedisWrapper.get(cacheKey);

      if (cachedData) {
        // Cache HIT
        logger.info(`[cache_hit] Check ${id} retrieved from Redis cache`);
        const checkData = JSON.parse(cachedData);
        // Update cache metadata to indicate it came from cache
        checkData._cache.from_cache = true;
        return checkData;
      }

      // Cache MISS - fetch from database
      logger.info(`[cache_miss] Check ${id} not in cache, fetching from database`);
      const check = await Check.findByPk(id);

      if (!check) {
        return { error: 'Check not found' };
      }

      // Convert Sequelize model to plain object
      const checkData = check.toJSON();

      // Add cache metadata
      const cachedAt = new Date().toISOString();
      const checkWithCache = {
        ...checkData,
        _cache: {
          from_cache: false,
          cached_at: cachedAt,
        },
      };

      // Store in Redis with 10 second TTL
      await RedisWrapper.setWithExpiry(cacheKey, JSON.stringify(checkWithCache), cacheExpiry);
      logger.info(`[cache_set] Check ${id} stored in Redis cache with ${cacheExpiry}s TTL`);

      return checkWithCache;
    } catch (error) {
      logger.error(`Error fetching check by id ${id}: ${error.stack}`);
      throw error;
    }
  }

  async createCheck(data) {
    try {
      const check = await Check.create({
        name: data.name,
        description: data.description,
        status: data.status || 'active',
      });
      return check;
    } catch (error) {
      logger.error(`Error creating check: ${error.stack}`);
      throw error;
    }
  }

  async updateCheck(id, data) {
    try {
      const check = await Check.findByPk(id);
      if (!check) {
        return { error: 'Check not found' };
      }

      await check.update({
        name: data.name !== undefined ? data.name : check.name,
        description: data.description !== undefined ? data.description : check.description,
        status: data.status !== undefined ? data.status : check.status,
      });

      return check;
    } catch (error) {
      logger.error(`Error updating check ${id}: ${error.stack}`);
      throw error;
    }
  }

  async deleteCheck(id) {
    try {
      const check = await Check.findByPk(id);
      if (!check) {
        return { error: 'Check not found' };
      }

      await check.destroy();
      return { message: 'Check deleted successfully' };
    } catch (error) {
      logger.error(`Error deleting check ${id}: ${error.stack}`);
      throw error;
    }
  }

  async uploadFile(file, folder = 'uploads') {
    try {
      // Generate unique S3 key using S3KeyGenerator
      const s3Key = S3KeyGenerator.generateUniqueKey(file.originalname, folder);

      // Upload to S3
      await s3Wrapper.uploadToAWS(file.buffer, s3Key);

      // Generate download URL (48 hours expiry, same as doc-gen)
      const bucketName = s3Wrapper.getS3BucketName();
      const downloadUrl = await s3Wrapper.getPublicUrl(bucketName, s3Key, true, 172800);

      logger.info(`File uploaded successfully: ${s3Key}`);

      // Extract filename from S3 key (e.g., "uploads/abc.pdf" -> "abc.pdf")
      const fileName = s3Key.split('/').pop();

      return {
        message: 'File uploaded successfully',
        file: {
          file_name: fileName,
          original_name: file.originalname,
          s3_bucket_name: bucketName,
          s3_key: s3Key,
          file_size: file.size,
          mime_type: file.mimetype,
          uploaded_at: new Date().toISOString(),
          download_url: downloadUrl,
        },
      };
    } catch (error) {
      logger.error(`Error uploading file: ${error.message}`, { stack: error.stack });
      throw error;
    }
  }
}

module.exports = CheckService;
