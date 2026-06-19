const crypto = require('crypto');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Club = require('../models/Club');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ClubMembership = require('../models/ClubMembership');
const { sendEventRegistrationEmail } = require('../services/emailService');

const autoCompletePastEvents = async () => {
  try {
    const now = new Date();
    await Event.updateMany(
      { date: { $lt: now }, status: 'upcoming' },
      { $set: { status: 'completed' } }
    );
  } catch (err) {
    console.error('Failed to auto-complete past events:', err.message);
  }
};

// @desc    Create a new event
// @route   POST /api/events
// @access  Private/ClubHead/Admin
exports.createEvent = async (req, res, next) => {
  try {
    const { title, description, date, venue, maxParticipants, clubId } = req.body;

    if (!title || !description || !date || !venue || !clubId) {
      return res.status(400).json({ success: false, message: 'Please provide title, description, date, venue, and clubId' });
    }

    // Verify user is president of the club or admin
    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({ success: false, message: 'Club not found' });
    }

    if (req.user.role !== 'admin' && club.president.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You are not authorized to create events for this club' });
    }

    // Generate secure QR token
    const qrCodeToken = crypto.randomBytes(24).toString('hex');

    const event = await Event.create({
      title,
      description,
      date,
      venue,
      maxParticipants: maxParticipants || 100,
      clubId,
      createdBy: req.user.id,
      status: 'upcoming',
      qrCodeToken,
    });

    // Notify club members about the new event
    const memberships = await ClubMembership.find({ clubId }).populate('userId');
    for (const membership of memberships) {
      if (membership.userId) {
        await Notification.create({
          userId: membership.userId._id,
          title: `New Event in ${club.clubName}`,
          message: `The event "${title}" has been scheduled for ${new Date(date).toLocaleDateString()}. Register now!`,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all events with search, filter, pagination
// @route   GET /api/events
// @access  Public
exports.getEvents = async (req, res, next) => {
  try {
    await autoCompletePastEvents();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    const skip = (page - 1) * limit;

    const query = {};

    // Search by title or description
    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    // Filter by Club
    if (req.query.clubId) {
      query.clubId = req.query.clubId;
    }

    // Filter by Timeline (upcoming vs past)
    if (req.query.timeline) {
      const now = new Date();
      if (req.query.timeline === 'upcoming') {
        query.date = { $gte: now };
        query.status = 'upcoming';
      } else if (req.query.timeline === 'past') {
        query.date = { $lt: now };
      }
    }

    // Filter by specific status
    if (req.query.status) {
      query.status = req.query.status;
    }

    const events = await Event.find(query)
      .populate('clubId', 'clubName logo')
      .skip(skip)
      .limit(limit)
      .sort({ date: req.query.timeline === 'past' ? -1 : 1 });

    const total = await Event.countDocuments(query);

    res.status(200).json({
      success: true,
      count: events.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalEvents: total,
      events,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single event details
// @route   GET /api/events/:id
// @access  Public
exports.getEventDetails = async (req, res, next) => {
  try {
    await autoCompletePastEvents();
    const event = await Event.findById(req.params.id)
      .populate('clubId', 'clubName logo facultyCoordinator president')
      .populate('createdBy', 'name email');

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check how many students registered
    const registrationsCount = await Registration.countDocuments({ eventId: event._id, status: 'registered' });

    res.status(200).json({
      success: true,
      event,
      registrationsCount,
      slotsLeft: Math.max(0, event.maxParticipants - registrationsCount),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update event details
// @route   PUT /api/events/:id
// @access  Private/ClubHead/Admin
exports.updateEvent = async (req, res, next) => {
  try {
    let event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Verify auth: owner or admin
    const club = await Club.findById(event.clubId);
    const isOwner = club && club.president.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this event' });
    }

    // Update status if provided and set complete
    if (req.body.status && req.body.status === 'completed') {
      event.status = 'completed';
    }

    event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      event,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private/ClubHead/Admin
exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Verify auth: owner or admin
    const club = await Club.findById(event.clubId);
    const isOwner = club && club.president.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this event' });
    }

    // Delete all registrations for this event
    await Registration.deleteMany({ eventId: event._id });
    await event.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register for an event
// @route   POST /api/events/:id/register
// @access  Private
exports.registerForEvent = async (req, res, next) => {
  try {
    await autoCompletePastEvents();
    const event = await Event.findById(req.params.id).populate('clubId', 'clubName');

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.status !== 'upcoming') {
      return res.status(400).json({ success: false, message: 'Cannot register. This event is not upcoming.' });
    }

    // Check if seats are full
    const registrationsCount = await Registration.countDocuments({ eventId: event._id, status: 'registered' });
    if (registrationsCount >= event.maxParticipants) {
      return res.status(400).json({ success: false, message: 'Event is fully booked' });
    }

    // Check if already registered
    const existingRegistration = await Registration.findOne({
      studentId: req.user.id,
      eventId: event._id,
    });

    if (existingRegistration) {
      if (existingRegistration.status === 'registered') {
        return res.status(400).json({ success: false, message: 'You are already registered for this event' });
      } else {
        // Reactivate registration
        existingRegistration.status = 'registered';
        existingRegistration.registrationDate = Date.now();
        await existingRegistration.save();

        // Send registration email
        sendEventRegistrationEmail(req.user.email, req.user.name, event.title, event.date, event.venue);

        return res.status(200).json({
          success: true,
          message: 'Registration re-activated successfully',
          registration: existingRegistration,
        });
      }
    }

    const registration = await Registration.create({
      studentId: req.user.id,
      eventId: event._id,
    });

    // Send registration email
    sendEventRegistrationEmail(req.user.email, req.user.name, event.title, event.date, event.venue);

    // Create system notification
    await Notification.create({
      userId: req.user.id,
      title: 'Event Registration Confirmed',
      message: `You registered for "${event.title}" on ${new Date(event.date).toLocaleDateString()} at ${event.venue}.`,
    });

    res.status(201).json({
      success: true,
      message: 'Registered for event successfully',
      registration,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel registration for an event
// @route   POST /api/events/:id/cancel-registration
// @access  Private
exports.cancelRegistration = async (req, res, next) => {
  try {
    const registration = await Registration.findOne({
      studentId: req.user.id,
      eventId: req.params.id,
    });

    if (!registration) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    registration.status = 'cancelled';
    await registration.save();

    res.status(200).json({
      success: true,
      message: 'Registration cancelled successfully',
      registration,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all registrations of current student user
// @route   GET /api/events/my-registrations
// @access  Private
exports.getRegisteredEvents = async (req, res, next) => {
  try {
    await autoCompletePastEvents();
    const registrations = await Registration.find({
      studentId: req.user.id,
      status: 'registered',
    }).populate({
      path: 'eventId',
      populate: { path: 'clubId', select: 'clubName logo' },
    });

    res.status(200).json({
      success: true,
      count: registrations.length,
      registrations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all registrations for a specific event (Club Head / Admin)
// @route   GET /api/events/:id/registrations
// @access  Private/ClubHead/Admin
exports.getRegistrationsForEvent = async (req, res, next) => {
  try {
    await autoCompletePastEvents();
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const registrations = await Registration.find({ eventId: req.params.id })
      .populate('studentId', 'name email profilePicture')
      .sort({ registrationDate: -1 });

    res.status(200).json({
      success: true,
      count: registrations.length,
      registrations,
    });
  } catch (error) {
    next(error);
  }
};
