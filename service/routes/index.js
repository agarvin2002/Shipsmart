const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const userRoutes = require('./user');
const addressRoutes = require('./address');
const carrierRoutes = require('./carrier');
const carrierCredentialRoutes = require('./carrier-credential');
const rateRoutes = require('./rate');
const logRoutes = require('./log');
const HealthController = require('../controller/health-controller');

// Health check endpoint
router.get('/health', HealthController.getHealth);

router.use('/', authRoutes);
router.use('/', userRoutes);
router.use('/', addressRoutes);
router.use('/', carrierRoutes);
router.use('/', carrierCredentialRoutes);
router.use('/', rateRoutes);
router.use('/', logRoutes);

module.exports = router;
