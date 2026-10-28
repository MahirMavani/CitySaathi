/**
 * CITYSAATHI — Backend REST API Server
 * Final-Year Capstone: AI-Powered Civic Complaint Management & Resolution Verification System
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const fastapiClient = require('./services/fastapiClient');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Detect serverless execution environment (Vercel, Netlify, AWS Lambda)
const isServerless = !!(process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);

// Ensure upload directory exists
const uploadsDir = isServerless
  ? path.join('/tmp', 'uploads')
  : path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded photos (serve bundled uploads first, then dynamic uploads)
if (isServerless) {
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
  app.use('/uploads', express.static(uploadsDir));
} else {
  app.use('/uploads', express.static(uploadsDir));
}

// System Health Check
app.get('/api/health', async (req, res) => {
  try {
    // Ping SQLite database
    const userCount = await prisma.user.count();
    const complaintCount = await prisma.complaint.count();

    // Check private Python FastAPI AI microservice availability
    const aiServiceStatus = await fastapiClient.checkHealth(800).catch(() => ({
      online: false,
      fallback: 'Local JavaScript AI Services'
    }));

    res.json({
      status: 'healthy',
      app: 'CitySaathi API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      database: {
        status: 'connected',
        engine: 'SQLite / Prisma',
        userCount,
        complaintCount
      },
      aiMicroservice: {
        status: aiServiceStatus.online ? 'connected' : 'offline',
        details: aiServiceStatus
      }
    });
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      error: 'Database connection failed',
      details: err.message
    });
  }
});

// Import API Routers
const authRoutes = require('./routes/authRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const aiRoutes = require('./routes/aiRoutes');
const duplicateRoutes = require('./routes/duplicateRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const statsRoutes = require('./routes/statsRoutes');
const staffRoutes = require('./routes/staffRoutes');

// Mount API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/duplicates', duplicateRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/staff', staffRoutes);

// Serve Frontend Static Files
const staticDir = path.join(__dirname, '..');
app.use(express.static(staticDir));

// SPA Fallback for HTML5 navigation
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  const indexPath = path.join(staticDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    next();
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      error: `File upload error: ${err.message}`
    });
  }
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start Server (only when executed directly, not when imported as serverless handler)
if (process.env.NODE_ENV !== 'test' && !isServerless && require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  CITYSAATHI — Backend REST API Server`);
    console.log(`  "Your City. Your Voice. Your Saathi."`);
    console.log(`  Port: http://localhost:${PORT}`);
    console.log(`  Health Check: http://localhost:${PORT}/api/health`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
