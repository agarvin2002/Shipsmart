/* global logger */
const Redis = require('redis');
const config = require('@shipsmart/env');

/**
 * Redis Configuration
 * Centralizes Redis connection settings
 */
const redisConfig = config.get('bull').default_redis;

const RedisConfig = {
  host: redisConfig.host,
  port: redisConfig.port,
  ...(redisConfig.password) ? { auth_pass: redisConfig.password } : {},
  ...(redisConfig.tls) ? { tls: { servername: redisConfig.host } } : {},
};

/**
 * Redis Client Instance
 * Singleton pattern - single Redis connection shared across the application
 */
const RedisClient = Redis.createClient(RedisConfig);

// Connection event handlers
RedisClient.on('connect', () => {
  logger.info(`[redis] Connection established to ${RedisConfig.host}:${RedisConfig.port}`);
});

RedisClient.on('ready', () => {
  logger.info(`[redis] Client ready for commands`);
});

RedisClient.on('error', (err) => {
  logger.error(`[redis] Connection error: ${err.message}`, { stack: err.stack });
});

RedisClient.on('end', () => {
  logger.warn(`[redis] Connection closed`);
});

RedisClient.on('reconnecting', () => {
  logger.info(`[redis] Attempting to reconnect...`);
});

module.exports = { RedisConfig, RedisClient };
