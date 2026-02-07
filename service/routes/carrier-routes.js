const express = require('express');
const router = express.Router();
const CarrierController = require('../controller/carrier-controller');
const authMiddleware = require('../middleware/auth-middleware');

router.get('/carriers', authMiddleware, CarrierController.getCarriers);
router.get('/carriers/:id', authMiddleware, CarrierController.getCarrierById);
router.get('/carriers/:id/services', authMiddleware, CarrierController.getCarrierServices);

module.exports = router;
