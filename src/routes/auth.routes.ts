import express from 'express';
import { 
  register, 
  login, 
  getProfile, 
  updateProfile 
} from '../controllers/auth.controller';
import { protect } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { body } from 'express-validator';
import { asyncHandler } from '../utils/route-wrapper';

const router = express.Router();

// Register validation
const registerValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
];

// Login validation
const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// Profile update validation
const updateProfileValidation = [
  body('name').optional(),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
];

// Public routes
router.post('/register', validate(registerValidation), asyncHandler(register));
router.post('/login', validate(loginValidation), asyncHandler(login));

// Protected routes
router.get('/profile', protect, asyncHandler(getProfile));
router.put('/profile', protect, validate(updateProfileValidation), asyncHandler(updateProfile));

export default router;