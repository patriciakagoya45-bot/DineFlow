const express = require('express');
const { getFloorSettings, getSettings, updateSettings } = require('../controllers/settingsController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.get('/floor', requireAuth, requireRole('admin', 'manager'), getFloorSettings);
router.use(requireAuth, requireRole('admin'));
router.get('/', getSettings);
router.put('/', updateSettings);

module.exports = router;