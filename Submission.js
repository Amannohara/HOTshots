// server/routes/submissions.js
const express = require('express');
const router  = express.Router();
const {
  getHomepage, createSubmission, getSubmissions,
  getLeaderboard, getTrending, getStats,
} = require('../controllers/submissionController');
const { optionalAuth } = require('../middleware/auth');

// IMPORTANT: specific routes before generic ones
router.get('/homepage',    getHomepage);
router.get('/leaderboard', getLeaderboard);
router.get('/trending',    getTrending);
router.get('/stats',       getStats);
router.get('/',            getSubmissions);
router.post('/',           optionalAuth, createSubmission);

module.exports = router;
