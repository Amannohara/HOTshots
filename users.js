// server/routes/users.js
const express = require('express');
const router  = express.Router();
const { getMe, getUserById } = require('../controllers/userController');
const { protect } = require('./authMiddleware');

router.get('/me',  protect, getMe);
router.get('/:id', getUserById);

module.exports = router;
