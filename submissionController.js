// server/controllers/submissionController.js
const Submission = require('../models/Submission');
const User       = require('../models/User');
const Vote       = require('../models/Vote');
const crypto     = require('crypto');

/* ── Simple in-process cache (avoids hammering MongoDB on every page load) ── */
const cache = new Map();
const CACHE_TTL = 30 * 1000; // 30 seconds

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > CACHE_TTL) { cache.delete(key); return null; }
  return hit.data;
}
function cacheSet(key, data) { cache.set(key, { data, ts: Date.now() }); }
function cacheClear(prefix) { for (const k of cache.keys()) { if (k.startsWith(prefix)) cache.delete(k); } }

function getVoterIdentifier(req) {
  const raw = (req.ip || '') + (req.headers['user-agent'] || '');
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

// ─── GET /api/homepage — single endpoint, one round-trip ──────────────────
// Returns: stats + trending + leaderboard + first page of submissions
const getHomepage = async (req, res) => {
  try {
    const cacheKey = 'homepage';
    const cached   = cacheGet(cacheKey);

    let base;
    if (cached) {
      base = cached;
    } else {
      const weekId = Submission.getCurrentWeekId();

      // All queries fire in parallel — one DB connection burst, done fast
      const [
        weekSubmissions,
        totalVotesAgg,
        collegesAgg,
        trending,
        leaderboard,
        firstPage,
        totalApproved,
      ] = await Promise.all([
        Submission.countDocuments({ status: 'approved', weekId }),
        Submission.aggregate([
          { $match: { status: 'approved' } },
          { $group: { _id: null, total: { $sum: '$voteCount' } } },
        ]),
        Submission.distinct('authorCollege', { status: 'approved', weekId }),
        Submission.find({ status: 'approved', weekId })
          .sort({ voteCount: -1 })
          .limit(6)
          .select('title category content authorName authorCollege voteCount imageUrl isWinner rank weekId createdAt')
          .lean(),
        Submission.find({ status: 'approved', weekId })
          .sort({ voteCount: -1 })
          .limit(3)
          .select('title category authorName authorCollege voteCount imageUrl isWinner rank weekId')
          .lean(),
        Submission.find({ status: 'approved' })
          .sort({ voteCount: -1 })
          .limit(9)
          .select('title category content authorName authorCollege voteCount imageUrl isWinner rank weekId createdAt')
          .lean(),
        Submission.countDocuments({ status: 'approved' }),
      ]);

      base = {
        weekId,
        stats: {
          weekSubmissions,
          totalVotes:  totalVotesAgg[0]?.total || 0,
          collegeCount: Math.max(collegesAgg.filter(c => c && c !== 'Unknown College').length, 1),
          totalSubmissions: totalApproved,
        },
        trending,
        leaderboard,
        submissions: firstPage,
        pagination: {
          total: totalApproved,
          page:  1,
          pages: Math.ceil(totalApproved / 9),
          limit: 9,
        },
      };

      cacheSet(cacheKey, base);
    }

    // Enrich with hasVoted (always fresh — per user)
    const voterIdentifier = getVoterIdentifier(req);
    const allIds = [...new Set([
      ...base.submissions.map(s => s._id.toString()),
      ...base.trending.map(s => s._id.toString()),
    ])].map(id => require('mongoose').Types.ObjectId.createFromHexString(id));

    const userVotes = await Vote.find({ submissionId: { $in: allIds }, voterIdentifier })
      .select('submissionId').lean();
    const votedSet  = new Set(userVotes.map(v => v.submissionId.toString()));

    const enrich = arr => arr.map(s => ({ ...s, hasVoted: votedSet.has(s._id.toString()) }));

    res.json({
      success:     true,
      weekId:      base.weekId,
      stats:       base.stats,
      trending:    enrich(base.trending),
      leaderboard: enrich(base.leaderboard),
      data:        enrich(base.submissions),
      pagination:  base.pagination,
      currentWeek: base.weekId,
    });
  } catch (error) {
    console.error('getHomepage error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── POST /api/submissions ─────────────────────────────────────────────────
const createSubmission = async (req, res) => {
  try {
    const { title, category, content, authorName, authorCollege, imageUrl } = req.body;
    if (!title || !category || !content || !authorName) {
      return res.status(400).json({ success: false, message: 'Please provide title, category, content, and your name.' });
    }

    const submissionData = {
      title:         title.trim(),
      category:      category.toLowerCase(),
      content:       content.trim(),
      authorName:    authorName.trim(),
      authorCollege: (authorCollege || 'Unknown College').trim(),
      imageUrl:      imageUrl || null,
      weekId:        Submission.getCurrentWeekId(),
      status:        'pending',
    };

    if (req.user) {
      submissionData.userId = req.user._id;
      await User.findByIdAndUpdate(req.user._id, { $inc: { submissionCount: 1 } });
    }

    const submission = await Submission.create(submissionData);
    cacheClear('homepage');
    cacheClear('sub_');
    res.status(201).json({ success: true, message: 'Submission received! 🔥', data: submission });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: Object.values(error.errors).map(e => e.message).join('. ') });
    }
    console.error('createSubmission error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET /api/submissions — paginated feed (page > 1 only, page 1 from homepage) ─
const getSubmissions = async (req, res) => {
  try {
    const { week, category, sort = 'votes', page = 1, limit = 9 } = req.query;
    const filter = { status: 'approved' };
    if (week)     filter.weekId   = week;
    if (category) filter.category = category.toLowerCase();

    const cacheKey = `sub_${sort}_${page}_${limit}_${week||''}_${category||''}`;
    const cached   = cacheGet(cacheKey);

    let submissions, total;
    if (cached) {
      ({ submissions, total } = cached);
    } else {
      const sortMap   = { votes: { voteCount: -1 }, newest: { createdAt: -1 }, oldest: { createdAt: 1 } };
      const skip      = (Number(page) - 1) * Number(limit);
      [total, submissions] = await Promise.all([
        Submission.countDocuments(filter),
        Submission.find(filter)
          .sort(sortMap[sort] || sortMap.votes)
          .skip(skip).limit(Number(limit))
          .select('title category content authorName authorCollege voteCount imageUrl isWinner rank weekId createdAt')
          .lean(),
      ]);
      cacheSet(cacheKey, { submissions, total });
    }

    const voterIdentifier = getVoterIdentifier(req);
    const userVotes = await Vote.find({ submissionId: { $in: submissions.map(s => s._id) }, voterIdentifier })
      .select('submissionId').lean();
    const votedSet = new Set(userVotes.map(v => v.submissionId.toString()));

    res.json({
      success: true,
      data:    submissions.map(s => ({ ...s, hasVoted: votedSet.has(s._id.toString()) })),
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) },
      currentWeek: Submission.getCurrentWeekId(),
    });
  } catch (error) {
    console.error('getSubmissions error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET /api/submissions/leaderboard ─────────────────────────────────────
const getLeaderboard = async (req, res) => {
  try {
    const weekId = req.query.week || Submission.getCurrentWeekId();
    const top    = await Submission.find({ weekId, status: 'approved' })
      .sort({ voteCount: -1 }).limit(3)
      .select('title category authorName authorCollege voteCount imageUrl isWinner rank')
      .lean();
    res.json({ success: true, data: top, weekId });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET /api/submissions/trending ────────────────────────────────────────
const getTrending = async (req, res) => {
  try {
    const weekId   = Submission.getCurrentWeekId();
    const trending = await Submission.find({ status: 'approved', weekId })
      .sort({ voteCount: -1 }).limit(6)
      .select('title category content authorName authorCollege voteCount imageUrl isWinner rank weekId createdAt')
      .lean();
    res.json({ success: true, data: trending, weekId });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET /api/submissions/stats ────────────────────────────────────────────
const getStats = async (req, res) => {
  try {
    const weekId = Submission.getCurrentWeekId();
    const [weekSubmissions, totalVotesAgg, collegesAgg, totalSubmissions] = await Promise.all([
      Submission.countDocuments({ status: 'approved', weekId }),
      Submission.aggregate([{ $match: { status: 'approved' } }, { $group: { _id: null, total: { $sum: '$voteCount' } } }]),
      Submission.distinct('authorCollege', { status: 'approved', weekId }),
      Submission.countDocuments({ status: 'approved' }),
    ]);
    res.json({
      success: true,
      data: {
        totalSubmissions, weekSubmissions,
        totalVotes:   totalVotesAgg[0]?.total || 0,
        collegeCount: Math.max(collegesAgg.filter(c => c && c !== 'Unknown College').length, 1),
        weekId,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getHomepage, createSubmission, getSubmissions, getLeaderboard, getTrending, getStats };
