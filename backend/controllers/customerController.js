const Customer = require('../models/Customer');

const getOwnCustomer = async (req, res) => {
    const customer = await Customer.findById(req.auth.id).select('name email phone address');
    if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer profile not found' });
    }
    res.status(200).json({ success: true, data: customer });
};

const updateOwnCustomer = async (req, res) => {
    try {
        const updates = {};
        for (const field of ['name', 'phone', 'address']) {
            if (req.body[field] !== undefined) updates[field] = String(req.body[field]).trim();
        }
        if (!updates.name || !updates.phone) {
            return res.status(400).json({ success: false, message: 'Name and phone are required' });
        }
        const customer = await Customer.findByIdAndUpdate(req.auth.id, updates, {
            new: true,
            runValidators: true
        }).select('name email phone address');
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer profile not found' });
        }
        res.status(200).json({ success: true, message: 'Profile updated', data: customer });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// CREATE CUSTOMER
const createCustomer = async (req, res) => {
    try {
        const { name, phone, email, address } = req.body;

        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Customer name and phone are required'
            });
        }

        const existingCustomer = await Customer.findOne({ phone });

        if (existingCustomer) {
            return res.status(409).json({
                success: false,
                message: 'A customer with this phone number already exists'
            });
        }

        const customer = await Customer.create({
            name,
            phone,
            email,
            address
        });

        res.status(201).json({
            success: true,
            message: 'Customer registered successfully',
            data: customer
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// READ ALL CUSTOMERS
const getCustomers = async (req, res) => {
    try {
        const customers = await Customer.find()
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: customers.length,
            data: customers
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// READ ONE CUSTOMER
const getCustomerById = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        res.status(200).json({
            success: true,
            data: customer
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Invalid customer ID'
        });
    }
};

// UPDATE CUSTOMER
const updateCustomer = async (req, res) => {
    try {
        const allowedFields = [
            'name',
            'phone',
            'email',
            'address',
            'loyaltyPoints'
        ];
        const updates = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        }

        const customer = await Customer.findByIdAndUpdate(
            req.params.id,
            updates,
            {
                new: true,
                runValidators: true
            }
        );

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Customer updated successfully',
            data: customer
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// DELETE CUSTOMER
const deleteCustomer = async (req, res) => {
    try {
        const customer = await Customer.findByIdAndDelete(req.params.id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Customer deleted successfully'
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Invalid customer ID'
        });
    }
};

module.exports = {
    getOwnCustomer,
    updateOwnCustomer,
    createCustomer,
    getCustomers,
    getCustomerById,
    updateCustomer,
    deleteCustomer
};