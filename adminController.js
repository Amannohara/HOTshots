// server/controllers/adminController.js
const Submission = require('../models/Submission');

// ─── GET /api/admin/submissions ────────────────────────────────────────────
const getPendingSubmissions = async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Submission.countDocuments({ status });

    const submissions = await Submission.find({ status })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      data:    submissions,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    console.error('getPendingSubmissions error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── PATCH /api/admin/approve/:id ─────────────────────────────────────────
const approveSubmission = async (req, res) => {
  try {
    const submission = await Submission.findByIdAndUpdate(
      req.params.id,
      { status: 'approved' },
      { new: true }
    );
    if (!submission) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, data: submission });
  } catch (error) {
    console.error('approveSubmission error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── PATCH /api/admin/reject/:id ──────────────────────────────────────────
const rejectSubmission = async (req, res) => {
  try {
    const submission = await Submission.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
      { new: true }
    );
    if (!submission) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, data: submission });
  } catch (error) {
    console.error('rejectSubmission error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getPendingSubmissions, approveSubmission, rejectSubmission };
