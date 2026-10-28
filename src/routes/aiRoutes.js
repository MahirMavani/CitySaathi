const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.post('/classify', aiController.classifyText);
router.post('/gemini-assist', aiController.geminiAssist);
router.post('/gemini-rewrite', aiController.geminiRewrite);
router.post('/generate-draft', aiController.generateComplaintDraft);
router.post('/gemini-generate-draft', aiController.generateComplaintDraft);
router.get('/metrics', aiController.getModelMetrics);
router.post('/priority', aiController.analyzePriority);
router.get('/gemini-status', aiController.getGeminiStatus);

module.exports = router;
