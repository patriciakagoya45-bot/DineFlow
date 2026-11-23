
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const MenuItem = require('../models/MenuItem');
const Payment = require('../models/Payment');

// CREATE ORDER
const createOrder = async (req, res) => {
    try {
        const {
            items,
            orderType,
            tableNumber,
            guestCount = 1,
            paymentMethod,
            notes
        } = req.body;
        const customer = req.auth.role === 'customer'
            ? req.auth.id
            : req.body.customer;

        if (!customer || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Customer and at least one order item are required'
            });
        }

        if (!Number.isInteger(Number(guestCount)) || Number(guestCount) < 1) {
            return res.status(400).json({
                success: false,
                message: 'Guest count must be at least one'
            });
        }
        if (!['cash', 'mobile-money', 'card', 'bank-transfer'].includes(paymentMethod)) {
            return res.status(400).json({
                success: false,
                message: 'Choose a valid payment method'
            });
        }

        const customerExists = await Customer.findById(customer);

        if (!customerExists) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        const orderItems = [];
        let totalAmount = 0;

        for (const item of items) {
            if (!item.menuItem || !Number.isInteger(item.quantity) || item.quantity < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Each item needs a valid menu item ID and quantity'
                });
            }

            const menuItem = await MenuItem.findById(item.menuItem);

            if (!menuItem) {
                return res.status(404).json({
                    success: false,
                    message: `Menu item not found: ${item.menuItem}`
                });
            }

            if (menuItem.availability !== 'available') {
                return res.status(400).json({
                    success: false,
                    message: `${menuItem.name} is currently unavailable`
                });
            }

            const subtotal = menuItem.price * item.quantity;
            totalAmount += subtotal;

            orderItems.push({
                menuItem: menuItem._id,
                name: menuItem.name,
                quantity: item.quantity,
                unitPrice: menuItem.price,
                subtotal
            });
        }

        const order = await Order.create({
            orderNumber: `DF-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
            customer,
            servedBy: ['admin', 'manager', 'waiter'].includes(req.auth.role)
                ? req.auth.id
                : undefined,
            items: orderItems,
            totalAmount,
            orderType,
            tableNumber,
            guestCount: Number(guestCount),
            notes
        });

        try {
            await Payment.create({
                order: order._id,
                amount: totalAmount,
                paymentMethod,
                paymentStatus: 'pending'
            });
        } catch (error) {
            await order.deleteOne();
            throw error;
        }

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: order
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// GET ALL ORDERS
const getOrders = async (req, res) => {
    try {
        const filter = req.auth.role === 'customer'
            ? { customer: req.auth.id }
            : ['admin', 'manager'].includes(req.auth.role)
                ? {}
                : req.auth.role === 'chef'
                    ? { status: { $in: ['pending', 'preparing', 'ready'] } }
                : {
                    $or: [
                        { servedBy: req.auth.id },
                        { servedBy: { $exists: false } },
                        { servedBy: null }
                    ]
                };
        let query = Order.find(filter);
        if (req.auth.role !== 'chef') {
            query = query.populate('customer', 'name phone');
        }
        const orders = await query
            .populate('items.menuItem', 'name price')
            .populate('servedBy', 'name role')
            .sort({ createdAt: -1 });
        const payments = await Payment.find({
            order: { $in: orders.map(order => order._id) }
        }).select('order paymentMethod paymentStatus');
        const paymentByOrder = new Map(
            payments.map(payment => [String(payment.order), payment])
        );
        const orderData = orders.map(order => {
            const payment = paymentByOrder.get(String(order._id));
            const data = {
                ...order.toObject(),
                paymentMethod: payment?.paymentMethod || '',
                paymentStatus: payment?.paymentStatus || ''
            };
            if (req.auth.role === 'chef') {
                delete data.customer;
                delete data.servedBy;
                delete data.totalAmount;
                delete data.paymentMethod;
                delete data.paymentStatus;
            }
            return data;
        });

        res.status(200).json({
            success: true,
            count: orderData.length,
            data: orderData
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// GET ONE ORDER
const getOrderById = async (req, res) => {
    try {
        let orderQuery = Order.findById(req.params.id)
            .populate('items.menuItem', 'name price')
            .populate('servedBy', 'name role');
        if (req.auth.role !== 'chef') {
            orderQuery = orderQuery.populate('customer', 'name phone');
        }
        const order = await orderQuery;

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (!canAccessOrder(req.auth, order)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to view this order'
            });
        }

        const orderData = order.toObject();
        if (req.auth.role === 'chef') {
            delete orderData.customer;
            delete orderData.servedBy;
            delete orderData.totalAmount;
        }
        res.status(200).json({
            success: true,
            data: orderData
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Invalid order ID'
        });
    }
};

// UPDATE ORDER
const updateOrder = async (req, res) => {
    try {
        const allowedFields = ['admin', 'manager'].includes(req.auth.role)
            ? ['status', 'orderType', 'tableNumber', 'guestCount', 'notes']
            : req.auth.role === 'chef'
                ? ['status']
                : ['status', 'tableNumber', 'guestCount', 'notes'];

        const updates = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid order changes were provided'
            });
        }

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (!canAccessOrder(req.auth, order)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to update this order'
            });
        }
        if (req.auth.role === 'customer') {
            return res.status(403).json({
                success: false,
                message: 'Customers cannot change order status'
            });
        }

        if (req.auth.role === 'chef' && updates.status &&
            !['preparing', 'ready'].includes(updates.status)) {
            return res.status(403).json({
                success: false,
                message: 'Kitchen staff can only mark orders preparing or ready'
            });
        }

        if (req.auth.role === 'waiter' && !order.servedBy) {
            order.servedBy = req.auth.id;
        }
        Object.assign(order, updates);
        await order.save();

        res.status(200).json({
            success: true,
            message: 'Order updated successfully',
            data: order
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// DELETE ORDER
const deleteOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (!canAccessOrder(req.auth, order)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to delete this order'
            });
        }

        if (req.auth.role === 'customer' ||
            !['admin', 'manager'].includes(req.auth.role)) {
            return res.status(403).json({
                success: false,
                message: 'Only a manager can delete orders'
            });
        }

        await order.deleteOne();
        await Payment.deleteMany({ order: order._id });

        res.status(200).json({
            success: true,
            message: 'Order deleted successfully'
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Invalid order ID'
        });
    }
};

function canAccessOrder(auth, order) {
    if (['admin', 'manager'].includes(auth.role)) {
        return true;
    }

    if (auth.role === 'chef') {
        return ['pending', 'preparing', 'ready'].includes(order.status);
    }

    if (auth.role === 'customer') {
        return String(order.customer?._id || order.customer) === String(auth.id);
    }

    const servedBy = order.servedBy?._id || order.servedBy;
    return !servedBy || String(servedBy) === String(auth.id);
}

module.exports = {
    createOrder,
    getOrders,
    getOrderById,
    updateOrder,
    deleteOrder
};
