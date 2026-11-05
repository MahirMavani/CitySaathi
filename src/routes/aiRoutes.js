const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const upload = require('../middleware/upload');

// Flexible multer middleware accepting 'image' or 'photo' field or passing through if JSON
const uploadImageOrPhoto = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.message && err.message.includes('Unexpected field')) {
        return upload.single('photo')(req, res, (err2) => {
          if (err2) return res.status(400).json({ success: false, error: err2.message });
          next();
        });
      }
      return res.status(400).json({ success: false, error: err.message });
    }
    if (!req.file) {
      return upload.single('photo')(req, res, (err2) => {
        if (err2) return res.status(400).json({ success: false, error: err2.message });
        next();
      });
    }
    next();
  });
};

router.post('/classify', aiController.classifyText);
router.post('/gemini-assist', aiController.geminiAssist);
router.post('/gemini-rewrite', aiController.geminiRewrite);
router.post('/generate-draft', aiController.generateComplaintDraft);
router.post('/gemini-generate-draft', aiController.generateComplaintDraft);
router.post('/verify-image', uploadImageOrPhoto, aiController.verifyImageEvidence);
router.get('/metrics', aiController.getModelMetrics);
router.post('/priority', aiController.analyzePriority);
router.get('/gemini-status', aiController.getGeminiStatus);

module.exports = router;
