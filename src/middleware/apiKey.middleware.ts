import { Request, Response, NextFunction, RequestHandler } from 'express';
import ApiKey from '../models/ApiKey';

// Extend Request interface to include userId property
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Middleware to validate API key for external API access
 * Verifies the API key in the x-api-key header
 */
export const validateApiKey: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response<any, Record<string, any>>> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    // Check if API key exists
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API key is required'
      });
    }

    // Find the API key in the database
    const keyDoc = await ApiKey.findOne({ key: apiKey });

    // Check if API key exists in database
    if (!keyDoc) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key'
      });
    }

    // Update the last used timestamp
    keyDoc.lastUsed = new Date();
    await keyDoc.save();

    // Add the user ID to the request
    req.userId = keyDoc.userId.toString();

    next();
  } catch (error) {
    next(error);
    return;
  }
};