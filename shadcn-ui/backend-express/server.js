require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./models');

const app = express();
const PORT = process.env.PORT || 8000;

// ===================================
// MIDDLEWARE
// ===================================
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL || 'http://localhost:5173',
    /\.vercel\.app$/,
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '50mb' }));         // Support base64 PDF
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files untuk uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
// ROOT ENDPOINT
// ===================================
app.get('/', (req, res) => {
  res.json({
    message: 'BPS SOP Management API',
    version: '3.0',
    framework: 'Express.js',
    database: 'MySQL (Sequelize)',
    status: 'Running',
    endpoints: {
      auth: '/api/auth/login',
      sops: '/api/sops',
      revisions: '/api/revisions',
      users: '/api/users',
      pdf_edit: '/edit-pdf/',
    }
  });
});

// ===================================
// 404 Handler
// ===================================
app.use((req, res) => {
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
    // Test koneksi database
    await sequelize.authenticate();
    console.log('✅ MySQL connected successfully');

    // Auto-create tabel (ekuivalen dengan Base.metadata.create_all di FastAPI)
    await sequelize.sync({ alter: false });
    console.log('✅ Database tables synced');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📖 API Base: http://localhost:${PORT}/api`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();
