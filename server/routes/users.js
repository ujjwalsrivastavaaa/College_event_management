const express = require('express');
const router = express.Router();
const { getUsers, updateUserRole, getAdminStats } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

// All routes here are protected and require Admin role
router.use(protect);

router.get('/', authorize('admin'), getUsers);
router.put('/:id/role', authorize('admin'), updateUserRole);
router.get('/dashboard/stats', authorize('admin'), getAdminStats);

module.exports = router;
