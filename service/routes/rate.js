const express = require('express');
const router = express.Router();
const RateController = require('../controller/rate-controller');
const authMiddleware = require('../middleware/auth-middleware');

router.post('/shipments/rates', authMiddleware, RateController.getRates);
router.post('/shipments/rates/compare', authMiddleware, RateController.compareRates);
router.get('/shipments/rates/history', authMiddleware, RateController.getRateHistory);

module.exports = router;
