const express = require('express');
const router = express.Router();
const {
  createClub,
  getClubs,
  getAdminClubs,
  approveClub,
  rejectClub,
  joinClub,
  leaveClub,
  getClubMembers,
  getMyJoinedClubs,
  getMyClub,
  updateClubLogo,
  deleteClubLogo,
  removeClubMember,
} = require('../controllers/clubController');
const { protect, authorize } = require('../middleware/auth');

// Public view clubs
router.get('/', getClubs);

// Protected routes
router.post('/', protect, createClub);
router.get('/my/joined', protect, getMyJoinedClubs);
router.get('/my-club', protect, authorize('clubHead'), getMyClub);
router.get('/admin/all', protect, authorize('admin'), getAdminClubs);
router.put('/:id/approve', protect, authorize('admin'), approveClub);
router.put('/:id/reject', protect, authorize('admin'), rejectClub);
router.post('/:id/join', protect, joinClub);
router.post('/:id/leave', protect, leaveClub);
router.get('/:id/members', protect, getClubMembers);
router.delete('/:id/members/:userId', protect, authorize('clubHead', 'admin'), removeClubMember);

// Logo management routes (Club Head or Admin)
router.put('/:id/logo', protect, authorize('clubHead', 'admin'), updateClubLogo);
router.delete('/:id/logo', protect, authorize('clubHead', 'admin'), deleteClubLogo);

module.exports = router;
