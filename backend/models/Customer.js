
const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        phone: {
            type: String,
            required: true,
            unique: true
        },

        email: {
            type: String,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            select: false
        },

        address: {
            type: String
        },

        loyaltyPoints: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Customer', customerSchema);
