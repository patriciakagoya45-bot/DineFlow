
const express = require('express');
const router = express.Router();

const {
    getOwnCustomer,
    updateOwnCustomer,
    createCustomer,
    getCustomers,
    getCustomerById,
    updateCustomer,
    deleteCustomer
} = require('../controllers/customerController');

const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/me', requireAuth, requireRole('customer'), getOwnCustomer);
router.put('/me', requireAuth, requireRole('customer'), updateOwnCustomer);

// Only restaurant staff can access customer records
router.use(requireAuth, requireRole('admin', 'manager', 'waiter'));

// VIEW CUSTOMERS
router.get('/', getCustomers);
router.get('/:id', getCustomerById);

// CREATE, UPDATE AND DELETE CUSTOMERS
router.post('/', requireRole('admin', 'manager', 'waiter'), createCustomer);
router.put('/:id', requireRole('admin', 'manager', 'waiter'), updateCustomer);
router.delete('/:id', requireRole('admin', 'manager'), deleteCustomer);

module.exports = router;
