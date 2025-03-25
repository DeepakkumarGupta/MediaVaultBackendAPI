import express, { RequestHandler } from 'express';
import { 
  uploadMedia, 
  getUserMedia, 
  getMediaById, 
  deleteMedia,
  optimizeMedia
} from '../controllers/media.controller';
import { protect } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import { param, query } from 'express-validator';
import { validate } from '../middleware/validation.middleware';
import { asyncHandler } from '../utils/route-wrapper';

const router = express.Router();

// Validation
const getMediaValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

const mediaIdValidation = [
  param('id').isMongoId().withMessage('Invalid media ID format')
];

// All routes are protected first
router.use(protect as RequestHandler);

// Media routes - using asyncHandler to properly handle Promise returns
router.post('/', upload.single('file'), asyncHandler(uploadMedia));
router.get('/', validate(getMediaValidation), asyncHandler(getUserMedia));
router.get('/:id', validate(mediaIdValidation), asyncHandler(getMediaById));
router.delete('/:id', validate(mediaIdValidation), asyncHandler(deleteMedia));
router.post('/:id/optimize', validate(mediaIdValidation), asyncHandler(optimizeMedia));

export default router;