const express = require('express');
const router = express.Router();
const duplicateController = require('../controllers/duplicateController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.post('/check', duplicateController.checkDuplicates);
router.post('/merge', authenticateToken, requireRole('AUTHORITY'), duplicateController.mergeIntoMaster);
router.get('/masters', duplicateController.listMasterIssues);

module.exports = router;
