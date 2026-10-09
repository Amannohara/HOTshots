// server/controllers/authController.js
const User    = require('../models/User');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'hotshotz_secret_change_in_prod';
const JWT_EXPIRES = '7d';

function signToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function userPayload(user) {
  return {
    id:       user._id,
    username: user.username,
    email:    user.email,
    college:  user.college,
    avatar:   user.avatar,
    bio:      user.bio || '',
  };
}

// ─── POST /api/auth/register ───────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { username, email, password, college } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Username, email and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
    if (existing) {
      const field = existing.email === email.toLowerCase() ? 'Email' : 'Username';
      return res.status(409).json({ success: false, message: `${field} is already taken.` });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user   = await User.create({
      username:  username.trim(),
      email:     email.toLowerCase().trim(),
      password:  hashed,
      college:   (college || 'Unknown College').trim(),
    });

    const token = signToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created! Welcome to HotShotz 🔥',
      token,
      user: userPayload(user),
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    console.error('register error:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ─── POST /api/auth/login ──────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    // password field has select:false — must explicitly include it
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = signToken(user._id);

    res.json({
      success: true,
      message: 'Welcome back! 🔥',
      token,
      user: userPayload(user),
    });
  } catch (error) {
    console.error('login error:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ─── GET /api/auth/me ──────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    // req.user is populated by protect middleware
    const user = req.user;
    res.json({ success: true, user: userPayload(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { register, login, getMe };
