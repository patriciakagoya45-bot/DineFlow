const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
    {
        orderNumber: {
            type: String,
            required: true,
            unique: true
        },

        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            required: true
        },

        servedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },

        items: [
            {
                menuItem: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'MenuItem',
                    required: true
                },

                name: {
                    type: String,
                    required: true
                },

                quantity: {
                    type: Number,
                    required: true,
                    min: 1
                },

                unitPrice: {
                    type: Number,
                    required: true,
                    min: 0
                },

                subtotal: {
                    type: Number,
                    required: true,
                    min: 0
                }
            }
        ],

        totalAmount: {
            type: Number,
            required: true,
            min: 0
        },

        orderType: {
            type: String,
            enum: ['dine-in', 'takeaway', 'delivery'],
            default: 'dine-in'
        },

        tableNumber: {
            type: String
        },

        guestCount: {
            type: Number,
            min: 1,
            default: 1
        },

        status: {
            type: String,
            enum: ['pending', 'preparing', 'ready', 'completed', 'cancelled'],
            default: 'pending'
        },

        notes: {
            type: String
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Order', orderSchema);