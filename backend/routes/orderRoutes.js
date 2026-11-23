
const express = require('express');
const router = express.Router();

const {
    createOrder,
    getOrders,
    getOrderById,
    updateOrder,
    deleteOrder
} = require('../controllers/orderController');

const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth, requireRole('admin', 'manager', 'waiter', 'chef', 'customer'));

// CREATE ORDER
router.post('/', requireRole('admin', 'manager', 'waiter', 'customer'), createOrder);

// VIEW ORDERS
router.get('/', getOrders);
router.get('/:id', getOrderById);

// UPDATE ORDER
router.put('/:id', requireRole('admin', 'manager', 'waiter', 'chef'), updateOrder);

// DELETE ORDER
router.delete('/:id', requireRole('admin', 'manager'), deleteOrder);

module.exports = router;
