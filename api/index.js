/**
 * CITYSAATHI — Vercel Serverless Function Entry Point
 * Wraps Express application for Vercel serverless deployment.
 */

const path = require('path');
const fs = require('fs');

// 1. Handle Vercel serverless environment initialization
if (process.env.VERCEL) {
  // If using SQLite (default), copy pre-seeded dev.db to writable /tmp directory
  const currentDbUrl = process.env.DATABASE_URL || 'file:./dev.db';
  if (currentDbUrl.startsWith('file:') && !currentDbUrl.includes('/tmp/')) {
    const tmpDbPath = '/tmp/dev.db';
    const bundledDbPath = path.join(__dirname, '../prisma/dev.db');

    if (!fs.existsSync(tmpDbPath) && fs.existsSync(bundledDbPath)) {
      try {
        fs.copyFileSync(bundledDbPath, tmpDbPath);
        console.log('[CitySaathi Vercel] Pre-seeded SQLite database copied to /tmp/dev.db');
      } catch (err) {
        console.error('[CitySaathi Vercel] Failed to copy SQLite database to /tmp:', err);
      }
    }
    // Point Prisma to the writable SQLite database in /tmp
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
const app = require('../src/server');

// 3. Export for Vercel serverless runtime
module.exports = app;
