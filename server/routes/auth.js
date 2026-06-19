const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfilePicture, deleteProfilePicture, updateProfile, deleteAccount } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/profile/image', protect, updateProfilePicture);
router.delete('/profile/image', protect, deleteProfilePicture);
router.delete('/account', protect, deleteAccount);

module.exports = router;
