const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const { authenticateToken, optionalAuth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public map markers
router.get('/public-map', complaintController.getPublicMapComplaints);

// Smart duplicate consolidation & clusters
router.get('/duplicate-groups', optionalAuth, complaintController.getDuplicateGroups);
router.post('/merge', authenticateToken, requireRole('AUTHORITY'), complaintController.mergeDuplicates);
router.post('/dismiss-duplicate', authenticateToken, requireRole('AUTHORITY'), complaintController.dismissDuplicate);

// List and single detail
router.get('/', optionalAuth, complaintController.listComplaints);
router.get('/:id', optionalAuth, complaintController.getComplaint);

// Create new complaint (Citizens, registered users, and verified guest submissions)
router.post('/', optionalAuth, upload.single('photo'), complaintController.createComplaint);

// Municipal Authority actions
router.patch('/:id/status', authenticateToken, requireRole('AUTHORITY'), complaintController.updateStatus);
router.patch('/:id/assign', authenticateToken, requireRole('AUTHORITY'), complaintController.assignStaff);
router.post('/:id/evidence', authenticateToken, requireRole('AUTHORITY'), upload.single('afterPhoto'), complaintController.uploadRepairEvidence);

// Citizen verification loop ("Yes, it's fixed" vs "No, needs attention")
router.post('/:id/verify', authenticateToken, complaintController.verifyRepair);

module.exports = router;
