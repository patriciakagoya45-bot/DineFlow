
const express = require('express');
const router = express.Router();

const {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
} = require('../controllers/categoryController');

const { requireAuth, requireRole } = require('../middleware/auth');

// All users must sign in before accessing categories
router.use(requireAuth);

// VIEW CATEGORIES
router.get('/', getCategories);
router.get('/:id', getCategoryById);

// MANAGE CATEGORIES - admin and manager only
router.post('/', requireRole('admin', 'manager'), createCategory);
router.put('/:id', requireRole('admin', 'manager'), updateCategory);
router.delete('/:id', requireRole('admin', 'manager'), deleteCategory);

module.exports = router;
