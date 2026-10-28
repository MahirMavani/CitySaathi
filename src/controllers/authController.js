/**
 * CitySaathi Authentication Controller
 * Registration, login, profile inspection, and convenient demo login endpoints.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

const prisma = new PrismaClient();

// Register a new citizen
async function register(req, res) {
  try {
    const { email, password, name, phone, ward } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password are required fields.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address.'
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists. Please sign in.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        ward: ward ? ward.trim() : 'Indiranagar (Ward 112)',
        role: 'CITIZEN',
        karmaPoints: 10 // Welcome points
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        ward: true,
        karmaPoints: true,
        createdAt: true
      }
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({
      success: false,
      error: 'An error occurred during registration. Please try again.'
    });
  }
}

// Sign in
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.'
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({
      success: true,
      message: 'Signed in successfully.',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        ward: user.ward,
        phone: user.phone,
        karmaPoints: user.karmaPoints,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      error: 'An error occurred during login. Please try again.'
    });
  }
}

// Current authenticated user profile with stats
async function getProfile(req, res) {
  try {
    const userId = req.user.id;

    const complaintsCount = await prisma.complaint.count({
      where: { citizenId: userId }
    });

    const verifiedCount = await prisma.citizenVerification.count({
      where: { citizenId: userId, isFixed: true }
    });

    return res.json({
      success: true,
      user: {
        ...req.user,
        stats: {
          complaintsSubmitted: complaintsCount,
          issuesVerified: verifiedCount,
          karmaPoints: req.user.karmaPoints
        }
      }
    });
  } catch (err) {
    console.error('Profile fetch error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile.'
    });
  }
}

// Convenient Demo Login Endpoint (for presentation convenience)
async function demoLogin(req, res) {
  try {
    const { role = 'citizen' } = req.body;
    const targetEmail = role === 'authority' ? 'authority@bbmp.gov.in' : 'citizen@citysaathi.in';

    const user = await prisma.user.findUnique({
      where: { email: targetEmail }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: `Demo account for role [${role}] not found. Run db seed first.`
      });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: `Signed in as demo ${user.role}.`,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        ward: user.ward,
        phone: user.phone,
        karmaPoints: user.karmaPoints
      }
    });
  } catch (err) {
    console.error('Demo login error:', err);
    return res.status(500).json({
      success: false,
      error: 'Demo sign-in failed.'
    });
  }
}

module.exports = {
  register,
  login,
  getProfile,
  demoLogin
};
