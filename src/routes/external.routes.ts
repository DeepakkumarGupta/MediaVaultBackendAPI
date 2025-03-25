import express, { RequestHandler } from 'express';
import { 
  uploadMedia, 
  getUserMedia, 
  getMediaById, 
  deleteMedia 
} from '../controllers/external.controller';
import { validateApiKey } from '../middleware/apiKey.middleware';
import { validate } from '../middleware/validation.middleware';
import { param, query } from 'express-validator';
import { asyncHandler } from '../utils/route-wrapper';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const router = express.Router();

// Create upload directories if they don't exist
const uploadDir = './uploads';
const imageDir = path.join(uploadDir, 'images');
const videoDir = path.join(uploadDir, 'videos');

[uploadDir, imageDir, videoDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, imageDir);
    } else if (file.mimetype.startsWith('video/')) {
      cb(null, videoDir);
    } else {
      cb(null, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Configure file filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow images and videos
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type'));
  }
};

// Create multer upload instance
const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Validation
const getMediaValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

const mediaIdValidation = [
  param('id').isMongoId().withMessage('Invalid media ID format')
];

// All routes need API key validation
router.use(validateApiKey as RequestHandler);

// External API routes
router.post('/media', upload.single('file'), asyncHandler(uploadMedia));
router.get('/media', validate(getMediaValidation), asyncHandler(getUserMedia));
router.get('/media/:id', validate(mediaIdValidation), asyncHandler(getMediaById));
router.delete('/media/:id', validate(mediaIdValidation), asyncHandler(deleteMedia));

export default router;