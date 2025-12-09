const { RedisConfig, RedisClient } = require('./lib/config');
const RedisWrapper = require('./lib/wrapper');
const RedisKeys = require('./lib/keys');
const { withCache, invalidateCache, cacheWrap } = require('./lib/decorators');

module.exports = {
  RedisConfig,
  RedisClient,
  RedisWrapper,
  RedisKeys,
  withCache,
  invalidateCache,
  cacheWrap,
};
