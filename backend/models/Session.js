const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
    {
        tokenHash: {
            type: String,
            required: true,
            unique: true
        },
        role: {
            type: String,
            required: true,
            enum: ['admin', 'manager', 'waiter', 'chef', 'customer']
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer'
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 }
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Session', sessionSchema);