const express = require('express');
const router = express.Router();
const authRoutes = require('./auth-routes');
const userRoutes = require('./user-routes');
const addressRoutes = require('./address-routes');
const carrierRoutes = require('./carrier-routes');
const carrierCredentialRoutes = require('./carrier-credential-routes');
const rateRoutes = require('./rate-routes');
const logRoutes = require('./log-routes');
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
