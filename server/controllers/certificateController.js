const Certificate = require('../models/Certificate');
const Attendance = require('../models/Attendance');
const Event = require('../models/Event');
const User = require('../models/User');
const Club = require('../models/Club');
const { generateCertificatePDF } = require('../services/pdfService');

// @desc    Get certificates of current logged in student
// @route   GET /api/certificates
// @access  Private
exports.getCertificates = async (req, res, next) => {
  try {
    const certificates = await Certificate.find({ studentId: req.user.id })
      .populate({
        path: 'eventId',
        select: 'title date venue',
        populate: { path: 'clubId', select: 'clubName' },
      });

    res.status(200).json({
      success: true,
      count: certificates.length,
      certificates,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download certificate as PDF — marks certificateReceived = true on Attendance
// @route   GET /api/certificates/download/:eventId/:studentId
// @access  Private
exports.downloadCertificate = async (req, res, next) => {
  try {
    const { eventId, studentId } = req.params;

    // Enforce authorization: user is downloading their own certificate, or is admin/clubHead
    const isSelf = req.user.id === studentId;
    const isAuthorizedRole = ['admin', 'clubHead'].includes(req.user.role);

    if (!isSelf && !isAuthorizedRole) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied. You are not authorized to download this certificate.',
      });
    }

    // Verify student attended the event
    const attendance = await Attendance.findOne({ studentId, eventId, present: true });

    if (!attendance) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied. Student has not attended this event or attendance is not marked.',
      });
    }

    // Fetch details
    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    const club = await Club.findById(event.clubId);
    if (!club) return res.status(404).json({ success: false, message: 'Organizer club not found.' });

    // ── Mark certificate as received on Attendance record ──────────────────
    if (!attendance.certificateReceived) {
      attendance.certificateReceived = true;
      await attendance.save();
    }

    // ── Mark downloadedAt on Certificate record ────────────────────────────
    await Certificate.findOneAndUpdate(
      { studentId, eventId },
      { $setOnInsert: { downloadedAt: null }, $set: { downloadedAt: new Date() } },
      { upsert: false }
    ).catch(() => {});

    // Set Response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Certificate_${event.title.replace(/\s+/g, '_')}.pdf`
    );

    // Stream PDF directly to HTTP response
    generateCertificatePDF(student.name, event.title, club.clubName, event.date, res);
  } catch (error) {
    console.error('Error generating PDF download:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate PDF' });
    }
  }
};
