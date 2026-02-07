const express = require('express');
const router = express.Router();
const AddressController = require('../controller/address-controller');
const authMiddleware = require('../middleware/auth-middleware');

router.get('/addresses', authMiddleware, AddressController.getAddresses);
router.get('/addresses/:id', authMiddleware, AddressController.getAddressById);
router.post('/addresses', authMiddleware, AddressController.createAddress);
router.put('/addresses/:id', authMiddleware, AddressController.updateAddress);
router.delete('/addresses/:id', authMiddleware, AddressController.deleteAddress);
router.patch('/addresses/:id/set-default', authMiddleware, AddressController.setDefaultAddress);

module.exports = router;
