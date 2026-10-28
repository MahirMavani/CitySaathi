const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// List all departments with their active staff
router.get('/', async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            roleTitle: true
          }
        }
      }
    });

    const staffList = await prisma.staff.findMany({
      include: {
        department: {
          select: { id: true, name: true, code: true }
        }
      }
    });

    res.json({
      success: true,
      departments,
      staff: staffList
    });
  } catch (err) {
    console.error('Staff fetch error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch staff directory.' });
  }
});

module.exports = router;
