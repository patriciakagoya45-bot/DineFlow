const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');

// CREATE MENU ITEM
const createMenuItem = async (req, res) => {
    try {
        const {
            name,
            description,
            category,
            price,
            image,
            preparationTime
        } = req.body;

        if (!name || !category || price === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Name, category and price are required'
            });
        }

        if (!Number.isFinite(Number(price)) || Number(price) < 0) {
            return res.status(400).json({
                success: false,
                message: 'Price must be a valid non-negative number'
            });
        }

        const categoryExists = await Category.findById(category);

        if (!categoryExists) {
            return res.status(404).json({
                success: false,
                message: 'Selected category does not exist'
            });
        }

        const menuItem = await MenuItem.create({
            name,
            description,
            category,
            price,
            image,
            preparationTime
        });

        res.status(201).json({
            success: true,
            message: 'Menu item created successfully',
            data: menuItem
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// READ ALL MENU ITEMS
const getMenuItems = async (req, res) => {
    try {
        const menuItems = await MenuItem.find()
            .populate('category', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: menuItems.length,
            data: menuItems
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// READ ONE MENU ITEM
const getMenuItemById = async (req, res) => {
    try {
        const menuItem = await MenuItem.findById(req.params.id)
            .populate('category', 'name');

        if (!menuItem) {
            return res.status(404).json({
                success: false,
                message: 'Menu item not found'
            });
        }

        res.status(200).json({
            success: true,
            data: menuItem
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Invalid menu item ID'
        });
    }
};

// UPDATE MENU ITEM
const updateMenuItem = async (req, res) => {
    try {
        if (req.body.category) {
            const categoryExists = await Category.findById(req.body.category);

            if (!categoryExists) {
                return res.status(404).json({
                    success: false,
                    message: 'Selected category does not exist'
                });
            }
        }

        const menuItem = await MenuItem.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        ).populate('category', 'name');

        if (!menuItem) {
            return res.status(404).json({
                success: false,
                message: 'Menu item not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Menu item updated successfully',
            data: menuItem
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// DELETE MENU ITEM
const deleteMenuItem = async (req, res) => {
    try {
        const menuItem = await MenuItem.findByIdAndDelete(req.params.id);

        if (!menuItem) {
            return res.status(404).json({
                success: false,
                message: 'Menu item not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Menu item deleted successfully'
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Invalid menu item ID'
        });
    }
};

module.exports = {
    createMenuItem,
    getMenuItems,
    getMenuItemById,
    updateMenuItem,
    deleteMenuItem
};