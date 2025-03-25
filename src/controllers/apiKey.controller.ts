import { Request, Response } from 'express';
import ApiKey from '../models/ApiKey';
import { ApiError } from '../middleware/error.middleware';
import { IUser } from '../models/User';

/**
 * @desc    Create a new API key
 * @route   POST /api/keys
 * @access  Private
 */
export const createApiKey = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    
    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: 'User not authenticated'
      });
    }
    
    const userId = req.user._id;

    // Check if user already has an API key with this name
    const existingKey = await ApiKey.findOne({ userId, name });
    if (existingKey) {
      throw new ApiError('API key with this name already exists', 400);
    }

    // Generate a new API key
    const key = ApiKey.generateKey();

    // Create the API key in the database
    const apiKey = await ApiKey.create({
      key,
      name,
      userId
    });

    res.status(201).json({
      success: true,
      message: 'API key created successfully',
      apiKey: {
        id: apiKey._id,
        name: apiKey.name,
        key: apiKey.key,
        createdAt: apiKey.createdAt
      }
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      error: true,
      message: error.message || 'An error occurred creating API key'
    });
  }
};

/**
 * @desc    Get all API keys for a user
 * @route   GET /api/keys
 * @access  Private
 */
export const getUserApiKeys = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: 'User not authenticated'
      });
    }
    
    const userId = req.user._id;

    // Find all API keys for this user
    const apiKeys = await ApiKey.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: apiKeys.length,
      apiKeys: apiKeys.map(key => ({
        id: key._id,
        name: key.name,
        // Only show a masked version of the key for security
        key: `${key.key.substring(0, 8)}...${key.key.substring(key.key.length - 4)}`,
        createdAt: key.createdAt,
        lastUsed: key.lastUsed
      }))
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      error: true,
      message: error.message || 'An error occurred retrieving API keys'
    });
  }
};

/**
 * @desc    Delete an API key
 * @route   DELETE /api/keys/:id
 * @access  Private
 */
export const deleteApiKey = async (req: Request, res: Response) => {
  try {
    const keyId = req.params.id;
    
    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: 'User not authenticated'
      });
    }
    
    const userId = req.user._id;

    // Find the API key
    const apiKey = await ApiKey.findOne({ _id: keyId, userId });

    if (!apiKey) {
      throw new ApiError('API key not found', 404);
    }

    // Delete the API key
    await apiKey.deleteOne();

    res.status(200).json({
      success: true,
      message: 'API key deleted successfully',
      id: keyId
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      error: true,
      message: error.message || 'An error occurred deleting API key'
    });
  }
};