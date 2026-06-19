const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  attendanceTime: {
    type: Date,
    default: Date.now,
  },
  present: {
    type: Boolean,
    default: true,
  },
  certificateReceived: {
    type: Boolean,
    default: false,
  },
});

// Avoid duplicate attendance logs for same student/event
AttendanceSchema.index({ studentId: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
