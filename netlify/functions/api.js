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

// 4. Netlify Lambda Handler with Comprehensive Path Normalization
exports.handler = async (event, context) => {
  // Normalize incoming path for Express routing across all Netlify & Lambda event formats
  let targetPath = event.path || event.rawPath || '';
  if (targetPath.startsWith('/.netlify/functions/api')) {
    targetPath = targetPath.replace(/^\/\.netlify\/functions\/api/, '');
  }
  if (!targetPath.startsWith('/api') && !targetPath.startsWith('/uploads')) {
    targetPath = '/api' + (targetPath.startsWith('/') ? targetPath : '/' + targetPath);
  }

  event.path = targetPath;
  if (event.rawPath !== undefined) {
    event.rawPath = targetPath;
  }
  if (event.requestPath !== undefined) {
    event.requestPath = targetPath;
  }

  return serverlessHandler(event, context);
};
