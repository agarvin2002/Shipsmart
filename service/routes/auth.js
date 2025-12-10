const express = require('express');
const router = express.Router();
const AuthController = require('../controller/auth-controller');
const authMiddleware = require('../middleware/auth-middleware');
const { loginLimiter, registerLimiter } = require('../middleware/rate-limiter');

router.post('/auth/register', registerLimiter, AuthController.register);
router.post('/auth/login', loginLimiter, AuthController.login);
router.post('/auth/refresh', AuthController.refreshToken);
router.post('/auth/logout', authMiddleware, AuthController.logout);
router.post('/auth/forgot-password', AuthController.forgotPassword);
router.post('/auth/reset-password', AuthController.resetPassword);
router.get('/auth/verify-email/:token', AuthController.verifyEmail);

module.exports = router;
