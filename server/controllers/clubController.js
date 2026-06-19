const Club = require('../models/Club');
const ClubMembership = require('../models/ClubMembership');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    Create a club request / Create club directly
// @route   POST /api/clubs
// @access  Private
exports.createClub = async (req, res, next) => {
  try {
    const { clubName, description, facultyCoordinator, logo, presidentId } = req.body;

    if (!clubName || !description || !facultyCoordinator) {
      return res.status(400).json({ success: false, message: 'Please provide club name, description, and faculty coordinator' });
    }

    // Determine president: admin can assign any user, user defaults to themselves
    const president = req.user.role === 'admin' && presidentId ? presidentId : req.user.id;

    // Check if club name already exists
    const clubExists = await Club.findOne({ clubName });
    if (clubExists) {
      return res.status(400).json({ success: false, message: 'Club name already exists' });
    }

    // Check if president exists
    const presidentUser = await User.findById(president);
    if (!presidentUser) {
      return res.status(404).json({ success: false, message: 'Club president user not found' });
    }

    // If Admin creates it, approve it automatically. Else, set to pending.
    const status = req.user.role === 'admin' ? 'approved' : 'pending';

    const club = await Club.create({
      clubName,
      description,
      logo,
      president,
      facultyCoordinator,
      status,
    });

    // If approved, verify and promote the president to clubHead
    if (status === 'approved') {
      if (presidentUser.role === 'student') {
        presidentUser.role = 'clubHead';
        await presidentUser.save();
      }
    }

    // Notify admins if pending
    if (status === 'pending') {
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await Notification.create({
          userId: admin._id,
          title: 'New Club Request',
          message: `User ${req.user.name} requested to create club "${clubName}".`,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: status === 'approved' ? 'Club created successfully' : 'Club request submitted. Awaiting admin approval.',
      club,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all approved clubs (Public / Student view)
// @route   GET /api/clubs
// @access  Public
exports.getClubs = async (req, res, next) => {
  try {
    const clubs = await Club.find({ status: 'approved' }).populate('president', 'name email profilePicture');
    res.status(200).json({
      success: true,
      count: clubs.length,
      clubs,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all clubs (Admin view)
// @route   GET /api/clubs/admin/all
// @access  Private/Admin
exports.getAdminClubs = async (req, res, next) => {
  try {
    const clubs = await Club.find().populate('president', 'name email profilePicture');
    res.status(200).json({
      success: true,
      count: clubs.length,
      clubs,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve a club request
// @route   PUT /api/clubs/:id/approve
// @access  Private/Admin
exports.approveClub = async (req, res, next) => {
  try {
    const club = await Club.findById(req.params.id);

    if (!club) {
      return res.status(404).json({ success: false, message: 'Club not found' });
    }

    club.status = 'approved';
    await club.save();

    // Promote president to clubHead if they are a student
    const president = await User.findById(club.president);
    if (president && president.role === 'student') {
      president.role = 'clubHead';
      await president.save();
    }

    // Notify president
    await Notification.create({
      userId: club.president,
      title: 'Club Request Approved',
      message: `Congratulations! Your request for club "${club.clubName}" has been approved. You are now the Club Head.`,
    });

    res.status(200).json({
      success: true,
      message: 'Club approved successfully',
      club,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject a club request
// @route   PUT /api/clubs/:id/reject
// @access  Private/Admin
exports.rejectClub = async (req, res, next) => {
  try {
    const club = await Club.findById(req.params.id);

    if (!club) {
      return res.status(404).json({ success: false, message: 'Club not found' });
    }

    club.status = 'rejected';
    await club.save();

    // Notify president
    await Notification.create({
      userId: club.president,
      title: 'Club Request Rejected',
      message: `We regret to inform you that your request for club "${club.clubName}" has been rejected.`,
    });

    res.status(200).json({
      success: true,
      message: 'Club rejected successfully',
      club,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Join a club
// @route   POST /api/clubs/:id/join
// @access  Private
exports.joinClub = async (req, res, next) => {
  try {
    const club = await Club.findById(req.params.id);

    if (!club || club.status !== 'approved') {
      return res.status(404).json({ success: false, message: 'Active club not found' });
    }

    // Check if already a member
    const existingMembership = await ClubMembership.findOne({
      userId: req.user.id,
      clubId: club._id,
    });

    if (existingMembership) {
      return res.status(400).json({ success: false, message: 'You are already a member of this club' });
    }

    const membership = await ClubMembership.create({
      userId: req.user.id,
      clubId: club._id,
    });

    res.status(201).json({
      success: true,
      message: `Joined club ${club.clubName} successfully`,
      membership,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Leave a club
// @route   POST /api/clubs/:id/leave
// @access  Private
exports.leaveClub = async (req, res, next) => {
  try {
    const club = await Club.findById(req.params.id);

    if (!club) {
      return res.status(404).json({ success: false, message: 'Club not found' });
    }

    const result = await ClubMembership.findOneAndDelete({
      userId: req.user.id,
      clubId: club._id,
    });

    if (!result) {
      return res.status(400).json({ success: false, message: 'You are not a member of this club' });
    }

    res.status(200).json({
      success: true,
      message: `Left club ${club.clubName} successfully`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get members of a club
// @route   GET /api/clubs/:id/members
// @access  Private
exports.getClubMembers = async (req, res, next) => {
  try {
    const memberships = await ClubMembership.find({ clubId: req.params.id }).populate('userId', 'name email profilePicture');
    const members = memberships.map((m) => m.userId);

    res.status(200).json({
      success: true,
      count: members.length,
      members,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all clubs joined by the logged in student
// @route   GET /api/clubs/my/joined
// @access  Private
exports.getMyJoinedClubs = async (req, res, next) => {
  try {
    const memberships = await ClubMembership.find({ userId: req.user.id });
    const joinedClubIds = memberships.map((m) => m.clubId.toString());

    res.status(200).json({
      success: true,
      joinedClubIds,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get club managed by current user (for Club Heads)
// @route   GET /api/clubs/my-club
// @access  Private
exports.getMyClub = async (req, res, next) => {
  try {
    const club = await Club.findOne({ president: req.user.id, status: 'approved' });

    if (!club) {
      return res.status(404).json({ success: false, message: 'No approved club found for this president.' });
    }

    res.status(200).json({
      success: true,
      club,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update club logo
// @route   PUT /api/clubs/:id/logo
// @access  Private (Club Head / Admin)
exports.updateClubLogo = async (req, res, next) => {
  try {
    const { logo } = req.body;
    if (!logo) {
      return res.status(400).json({ success: false, message: 'Please provide an image URL' });
    }

    let club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({ success: false, message: 'Club not found' });
    }

    // Ensure the user is admin or the club president
    if (club.president.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this club' });
    }

    club = await Club.findByIdAndUpdate(
      req.params.id,
      { logo },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Club logo updated successfully',
      club,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete club logo
// @route   DELETE /api/clubs/:id/logo
// @access  Private (Club Head / Admin)
exports.deleteClubLogo = async (req, res, next) => {
  try {
    let club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({ success: false, message: 'Club not found' });
    }

    // Ensure the user is admin or the club president
    if (club.president.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this club' });
    }

    club = await Club.findByIdAndUpdate(
      req.params.id,
      { logo: '' },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Club logo removed successfully',
      club,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove a member from a club (Club Head / Admin only)
// @route   DELETE /api/clubs/:id/members/:userId
// @access  Private (Club Head / Admin)
exports.removeClubMember = async (req, res, next) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({ success: false, message: 'Club not found' });
    }

    // Ensure the user is admin or the club president
    if (club.president.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to manage members of this club' });
    }

    const membership = await ClubMembership.findOneAndDelete({
      userId: req.params.userId,
      clubId: club._id,
    });

    if (!membership) {
      return res.status(404).json({ success: false, message: 'Member not found in this club' });
    }

    // Send a system notification to the student
    await Notification.create({
      userId: req.params.userId,
      title: 'Club Membership Cancelled',
      message: `You have been removed from the club "${club.clubName}".`,
    }).catch((err) => console.error('Notification creation failed:', err.message));

    res.status(200).json({
      success: true,
      message: 'Member removed successfully from the club',
    });
  } catch (error) {
    next(error);
  }
};
