const crypto = require('crypto');
const QRCode = require('qrcode');
const ExcelJS = require('exceljs');
const Event = require('../models/Event');
const Attendance = require('../models/Attendance');
const Registration = require('../models/Registration');
const Certificate = require('../models/Certificate');
const Notification = require('../models/Notification');
const Club = require('../models/Club');
const User = require('../models/User');

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Build a unified roster for an event:
 * all registered students + their attendance + certificate status
 */
const buildRoster = async (eventId) => {
  const [registrations, attendanceLogs, certificates] = await Promise.all([
    Registration.find({ eventId, status: 'registered' }).populate(
      'studentId',
      'name email profilePicture rollNumber department'
    ),
    Attendance.find({ eventId }),
    Certificate.find({ eventId }),
  ]);

  const attendanceMap = new Map(
    attendanceLogs.map((a) => [a.studentId.toString(), a])
  );
  const certMap = new Map(
    certificates.map((c) => [c.studentId.toString(), c])
  );

  return registrations
    .filter((reg) => reg.studentId) // skip orphaned registrations where user was deleted
    .map((reg, idx) => {
      const student = reg.studentId;
      const attendanceRecord = attendanceMap.get(student._id.toString());
      const certRecord = certMap.get(student._id.toString());
      return {
        sNo: idx + 1,
        studentId: student._id,
        name: student.name,
        email: student.email,
        rollNumber: student.rollNumber || '—',
        department: student.department || '—',
        profilePicture: student.profilePicture,
        registrationDate: reg.registrationDate,
        present: !!attendanceRecord,
        attendanceTime: attendanceRecord ? attendanceRecord.attendanceTime : null,
        certificateReceived: attendanceRecord
          ? attendanceRecord.certificateReceived
          : false,
        certificateDownloadedAt: certRecord ? certRecord.downloadedAt : null,
      };
    });
};

// ─── QR Code ────────────────────────────────────────────────────────────────

// In-memory OTP store: eventId → { code, expiresAt }
const otpStore = new Map();

/**
 * Generate a 6-digit numeric OTP for an event.
 * Reuses existing OTP if it hasn't expired yet, otherwise creates a new one.
 */
const generateEventOTP = (eventId) => {
  const existing = otpStore.get(eventId);
  if (existing && existing.expiresAt > Date.now()) {
    return existing;
  }
  const code = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
  const otp = { code, expiresAt: Date.now() + 60 * 1000 }; // 60 second lifetime
  otpStore.set(eventId, otp);
  return otp;
};

// @desc    Generate QR Code + OTP for an event
// @route   GET /api/attendance/event/:id/qrcode
// @access  Private/ClubHead/Admin
exports.getQRCode = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Verify ownership
    const club = await Club.findById(event.clubId);
    if (req.user.role !== 'admin' && (!club || club.president.toString() !== req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // If token doesn't exist, generate one
    if (!event.qrCodeToken) {
      event.qrCodeToken = crypto.randomBytes(24).toString('hex');
      await event.save();
    }

    // Build time-windowed HMAC token (rotates every 15 seconds)
    const timeWindow = Math.floor(Date.now() / 15000);
    const secret = process.env.QR_SECRET || 'qr_fallback_secret';
    const dynamicToken = crypto
      .createHmac('sha256', secret)
      .update(`${event._id}:${event.qrCodeToken}:${timeWindow}`)
      .digest('hex');

    const qrPayload = JSON.stringify({
      eventId: event._id,
      token: dynamicToken,
      window: timeWindow,
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 300,
      margin: 2,
    });

    // Generate OTP for manual entry
    const otp = generateEventOTP(event._id.toString());
    const otpSecondsLeft = Math.max(0, Math.ceil((otp.expiresAt - Date.now()) / 1000));

    res.status(200).json({
      success: true,
      qrCode: qrCodeDataUrl,
      otp: otp.code,
      otpExpiresIn: otpSecondsLeft,
      eventTitle: event.title,
    });
  } catch (error) {
    next(error);
  }
};

// ─── OTP Verification ────────────────────────────────────────────────────────

// @desc    Verify 6-digit OTP and mark attendance
// @route   POST /api/attendance/verify-otp
// @access  Private/Student
exports.verifyOTP = async (req, res, next) => {
  try {
    const { eventId, otp } = req.body;

    if (!eventId || !otp) {
      return res.status(400).json({ success: false, message: 'Event ID and OTP code are required.' });
    }

    // Validate OTP
    const stored = otpStore.get(eventId);
    if (!stored || stored.expiresAt < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Ask your coordinator for the latest code.',
      });
    }

    if (stored.code !== otp.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP code. Please check and try again.',
      });
    }

    // Ensure student is registered
    const registration = await Registration.findOne({
      studentId: req.user.id,
      eventId,
      status: 'registered',
    });

    if (!registration) {
      return res.status(400).json({
        success: false,
        message: 'You must be registered for this event to check in.',
      });
    }

    // Check if already checked in
    const alreadyAttended = await Attendance.findOne({
      studentId: req.user.id,
      eventId,
    });

    if (alreadyAttended) {
      return res.status(200).json({
        success: true,
        message: 'Attendance already recorded for this event.',
        alreadyMarked: true,
      });
    }

    // Fetch event title for response
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Log attendance
    await Attendance.create({
      studentId: req.user.id,
      eventId,
      present: true,
      attendanceTime: new Date(),
    });

    // Issue certificate record
    const downloadUrl = `/api/certificates/download/${eventId}/${req.user.id}`;
    await Certificate.create({
      studentId: req.user.id,
      eventId,
      certificateUrl: downloadUrl,
    }).catch((err) => console.log('Certificate already exists:', err.message));

    // Notification
    await Notification.create({
      userId: req.user.id,
      title: 'Attendance Marked!',
      message: `Your attendance for "${event.title}" has been verified. Certificate is now available!`,
    });

    res.status(200).json({
      success: true,
      message: `Attendance marked successfully for: ${event.title}`,
    });
  } catch (error) {
    next(error);
  }
};

// ─── QR Scan / Mark Attendance ───────────────────────────────────────────────

// @desc    Mark attendance via QR code scan
// @route   POST /api/attendance/scan
// @access  Private/Student
exports.markAttendance = async (req, res, next) => {
  try {
    const { qrPayload } = req.body;

    if (!qrPayload) {
      return res.status(400).json({ success: false, message: 'QR payload is required' });
    }

    let parsed;
    try {
      parsed = JSON.parse(qrPayload);
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid QR code format' });
    }

    const { eventId, token, window: qrWindow } = parsed;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Validate dynamic token (allow ±1 window to account for clock drift)
    const secret = process.env.QR_SECRET || 'qr_fallback_secret';
    const currentWindow = Math.floor(Date.now() / 15000);
    let isValid = false;

    for (const w of [currentWindow - 1, currentWindow]) {
      const expected = crypto
        .createHmac('sha256', secret)
        .update(`${event._id}:${event.qrCodeToken}:${w}`)
        .digest('hex');
      if (crypto.timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expected, 'hex'))) {
        isValid = true;
        break;
      }
    }

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'QR code has expired or is invalid. Please ask the coordinator to refresh.',
      });
    }

    // Ensure student is registered
    const registration = await Registration.findOne({
      studentId: req.user.id,
      eventId: event._id,
      status: 'registered',
    });

    if (!registration) {
      return res.status(400).json({
        success: false,
        message: 'You must be registered for this event to check in.',
      });
    }

    // Check if already checked in
    const alreadyAttended = await Attendance.findOne({
      studentId: req.user.id,
      eventId: event._id,
    });

    if (alreadyAttended) {
      return res.status(400).json({
        success: true,
        message: 'Attendance already recorded for this event.',
        alreadyMarked: true,
      });
    }

    // Log attendance
    const attendance = await Attendance.create({
      studentId: req.user.id,
      eventId: event._id,
      present: true,
      attendanceTime: new Date(),
    });

    // Automatically issue certificate record
    const downloadUrl = `/api/certificates/download/${event._id}/${req.user.id}`;
    await Certificate.create({
      studentId: req.user.id,
      eventId: event._id,
      certificateUrl: downloadUrl,
    }).catch((err) => console.log('Certificate already exists:', err.message));

    // Send notification
    await Notification.create({
      userId: req.user.id,
      title: 'Attendance Marked!',
      message: `Your attendance for "${event.title}" has been verified. Certificate is now available for download!`,
    });

    res.status(200).json({
      success: true,
      message: `Attendance marked successfully for event: ${event.title}`,
      attendance,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Manual Check-in ─────────────────────────────────────────────────────────

// @desc    Manual check-in of a student by Club Head / Admin
// @route   POST /api/attendance/event/:id/manual-checkin
// @access  Private/ClubHead/Admin
exports.markStudentPresentManual = async (req, res, next) => {
  try {
    const { studentEmail } = req.body;

    if (!studentEmail) {
      return res.status(400).json({ success: false, message: 'Please provide student email' });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const student = await User.findOne({ email: studentEmail, role: 'student' });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student with this email not found' });
    }

    const registration = await Registration.findOne({
      studentId: student._id,
      eventId: event._id,
      status: 'registered',
    });

    if (!registration) {
      await Registration.create({ studentId: student._id, eventId: event._id });
    }

    const alreadyAttended = await Attendance.findOne({
      studentId: student._id,
      eventId: event._id,
    });

    if (alreadyAttended) {
      return res.status(400).json({ success: false, message: 'Student attendance already marked.' });
    }

    await Attendance.create({
      studentId: student._id,
      eventId: event._id,
      present: true,
      attendanceTime: new Date(),
    });

    const downloadUrl = `/api/certificates/download/${event._id}/${student._id}`;
    await Certificate.create({
      studentId: student._id,
      eventId: event._id,
      certificateUrl: downloadUrl,
    }).catch(() => {});

    await Notification.create({
      userId: student._id,
      title: 'Attendance Marked (Manual)',
      message: `Your attendance for "${event.title}" has been manually marked by the coordinator.`,
    });

    res.status(200).json({ success: true, message: 'Student checked in successfully' });
  } catch (error) {
    next(error);
  }
};

// ─── Attendance Report (JSON) ─────────────────────────────────────────────────

// @desc    Get full attendance report for an event
// @route   GET /api/attendance/event/:id/report
// @access  Private/ClubHead/Admin
exports.getAttendanceReport = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).populate('clubId');
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (req.user.role !== 'admin' && (!event.clubId || event.clubId.president.toString() !== req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this report' });
    }

    const roster = await buildRoster(event._id);
    const presentCount = roster.filter((r) => r.present).length;
    const certIssuedCount = roster.filter((r) => r.certificateReceived).length;

    res.status(200).json({
      success: true,
      event: {
        _id: event._id,
        title: event.title,
        date: event.date,
        venue: event.venue,
        clubName: event.clubId?.clubName,
      },
      stats: {
        totalRegistered: roster.length,
        totalPresent: presentCount,
        totalAbsent: roster.length - presentCount,
        attendancePercentage:
          roster.length > 0 ? ((presentCount / roster.length) * 100).toFixed(1) : '0.0',
        certificatesIssued: certIssuedCount,
      },
      report: roster,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Excel Export ─────────────────────────────────────────────────────────────

// @desc    Export attendance report as Excel (.xlsx)
// @route   GET /api/attendance/event/:id/export-excel
// @access  Private/ClubHead/Admin
exports.exportAttendanceExcel = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).populate('clubId');
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (req.user.role !== 'admin' && (!event.clubId || event.clubId.president.toString() !== req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const roster = await buildRoster(event._id);
    const presentCount = roster.filter((r) => r.present).length;
    const attendancePct =
      roster.length > 0 ? ((presentCount / roster.length) * 100).toFixed(1) : '0.0';

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'University Portal';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Attendance Report', {
      pageSetup: { paperSize: 9, orientation: 'landscape' },
    });

    // ── Title block ──────────────────────────────────────────────────────────
    sheet.mergeCells('A1:I1');
    sheet.getCell('A1').value = `Attendance Report — ${event.title}`;
    sheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF0F172A' } };
    sheet.getCell('A1').alignment = { horizontal: 'center' };
    sheet.getCell('A1').fill = {
      type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' },
    };

    sheet.mergeCells('A2:I2');
    sheet.getCell('A2').value =
      `Club: ${event.clubId?.clubName || '—'}   |   Venue: ${event.venue}   |   Date: ${new Date(event.date).toLocaleDateString('en-IN', { dateStyle: 'long' })}`;
    sheet.getCell('A2').font = { size: 10, color: { argb: 'FF475569' } };
    sheet.getCell('A2').alignment = { horizontal: 'center' };

    sheet.mergeCells('A3:I3');
    sheet.getCell('A3').value =
      `Total Registered: ${roster.length}   |   Present: ${presentCount}   |   Absent: ${roster.length - presentCount}   |   Attendance: ${attendancePct}%`;
    sheet.getCell('A3').font = { bold: true, size: 10, color: { argb: 'FF10B981' } };
    sheet.getCell('A3').alignment = { horizontal: 'center' };

    sheet.addRow([]); // spacer

    // ── Column headers ───────────────────────────────────────────────────────
    const headerRow = sheet.addRow([
      'S.No',
      'Student Name',
      'Roll Number',
      'Email',
      'Department',
      'Event Name',
      'Attendance Status',
      'Attendance Time',
      'Certificate Received',
    ]);

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1FAE5' } },
        bottom: { style: 'thin', color: { argb: 'FFD1FAE5' } },
        left: { style: 'thin', color: { argb: 'FFD1FAE5' } },
        right: { style: 'thin', color: { argb: 'FFD1FAE5' } },
      };
    });

    // ── Data rows ────────────────────────────────────────────────────────────
    roster.forEach((student, idx) => {
      const row = sheet.addRow([
        student.sNo,
        student.name,
        student.rollNumber,
        student.email,
        student.department,
        event.title,
        student.present ? 'Present' : 'Absent',
        student.attendanceTime
          ? new Date(student.attendanceTime).toLocaleTimeString('en-IN', {
              hour: '2-digit', minute: '2-digit', hour12: true,
            })
          : '—',
        student.certificateReceived ? 'Yes' : 'No',
      ]);

      const isEven = idx % 2 === 0;
      row.eachCell((cell, colNumber) => {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { size: 9 };
        cell.fill = {
          type: 'pattern', pattern: 'solid',
          fgColor: { argb: isEven ? 'FFF8FAFC' : 'FFFFFFFF' },
        };
        cell.border = {
          bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } },
          left: { style: 'hair', color: { argb: 'FFE2E8F0' } },
          right: { style: 'hair', color: { argb: 'FFE2E8F0' } },
        };
        // Color Attendance Status column
        if (colNumber === 7) {
          cell.font = {
            bold: true, size: 9,
            color: { argb: student.present ? 'FF059669' : 'FFDC2626' },
          };
        }
        // Color Certificate column
        if (colNumber === 9) {
          cell.font = {
            bold: true, size: 9,
            color: { argb: student.certificateReceived ? 'FF059669' : 'FF94A3B8' },
          };
        }
      });
    });

    // ── Auto-size columns ────────────────────────────────────────────────────
    const colWidths = [6, 28, 14, 32, 18, 28, 18, 16, 20];
    colWidths.forEach((width, i) => {
      sheet.getColumn(i + 1).width = width;
    });

    // ── Freeze header rows ───────────────────────────────────────────────────
    sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 5 }];

    // ── Stream response ──────────────────────────────────────────────────────
    const safeTitle = event.title.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Attendance_${safeTitle}_${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel export error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate Excel report' });
    }
  }
};

// ─── CSV Export ───────────────────────────────────────────────────────────────

// @desc    Export attendance report as CSV
// @route   GET /api/attendance/event/:id/export-csv
// @access  Private/ClubHead/Admin
exports.exportAttendanceCSV = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).populate('clubId');
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (req.user.role !== 'admin' && (!event.clubId || event.clubId.president.toString() !== req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const roster = await buildRoster(event._id);

    const escape = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const header = [
      'S.No', 'Student Name', 'Roll Number', 'Email', 'Department',
      'Event Name', 'Attendance Status', 'Attendance Time', 'Certificate Received',
    ].map(escape).join(',');

    const rows = roster.map((s) =>
      [
        s.sNo,
        s.name,
        s.rollNumber,
        s.email,
        s.department,
        event.title,
        s.present ? 'Present' : 'Absent',
        s.attendanceTime
          ? new Date(s.attendanceTime).toLocaleTimeString('en-IN', {
              hour: '2-digit', minute: '2-digit', hour12: true,
            })
          : '',
        s.certificateReceived ? 'Yes' : 'No',
      ].map(escape).join(',')
    );

    const csv = [header, ...rows].join('\r\n');
    const safeTitle = event.title.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Attendance_${safeTitle}_${Date.now()}.csv`
    );
    res.send('\uFEFF' + csv); // BOM for Excel UTF-8 compatibility
  } catch (error) {
    next(error);
  }
};
