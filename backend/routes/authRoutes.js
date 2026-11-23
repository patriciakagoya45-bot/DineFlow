const express = require('express');
const {
    registerCustomer,
    login,
    requestPasswordReset,
    resetPassword,
    currentAccount,
    logout
} = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register/customer', registerCustomer);
router.post('/login', login);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.get('/me', requireAuth, currentAccount);
router.post('/logout', requireAuth, logout);

module.exports = router;