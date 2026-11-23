const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
    {
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            required: true
        },

        amount: {
            type: Number,
            required: true,
            min: 0
        },

        paymentMethod: {
            type: String,
            enum: ['cash', 'mobile-money', 'card', 'bank-transfer'],
            required: true
        },

        transactionReference: {
            type: String,
            trim: true
        },

        paymentStatus: {
            type: String,
            enum: ['pending', 'successful', 'failed', 'refunded'],
            default: 'pending'
        },

        paymentDate: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Payment', paymentSchema);