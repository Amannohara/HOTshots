// server/routes/winners.js
const express = require('express');
const router  = express.Router();
const { getCurrentWinners, getWinnersByWeek, computeWinners } = require('../controllers/winnerController');
const { adminOnly } = require('./authMiddleware');

router.get('/current',       getCurrentWinners);
router.get('/:weekId',       getWinnersByWeek);
router.post('/compute',      adminOnly, computeWinners);

module.exports = router;
