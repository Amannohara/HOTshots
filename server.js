// server/server.js — HotShotz v3
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const connectDB    = require('./config/db');
const authRoutes   = require('./routes/auth');
const subRoutes    = require('./routes/submissions');
const voteRoutes   = require('./routes/votes');
const winnerRoutes = require('./routes/winners');
const uploadRoutes = require('./routes/upload');
const userRoutes   = require('./routes/users');
const adminRoutes  = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 3000;

connectDB();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.set('trust proxy', 1);

// Serve static files with cache headers
app.use(express.static(path.join(__dirname, '../client'), {
  maxAge: '1h',
  etag:   true,
}));

app.use('/api/auth',        authRoutes);
app.use('/api/submissions', subRoutes);
app.use('/api/vote',        voteRoutes);
app.use('/api/winners',     winnerRoutes);
app.use('/api/upload',      uploadRoutes);
app.use('/api/users',       userRoutes);
app.use('/api/admin',       adminRoutes);

// Legacy aliases
app.post('/api/submit', require('./controllers/submissionController').createSubmission);
app.get('/api/stats',   require('./controllers/submissionController').getStats);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.use((err, _req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, message: 'Server error.' });
});

app.listen(PORT, () => {
  console.log(`\n🔥 HotShotz running → http://localhost:${PORT}`);
});
