const express = require('express');
const router = express.Router();
const UserController = require('../controller/user-controller');
const authMiddleware = require('../middleware/auth-middleware');

router.get('/users/profile', authMiddleware, UserController.getProfile);
router.put('/users/profile', authMiddleware, UserController.updateProfile);
router.post('/users/change-password', authMiddleware, UserController.changePassword);
router.delete('/users/account', authMiddleware, UserController.deleteAccount);

module.exports = router;
