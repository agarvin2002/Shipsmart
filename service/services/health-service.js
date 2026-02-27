/* global logger */

const db = require('../models');
const config = require('@shipsmart/env');
const { RedisClient } = require('@shipsmart/redis');

class HealthService {
  constructor() {
    this.redisClient = RedisClient;
  }

  async getHealthStatus() {
    const memUsage = process.memoryUsage();

    const health = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: config.get('environment') || process.env.NODE_ENV || 'unknown',
      version: require('../../package.json').version || '1.0.0',
      node: process.version,
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
        rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB'
      }
    };

    // Check database connection
    health.database = await this._checkDatabase();
    if (health.database.status !== 'connected') {
      health.status = 'DEGRADED';
    }

    // Check Redis connection
    health.redis = await this._checkRedis();
    if (health.redis.status === 'disconnected') {
      health.status = 'DEGRADED';
    }

    return health;
  }

  async _checkDatabase() {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DB health check timed out after 10s')), 10000)
    );
    try {
      await Promise.race([db.sequelize.authenticate(), timeout]);
      return {
        status: 'connected',
        type: 'PostgreSQL'
      };
    } catch (error) {
      logger.error('Database health check failed', { error: error.message });
      return {
        status: 'disconnected',
        error: error.message
      };
    }
  }

  async _checkRedis() {
    if (!this.redisClient) {
      return {
        status: 'not_configured',
        message: 'Redis client not initialized'
      };
    }

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Redis health check timed out after 10s')), 10000)
    );
    try {
      await Promise.race([
        new Promise((resolve, reject) => {
          this.redisClient.ping((err, reply) => {
            if (err) reject(err);
            else resolve(reply);
          });
        }),
        timeout
      ]);
      return {
        status: 'connected',
        type: 'Redis'
      };
    } catch (error) {
      logger.error('Redis health check failed', { error: error.message });
      return {
        status: 'disconnected',
        error: error.message
      };
    }
  }
}

module.exports = new HealthService();
