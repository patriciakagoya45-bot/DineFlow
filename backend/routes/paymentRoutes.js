
const express = require('express');
const router = express.Router();

const {
    createPayment,
    getPayments,
    getPaymentById,
    updatePayment,
    deletePayment
} = require('../controllers/paymentController');

const { requireAuth, requireRole } = require('../middleware/auth');

// Only authorised restaurant staff can access payments
router.use(requireAuth, requireRole('admin', 'manager', 'waiter'));

// CREATE PAYMENT
router.post('/', requireRole('admin', 'manager', 'waiter'), createPayment);

// VIEW PAYMENTS
router.get('/', getPayments);
router.get('/:id', getPaymentById);

// UPDATE AND DELETE PAYMENTS
router.put('/:id', requireRole('admin', 'manager', 'waiter'), updatePayment);
router.delete('/:id', requireRole('admin', 'manager'), deletePayment);

module.exports = router;
