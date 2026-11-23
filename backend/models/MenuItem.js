const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            trim: true
        },

        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: true
        },

        price: {
            type: Number,
            required: true,
            min: 0
        },

        image: {
            type: String,
            default: ''
        },

        availability: {
            type: String,
            enum: ['available', 'unavailable'],
            default: 'available'
        },

        preparationTime: {
            type: Number,
            default: 15,
            min: 0
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('MenuItem', menuItemSchema);