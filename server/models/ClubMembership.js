const mongoose = require('mongoose');

const ClubMembershipSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club',
    required: true,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure a user cannot join the same club multiple times
ClubMembershipSchema.index({ userId: 1, clubId: 1 }, { unique: true });

module.exports = mongoose.model('ClubMembership', ClubMembershipSchema);
