const express = require('express');
const router = express.Router();
const {
  createEvent,
  getEvents,
  getEventDetails,
  updateEvent,
  deleteEvent,
  registerForEvent,
  cancelRegistration,
  getRegisteredEvents,
  getRegistrationsForEvent,
} = require('../controllers/eventController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', getEvents);
router.get('/:id', getEventDetails);

// Protected routes
router.post('/', protect, authorize('clubHead', 'admin'), createEvent);
router.get('/my/registrations', protect, getRegisteredEvents);
router.put('/:id', protect, authorize('clubHead', 'admin'), updateEvent);
router.delete('/:id', protect, authorize('clubHead', 'admin'), deleteEvent);
router.post('/:id/register', protect, registerForEvent);
router.post('/:id/cancel-registration', protect, cancelRegistration);
router.get('/:id/registrations', protect, authorize('clubHead', 'admin'), getRegistrationsForEvent);

module.exports = router;
