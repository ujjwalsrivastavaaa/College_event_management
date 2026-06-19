const mongoose = require('mongoose');

const ClubSchema = new mongoose.Schema({
  clubName: {
    type: String,
    required: [true, 'Please add a club name'],
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
  },
  logo: {
    type: String,
    default: '',
  },
  president: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  facultyCoordinator: {
    type: String,
    required: [true, 'Please add a faculty coordinator'],
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Club', ClubSchema);
