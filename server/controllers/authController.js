const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Registration = require('../models/Registration');
const Attendance = require('../models/Attendance');
const Certificate = require('../models/Certificate');
const ClubMembership = require('../models/ClubMembership');
const Notification = require('../models/Notification');
const { sendWelcomeEmail } = require('../services/emailService');

// Helper to sign JWT
const signToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// @desc    Register a new student user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
    }

    // Enforce college domain email validation
    if (!email.toLowerCase().endsWith('@college.edu')) {
      return res.status(400).json({
        success: false,
        message: 'Registration is restricted to official student emails ending with @college.edu',
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // Create user (defaults to student, role cannot be overridden through signup)
    const user = await User.create({
      name,
      email,
      password,
      role: 'student', // Enforce Student by default
    });

    const token = signToken(user._id);

    // Send asynchronous welcome email
    sendWelcomeEmail(user.email, user.name);

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // Get user and explicitly select password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = signToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user details
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile picture
// @route   PUT /api/auth/profile/image
// @access  Private
exports.updateProfilePicture = async (req, res, next) => {
  try {
    const { profilePicture } = req.body;
    if (!profilePicture) {
      return res.status(400).json({ success: false, message: 'Please provide an image URL' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePicture },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile picture updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user profile picture
// @route   DELETE /api/auth/profile/image
// @access  Private
exports.deleteProfilePicture = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePicture: '' },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile picture removed successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile details (name, rollNumber, department)
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, rollNumber, department } = req.body;
    const fieldsToUpdate = {};
    if (name !== undefined) fieldsToUpdate.name = name;
    if (rollNumber !== undefined) fieldsToUpdate.rollNumber = rollNumber;
    if (department !== undefined) fieldsToUpdate.department = department;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      fieldsToUpdate,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user account (only for student role, requires password verification)
// @route   DELETE /api/auth/account
// @access  Private
exports.deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: 'Please provide your password for verification.' });
    }

    // Only student role is allowed to self-delete this way
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only student accounts can be self-deleted.' });
    }

    // Fetch user with password selected for verification
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect password.' });
    }

    // Cascade delete: delete all associated records
    const userId = req.user.id;
    await Promise.all([
      Registration.deleteMany({ studentId: userId }),
      Attendance.deleteMany({ studentId: userId }),
      Certificate.deleteMany({ studentId: userId }),
      ClubMembership.deleteMany({ userId: userId }),
      Notification.deleteMany({ userId: userId }),
    ]);

    // Delete user
    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
