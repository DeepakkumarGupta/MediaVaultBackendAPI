import { Request, Response } from 'express';
import User, { IUser } from '../models/User';
import { generateToken } from '../middleware/auth.middleware';
import { ApiError } from '../middleware/error.middleware';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: IUser & { _id: any };
    }
  }
}

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      throw new ApiError('User already exists with this email', 400);
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password
    }) as IUser & { _id: any };

    // Send response with token
    if (user) {
      res.status(201).json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        },
        token: generateToken(user._id.toString())
      });
    } else {
      throw new ApiError('Invalid user data', 400);
    }
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      error: true,
      message: error.message || 'An error occurred during registration'
    });
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email }) as IUser & { _id: any };

    // Check if user exists and password matches
    if (user && (await user.comparePassword(password))) {
      res.status(200).json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        },
        token: generateToken(user._id.toString())
      });
    } else {
      throw new ApiError('Invalid email or password', 401);
    }
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      error: true,
      message: error.message || 'An error occurred during login'
    });
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    // User is attached to the request from the auth middleware
    const user = req.user;

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      error: true,
      message: error.message || 'An error occurred retrieving profile'
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const user = await User.findById(req.user._id) as IUser & { _id: any };

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    // Update fields if provided
    if (req.body.name) {
      user.name = req.body.name;
    }
    
    if (req.body.email) {
      // Check if email is already in use
      const emailExists = await User.findOne({ email: req.body.email }) as IUser & { _id: any };
      if (emailExists && emailExists._id.toString() !== user._id.toString()) {
        throw new ApiError('Email already in use', 400);
      }
      user.email = req.body.email;
    }
    
    if (req.body.password) {
      user.password = req.body.password;
    }

    // Save updated user
    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        createdAt: updatedUser.createdAt
      }
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      error: true,
      message: error.message || 'An error occurred updating profile'
    });
  }
};