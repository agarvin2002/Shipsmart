const express = require('express');
const router = express.Router();
const checkRoutes = require('./check');
const authRoutes = require('./auth');
const userRoutes = require('./user');
const addressRoutes = require('./address');
const carrierRoutes = require('./carrier');
const carrierCredentialRoutes = require('./carrier-credential');
const rateRoutes = require('./rate');
const logRoutes = require('./log');
const db = require('../models');
const config = require('@shipsmart/env');

// Redis client - get from helpers or initialize
let redisClient;
try {
  const redisHelper = require('../helpers/redis-helper');
  redisClient = redisHelper.getClient();
} catch (error) {
  // Redis helper might not be available yet
  redisClient = null;
}

// Enhanced health check endpoint with DB and Redis status
router.get('/health', async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.get('environment') || process.env.NODE_ENV || 'unknown',
    version: require('../../package.json').version || '1.0.0'
  };

  // Check database connection
  try {
    await db.sequelize.authenticate();
    health.database = {
      status: 'connected',
      type: 'PostgreSQL'
    };
  } catch (error) {
    health.database = {
      status: 'disconnected',
      error: error.message
    };
    health.status = 'DEGRADED';
  }

  // Check Redis connection
  if (redisClient) {
    try {
      // Test Redis with a ping command
      await new Promise((resolve, reject) => {
        redisClient.ping((err, reply) => {
          if (err) reject(err);
          else resolve(reply);
        });
      });
      health.redis = {
        status: 'connected',
        type: 'Redis'
      };
    } catch (error) {
      health.redis = {
        status: 'disconnected',
        error: error.message
      };
      health.status = 'DEGRADED';
    }
  } else {
    health.redis = {
      status: 'not_configured',
      message: 'Redis client not initialized'
    };
  }

  // Set HTTP status code based on health status
  const statusCode = health.status === 'OK' ? 200 : 503;
  res.status(statusCode).json(health);
});

router.use('/', checkRoutes);
router.use('/', authRoutes);
router.use('/', userRoutes);
router.use('/', addressRoutes);
router.use('/', carrierRoutes);
router.use('/', carrierCredentialRoutes);
router.use('/', rateRoutes);
router.use('/', logRoutes);

module.exports = router;
