const Category = require('../models/Category');

// CREATE: Add a new category
const createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Category name is required'
            });
        }

        const existingCategory = await Category.findOne({
            name: name.trim()
        });

        if (existingCategory) {
            return res.status(409).json({
                success: false,
                message: 'This category already exists'
            });
        }

        const category = await Category.create({
            name: name.trim(),
            description
        });

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: category
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// READ: Get all categories
const getCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: categories.length,
            data: categories
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// READ: Get one category by ID
const getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.status(200).json({
            success: true,
            data: category
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Invalid category ID'
        });
    }
};

// UPDATE: Edit a category
const updateCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Category updated successfully',
            data: category
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// DELETE: Remove a category
const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Category deleted successfully'
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Invalid category ID'
        });
    }
};

module.exports = {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
};