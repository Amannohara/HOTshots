// server/models/Vote.js
const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema(
  {
    submissionId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Submission',
      required: true,
    },
    voterIdentifier: {
      type:     String,
      required: true,
    },
    weekId: {
      type:     String,
      required: true,
    },
  },
  { timestamps: true }
);

VoteSchema.index({ submissionId: 1, voterIdentifier: 1 }, { unique: true });

module.exports = mongoose.model('Vote', VoteSchema);
