// server/models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    username: {
      type:      String,
      required:  [true, 'Username is required'],
      unique:    true,
      trim:      true,
      minlength: [3,  'Username must be at least 3 characters'],
      maxlength: [24, 'Username cannot exceed 24 characters'],
    },
    email: {
      type:      String,
      required:  [true, 'Email is required'],
      unique:    true,
      trim:      true,
      lowercase: true,
      match:     [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type:      String,
      required:  [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select:    false,
    },
    college: {
      type:    String,
      trim:    true,
      default: 'Unknown College',
    },
    avatar: {
      type:    Number,
      default: () => Math.floor(Math.random() * 8),
    },
    totalVotesReceived: {
      type:    Number,
      default: 0,
    },
    submissionCount: {
      type:    Number,
      default: 0,
    },
    bio: {
      type:      String,
      maxlength: [200, 'Bio cannot exceed 200 characters'],
      default:   '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
