const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

router.get('/', statsController.getOverviewStats);
router.get('/overview', statsController.getOverviewStats);
router.get('/departments', statsController.getDepartmentStats);

module.exports = router;
