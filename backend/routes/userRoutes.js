const express = require('express');
const router = express.Router();

const {
    createUser,
    getUsers,
    getUserById,
    updateUser,
    deleteUser
} = require('../controllers/userController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth, requireRole('admin', 'manager'));

router.post('/', requireRole('admin'), createUser);

router.get('/', getUsers);

router.get('/:id', getUserById);

router.put('/:id', requireRole('admin'), updateUser);

router.delete('/:id', requireRole('admin'), deleteUser);

module.exports = router;