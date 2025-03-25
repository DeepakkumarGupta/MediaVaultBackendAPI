import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

// Interface for decoded JWT token
interface DecodedToken {
  id: string;
  iat: number;
  exp: number;
}

/**
 * Middleware to protect routes that require authentication
 * Verifies the JWT token in the Authorization header
 */
export const protect: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void | Response<any, Record<string, any>>> => {
  try {
    let token;

    // Check if token exists in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      // Get token from header (format: "Bearer TOKEN")
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your_jwt_secret_key_here'
      ) as DecodedToken;

      // Add user ID to request
      req.userId = decoded.id;

      // Get user from database (optional, depending on needs)
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Add user to request
      req.user = user;

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
  } catch (error) {
    next(error);
    return;
  }
};

/**
 * Creates a JWT token for a user
 */
export const generateToken = (id: string): string => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'your_jwt_secret_key_here',
    {
      expiresIn: '30d'
    }
  );
};