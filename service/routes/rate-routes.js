const express = require('express');
const router = express.Router();
const RateController = require('../controller/rate-controller');
const authMiddleware = require('../middleware/auth-middleware');
const { asyncJobLimiter, jobStatusLimiter } = require('../middleware/rate-limiter');
const apiLogger = require('../middleware/api-logger-middleware');

// Apply API logging only to rate fetching endpoints (not status/history endpoints)
router.post('/shipments/rates', authMiddleware, apiLogger(), asyncJobLimiter, RateController.getRates);
router.post('/shipments/rates/compare', authMiddleware, apiLogger(), RateController.compareRates);
router.get('/shipments/rates/job/:jobId', authMiddleware, jobStatusLimiter, RateController.getJobStatus);
router.get('/shipments/rates/history', authMiddleware, RateController.getRateHistory);

module.exports = router;
