import express from 'express';
import { 
  createApiKey, 
  getUserApiKeys, 
  deleteApiKey 
} from '../controllers/apiKey.controller';
import { protect } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { body, param } from 'express-validator';
import { asyncHandler } from '../utils/route-wrapper';

const router = express.Router();

// Validation
const createApiKeyValidation = [
  body('name')
    .notEmpty()
    .withMessage('API key name is required')
    .isLength({ max: 50 })
    .withMessage('API key name cannot exceed 50 characters')
];

const deleteApiKeyValidation = [
  param('id').isMongoId().withMessage('Invalid API key ID format')
];

// All routes are protected
router.use(protect);

// API key routes
router.post('/', validate(createApiKeyValidation), asyncHandler(createApiKey));
router.get('/', asyncHandler(getUserApiKeys));
router.delete('/:id', validate(deleteApiKeyValidation), asyncHandler(deleteApiKey));

export default router;