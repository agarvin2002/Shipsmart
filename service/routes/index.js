const express = require('express');
const router = express.Router();
const checkRoutes = require('./check');
const authRoutes = require('./auth');
const userRoutes = require('./user');
const addressRoutes = require('./address');
const carrierRoutes = require('./carrier');
const carrierCredentialRoutes = require('./carrier-credential');
const rateRoutes = require('./rate');

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

router.use('/', checkRoutes);
router.use('/', authRoutes);
router.use('/', userRoutes);
router.use('/', addressRoutes);
router.use('/', carrierRoutes);
router.use('/', carrierCredentialRoutes);
router.use('/', rateRoutes);

module.exports = router;
