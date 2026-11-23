const RestaurantSettings = require('../models/RestaurantSettings');

async function getFloorSettings(req, res) {
    try {
        const settings = await RestaurantSettings.findOne({ key: 'default' }).select('tableCount');
        res.status(200).json({ success: true, data: { tableCount: settings?.tableCount || 20 } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

async function getSettings(req, res) {
    try {
        let settings = await RestaurantSettings.findOne({ key: 'default' });
        if (!settings) settings = await RestaurantSettings.create({ key: 'default' });
        res.status(200).json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

async function updateSettings(req, res) {
    try {
        const restaurantName = String(req.body.restaurantName || '').trim();
        const tableCount = Number(req.body.tableCount);
        if (!restaurantName || restaurantName.length > 100) {
            return res.status(400).json({ success: false, message: 'Enter a restaurant name up to 100 characters.' });
        }
        if (!Number.isInteger(tableCount) || tableCount < 1 || tableCount > 500) {
            return res.status(400).json({ success: false, message: 'Table count must be between 1 and 500.' });
        }
        const settings = await RestaurantSettings.findOneAndUpdate(
            { key: 'default' },
            { restaurantName, tableCount },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );
        res.status(200).json({ success: true, message: 'Settings saved.', data: settings });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
}

module.exports = { getFloorSettings, getSettings, updateSettings };