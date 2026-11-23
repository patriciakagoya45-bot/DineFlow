const mongoose = require('mongoose');

const restaurantSettingsSchema = new mongoose.Schema(
    {
        key: { type: String, unique: true, default: 'default' },
        restaurantName: { type: String, required: true, trim: true, default: 'DineFlow Restaurant' },
        tableCount: { type: Number, min: 1, max: 500, default: 20 }
    },
    { timestamps: true }
);

module.exports = mongoose.model('RestaurantSettings', restaurantSettingsSchema);