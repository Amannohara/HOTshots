// server/routes/submissions.js
const express = require('express');
const router  = express.Router();
const { createSubmission, getSubmissions, getLeaderboard, getTrending, getStats } = require('../controllers/submissionController');
const { optionalAuth } = require('./authMiddleware');

router.get('/leaderboard', getLeaderboard);
router.get('/trending',    getTrending);
router.get('/stats',       getStats);
router.get('/',            getSubmissions);
router.post('/',           optionalAuth, createSubmission);

module.exports = router;
