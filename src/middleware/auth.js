/**
 * CitySaathi Authentication & Role-Based Authorization Middleware
 */

const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'citysaathi_secure_jwt_dev_key_capstone_2026';

// Verify JWT token and attach user object
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Missing Bearer token.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        ward: true,
        phone: true,
        karmaPoints: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token: User no longer exists.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired authentication token.'
    });
  }
}

// Optional Auth (populates req.user if token present, but doesn't reject if absent)
async function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true, ward: true }
    });
    req.user = user || null;
  } catch (e) {
    req.user = null;
  }
  next();
}

// Role-based authorization guard
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Action requires one of roles: [${allowedRoles.join(', ')}]. Your role: ${req.user.role}`
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  JWT_SECRET
};
