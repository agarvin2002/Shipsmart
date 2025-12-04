const express = require('express');
const router = express.Router();
const checkRoutes = require('./check');

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

router.use('/', checkRoutes);

module.exports = router;
