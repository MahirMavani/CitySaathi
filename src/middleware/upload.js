/**
 * CitySaathi Secure File Upload Middleware (Multer)
 * Validates image mime types, restricts sizes to 5MB, and safely names files on disk.
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const isServerless = !!(process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
const uploadDir = isServerless
  ? path.join('/tmp', 'uploads')
  : path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedName = file.fieldname + '-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
    cb(null, sanitizedName);
  }
});

const allowedMimes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml'
]);

function fileFilter(req, file, cb) {
  if (allowedMimes.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type (${file.mimetype}). Allowed types: JPEG, PNG, WEBP, SVG.`), false);
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 5) * 1024 * 1024 // 5MB
  }
});

module.exports = upload;
