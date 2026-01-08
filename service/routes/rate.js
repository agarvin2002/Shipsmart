const express = require('express');
const router = express.Router();
const RateController = require('../controller/rate-controller');
const authMiddleware = require('../middleware/auth-middleware');
const { asyncJobLimiter, jobStatusLimiter } = require('../middleware/rate-limiter');

router.post('/shipments/rates', authMiddleware, asyncJobLimiter, RateController.getRates);
router.post('/shipments/rates/compare', authMiddleware, RateController.compareRates);
router.get('/shipments/rates/job/:jobId', authMiddleware, jobStatusLimiter, RateController.getJobStatus);
router.get('/shipments/rates/history', authMiddleware, RateController.getRateHistory);

module.exports = router;
