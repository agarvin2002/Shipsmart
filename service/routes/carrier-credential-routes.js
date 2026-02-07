const express = require('express');
const router = express.Router();
const CarrierCredentialController = require('../controller/carrier-credential-controller');
const authMiddleware = require('../middleware/auth-middleware');

router.get('/carrier-credentials', authMiddleware, CarrierCredentialController.getCredentials);
router.get('/carrier-credentials/:id', authMiddleware, CarrierCredentialController.getCredentialById);
router.post('/carrier-credentials', authMiddleware, CarrierCredentialController.createCredential);
router.put('/carrier-credentials/:id', authMiddleware, CarrierCredentialController.updateCredential);
router.delete('/carrier-credentials/:id', authMiddleware, CarrierCredentialController.deleteCredential);
router.post('/carrier-credentials/:id/validate', authMiddleware, CarrierCredentialController.validateCredential);

module.exports = router;
