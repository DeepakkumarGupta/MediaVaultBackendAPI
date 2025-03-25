import multer, { MulterError } from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { Request } from 'express';
import { Schema } from 'mongoose';

// Base upload path
const BASE_UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';

// Setup account-based storage
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    // Make sure user is authenticated
    if (!req.userId) {
      return cb(new Error('User not authenticated'), '');
    }
    
    // Create account-based directory structure
    const userId = req.userId;
    const userDir = path.join(BASE_UPLOAD_PATH, userId);
    
    let mediaType = 'documents';
    
    // Determine media type directory based on file type
    if (file.mimetype.startsWith('image/')) {
      mediaType = 'images';
    } else if (file.mimetype.startsWith('video/')) {
      mediaType = 'videos';
    }
    
    const mediaTypeDir = path.join(userDir, mediaType);
    
    // Create directories if they don't exist
    [BASE_UPLOAD_PATH, userDir, mediaTypeDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    // Create other required directories for this user
    [
      path.join(userDir, 'thumbnails'),
      path.join(userDir, 'images', 'optimized'),
      path.join(userDir, 'videos', 'optimized')
    ].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    cb(null, mediaTypeDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // Generate a unique filename with original extension
    const fileExtension = path.extname(file.originalname);
    const uniqueFilename = `${uuidv4()}${fileExtension}`;
    cb(null, uniqueFilename);
  }
});

// File filter to validate uploads
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Define allowed MIME types for each category
  const allowedImages = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  const allowedVideos = ['video/mp4', 'video/mpeg', 'video/webm', 'video/mov', 'video/quicktime'];
  const allowedDocuments = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ];

  const isAllowed = [...allowedImages, ...allowedVideos, ...allowedDocuments].includes(file.mimetype);

  if (isAllowed) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed. Please upload an image, video, or document.'));
  }
};

// Configure multer upload
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB file size limit
  }
});

/**
 * Helper function to get the file path for a user's media
 */
export const getUserFilePath = (userId: string | Schema.Types.ObjectId, mediaType: string, filename: string): string => {
  return path.join(BASE_UPLOAD_PATH, userId.toString(), mediaType, filename);
};

/**
 * Helper function to get thumbnail path for a user
 */
export const getThumbnailPath = (userId: string | Schema.Types.ObjectId, filename: string): string => {
  return path.join(BASE_UPLOAD_PATH, userId.toString(), 'thumbnails', filename);
};

/**
 * Helper function to get optimized media path for a user
 */
export const getOptimizedPath = (userId: string | Schema.Types.ObjectId, mediaType: string, filename: string): string => {
  return path.join(BASE_UPLOAD_PATH, userId.toString(), mediaType, 'optimized', filename);
};

/**
 * Helper function to ensure a specific directory exists for a user
 */
export const ensureUserDirExists = (userId: string | Schema.Types.ObjectId, subDir?: string): string => {
  const userDir = path.join(BASE_UPLOAD_PATH, userId.toString());
  
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  
  if (subDir) {
    const fullPath = path.join(userDir, subDir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    return fullPath;
  }
  
  return userDir;
};