const User = require('../models/User');
const Club = require('../models/Club');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

// @desc    Get all users (with query search and pagination)
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const searchQuery = req.query.search
      ? {
          $or: [
            { name: { $regex: req.query.search, $options: 'i' } },
            { email: { $regex: req.query.search, $options: 'i' } },
          ],
        }
      : {};

    const roleFilter = req.query.role ? { role: req.query.role } : {};

    const query = { ...searchQuery, ...roleFilter };

    const users = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalUsers: total,
      users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Promote or demote user roles
// @route   PUT /api/users/:id/role
// @access  Private/Admin
exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    if (!role || !['student', 'clubHead', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid role' });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Do not allow demoting the last admin
    if (user.role === 'admin' && role !== 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot demote the only remaining administrator.' });
      }
    }

    user.role = role;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User role updated successfully to ${role}`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard analytics (system-wide stats)
// @route   GET /api/users/dashboard/stats
// @access  Private/Admin
exports.getAdminStats = async (req, res, next) => {
  try {
    // Auto-complete events whose date has passed
    const now = new Date();
    await Event.updateMany(
      { date: { $lt: now }, status: 'upcoming' },
      { $set: { status: 'completed' } }
    );

    const totalUsers = await User.countDocuments();
    const studentsCount = await User.countDocuments({ role: 'student' });
    const clubHeadsCount = await User.countDocuments({ role: 'clubHead' });
    const adminsCount = await User.countDocuments({ role: 'admin' });

    const totalClubs = await Club.countDocuments();
    const approvedClubs = await Club.countDocuments({ status: 'approved' });
    const pendingClubs = await Club.countDocuments({ status: 'pending' });

    const totalEvents = await Event.countDocuments();
    const upcomingEvents = await Event.countDocuments({ status: 'upcoming' });
    const completedEvents = await Event.countDocuments({ status: 'completed' });

    const totalRegistrations = await Registration.countDocuments();

    // Group registrations by event to get popular events
    const popularEvents = await Registration.aggregate([
      { $group: { _id: '$eventId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'events',
          localField: '_id',
          foreignField: '_id',
          as: 'eventDetails',
        },
      },
      { $unwind: '$eventDetails' },
      {
        $project: {
          _id: 1,
          count: 1,
          title: '$eventDetails.title',
        },
      },
    ]);

    res.status(200).json({
      success: true,
      stats: {
        users: { total: totalUsers, students: studentsCount, clubHeads: clubHeadsCount, admins: adminsCount },
        clubs: { total: totalClubs, approved: approvedClubs, pending: pendingClubs },
        events: { total: totalEvents, upcoming: upcomingEvents, completed: completedEvents },
        registrations: { total: totalRegistrations },
        popularEvents,
      },
    });
  } catch (error) {
    next(error);
  }
};
