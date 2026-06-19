const mongoose = require('mongoose');

const CertificateSchema = new mongoose.Schema({
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
  certificateUrl: {
    type: String,
    required: true,
  },
  issuedAt: {
    type: Date,
    default: Date.now,
  },
  downloadedAt: {
    type: Date,
    default: null,
  },
});

// A student gets one certificate per event
CertificateSchema.index({ studentId: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('Certificate', CertificateSchema);
