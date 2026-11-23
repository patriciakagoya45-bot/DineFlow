
const express = require('express');
const router = express.Router();

const {
    createMenuItem,
    getMenuItems,
    getMenuItemById,
    updateMenuItem,
    deleteMenuItem
} = require('../controllers/menuItemController');

const { requireAuth, requireRole } = require('../middleware/auth');
const uploadMenuImage = require('../middleware/menuImageUpload');

// Only signed-in accounts can access menu items
router.use(requireAuth);

// VIEW MENU - all signed-in account types
router.get('/', getMenuItems);
router.get('/:id', getMenuItemById);
router.post('/upload-image', requireRole('admin', 'manager'), uploadMenuImage);

// MANAGE MENU - admin and manager only
router.post('/', requireRole('admin', 'manager'), createMenuItem);
router.put('/:id', requireRole('admin', 'manager'), updateMenuItem);
router.delete('/:id', requireRole('admin', 'manager'), deleteMenuItem);

module.exports = router;
