/**
 * CITYSAATHI — Netlify Functions Serverless Entry Point
 * Wraps Express application with serverless-http for Netlify deployment.
 */

const serverless = require('serverless-http');
const path = require('path');
const fs = require('fs');

// 1. Serverless Environment Storage & SQLite Persistence Initialization
const isServerless = !!(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL);

if (isServerless) {
  // If using SQLite (default), copy pre-seeded dev.db to writable /tmp directory
  const currentDbUrl = process.env.DATABASE_URL || 'file:./dev.db';
  if (currentDbUrl.startsWith('file:') && !currentDbUrl.includes('/tmp/')) {
    const tmpDbPath = '/tmp/dev.db';
    const bundledDbPath = path.resolve(__dirname, '../../prisma/dev.db');

    if (!fs.existsSync(tmpDbPath) && fs.existsSync(bundledDbPath)) {
      try {
        fs.copyFileSync(bundledDbPath, tmpDbPath);
        console.log('[CitySaathi Netlify] Pre-seeded SQLite database copied to /tmp/dev.db');
      } catch (err) {
        console.error('[CitySaathi Netlify] Failed to copy SQLite database to /tmp:', err);
      }
    }
    // Direct Prisma to the writable SQLite database in /tmp
    process.env.DATABASE_URL = 'file:/tmp/dev.db';
  }

  // Ensure /tmp/uploads exists for any runtime uploads
  const tmpUploads = '/tmp/uploads';
  if (!fs.existsSync(tmpUploads)) {
    try {
      fs.mkdirSync(tmpUploads, { recursive: true });
    } catch (e) {}
  }
}

// 2. Load the Express application
const app = require('../../src/server');

// 3. Wrap Express app with serverless-http
const serverlessHandler = serverless(app, {
  binary: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
});

// 4. Netlify Lambda Handler with Path Normalization
exports.handler = async (event, context) => {
  // Clean up Netlify function rewrite prefix so Express routes receive /api/... or /uploads/...
  if (event.path && event.path.startsWith('/.netlify/functions/api')) {
    let cleanPath = event.path.replace(/^\/\.netlify\/functions\/api/, '');
    if (!cleanPath.startsWith('/api') && !cleanPath.startsWith('/uploads')) {
      cleanPath = '/api' + (cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath);
    }
    event.path = cleanPath;
  }

  return serverlessHandler(event, context);
};
