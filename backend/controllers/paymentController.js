
const Payment = require('../models/Payment');
const Order = require('../models/Order');

// CREATE PAYMENT
const createPayment = async (req, res) => {
    try {
        const {
            order,
            amount,
            paymentMethod,
            transactionReference
        } = req.body;

        if (!order || !amount || !paymentMethod) {
            return res.status(400).json({
                success: false,
                message: 'Order, amount and payment method are required'
            });
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Payment amount must be greater than zero'
            });
        }

        const existingOrder = await Order.findById(order);

        if (!existingOrder) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (req.auth.role === 'waiter' && existingOrder.servedBy &&
            String(existingOrder.servedBy) !== String(req.auth.id)) {
            return res.status(403).json({
                success: false,
                message: 'You can only record payments for your orders or unassigned orders'
            });
        }

        if (amount !== existingOrder.totalAmount) {
            return res.status(400).json({
                success: false,
                message: 'Payment amount must match the order total'
            });
        }

        if (await Payment.exists({ order: existingOrder._id })) {
            return res.status(409).json({
                success: false,
                message: 'A payment record already exists for this order'
            });
        }

        const payment = await Payment.create({
            order,
            amount,
            paymentMethod,
            transactionReference
        });

        res.status(201).json({
            success: true,
            message: 'Payment record created successfully',
            data: payment
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// GET ALL PAYMENTS
const getPayments = async (req, res) => {
    try {
        const filter = {};
        if (req.auth.role === 'waiter') {
            const accessibleOrders = await Order.find({
                $or: [
                    { servedBy: req.auth.id },
                    { servedBy: { $exists: false } },
                    { servedBy: null }
                ]
            }).select('_id');
            filter.order = { $in: accessibleOrders.map(order => order._id) };
        }
        const payments = await Payment.find(filter)
            .populate('order', 'orderNumber totalAmount status')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: payments.length,
            data: payments
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// GET ONE PAYMENT
const getPaymentById = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id)
            .populate('order', 'orderNumber totalAmount status servedBy');

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        if (!canManagePayment(req.auth, payment)) {
            return res.status(403).json({ success: false, message: 'You cannot access this payment.' });
        }

        res.status(200).json({
            success: true,
            data: payment
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Invalid payment ID'
        });
    }
};

// UPDATE PAYMENT
const updatePayment = async (req, res) => {
    try {
        const allowedFields = [
            'paymentStatus',
            'transactionReference'
        ];

        const updates = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        const payment = await Payment.findById(req.params.id)
            .populate('order', 'servedBy');

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        if (!canManagePayment(req.auth, payment)) {
            return res.status(403).json({ success: false, message: 'You cannot update this payment.' });
        }
        if (req.auth.role === 'waiter' && updates.paymentStatus === 'refunded') {
            return res.status(403).json({ success: false, message: 'Only managers can mark payments refunded.' });
        }
        if (updates.paymentStatus === 'successful' && payment.paymentStatus !== 'successful') {
            payment.paymentDate = new Date();
        }
        Object.assign(payment, updates);
        await payment.save();

        res.status(200).json({
            success: true,
            message: 'Payment updated successfully',
            data: payment
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// DELETE PAYMENT
const deletePayment = async (req, res) => {
    try {
        const payment = await Payment.findByIdAndDelete(req.params.id);

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Payment deleted successfully'
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Invalid payment ID'
        });
    }
};

function canManagePayment(auth, payment) {
    if (['admin', 'manager'].includes(auth.role)) return true;
    if (auth.role !== 'waiter') return false;
    const servedBy = payment.order?.servedBy;
    return !servedBy || String(servedBy) === String(auth.id);
}

module.exports = {
    createPayment,
    getPayments,
    getPaymentById,
    updatePayment,
    deletePayment
};
