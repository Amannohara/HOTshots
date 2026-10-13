// server/routes/votes.js
const express = require('express');
const router  = express.Router();
const { castVote } = require('../controllers/voteController');
router.post('/', castVote);
module.exports = router;
