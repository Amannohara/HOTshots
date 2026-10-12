// server/routes/admin.js
const express = require('express');
const router  = express.Router();
const { getPendingSubmissions, approveSubmission, rejectSubmission } = require('../controllers/adminController');
const { adminOnly } = require('./authMiddleware');

router.use(adminOnly);

router.get('/submissions',        getPendingSubmissions);
router.patch('/approve/:id',      approveSubmission);
router.patch('/reject/:id',       rejectSubmission);

module.exports = router;
