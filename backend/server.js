require('dotenv').config();
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'secret-key-sop-bps-surabaya';
}
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { sequelize } = require('./models');

const app = express();
const PORT = process.env.PORT || 8000;

// ===================================
// MIDDLEWARE
// ===================================
app.use(cors());

app.use(express.json({ limit: '50mb' }));         // Support base64 PDF
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files untuk uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve Frontend Static Dist (Monolith)
const frontendDist = path.join(__dirname, '..', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  console.log(`📦 Serving Monolith Frontend from: ${frontendDist}`);
}

// ===================================
// ROUTES
// ===================================
const authRoutes      = require('./routes/auth');
const sopRoutes       = require('./routes/sops');
const revisionRoutes  = require('./routes/revisions');
const userRoutes      = require('./routes/users');
const pdfRoutes       = require('./routes/pdf');
const activityRoutes  = require('./routes/activities');

app.use('/api/auth',      authRoutes);
app.use('/api/sops',      sopRoutes);
app.use('/api/revisions', revisionRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/activities', activityRoutes);
app.use('/',              pdfRoutes);                  // /edit-pdf/ dan /pdfs/:filename

// ===================================
// API INFO ENDPOINT
// ===================================
app.get('/api', (req, res) => {
  res.json({
    message: 'BPS SOP Management API (Monolith)',
    version: '3.0',
    framework: 'Express.js + React Monolith',
    database: 'MySQL (Sequelize)',
    status: 'Running'
  });
});

// ===================================
// SPA FALLBACK (Monolith Routing)
// ===================================
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/pdfs') || req.path.startsWith('/edit-pdf')) {
    return next();
  }
  const indexPath = path.join(frontendDist, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(404).json({ detail: `Route ${req.method} ${req.path} not found` });
});

// ===================================
// Error Handler
// ===================================
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ detail: err.message || 'Internal server error' });
});

// ===================================
// START SERVER + SYNC DATABASE
// ===================================
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL connected successfully');

    await sequelize.sync({ alter: false });
    console.log('✅ Database tables synced');

    app.listen(PORT, () => {
      console.log(`🚀 Monolith Server running on http://localhost:${PORT}`);
      console.log(`📖 Web Application & API: http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();
