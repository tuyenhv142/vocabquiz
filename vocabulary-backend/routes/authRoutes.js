const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/auth/send-otp', authController.sendOtp);
router.post('/auth/verify-otp', authController.verifyOtp);
router.post('/auth/signup', authController.signup);
router.post('/auth/login', authController.login);
router.post('/auth/forgot-password', authController.forgotPassword);
router.post('/auth/reset-password', authController.resetPassword);

router.delete('/users/:id', authController.deleteAccount);
router.get('/leaderboard', authController.getLeaderboard);

module.exports = router;
