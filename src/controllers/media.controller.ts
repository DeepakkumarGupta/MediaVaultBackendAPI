import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: IUser & { _id: any };
    }
  }
}
import ffmpeg from 'fluent-ffmpeg';
import { v4 as uuidv4 } from 'uuid';
import { Schema, Types } from 'mongoose';
import Media from '../models/Media';
import { ApiError } from '../middleware/error.middleware';
import { isImage, isVideo, formatBytes } from '../utils';
import { IUser } from '../models/User';
import { 
  getUserFilePath, 
  getThumbnailPath, 
  getOptimizedPath, 
  ensureUserDirExists 
} from '../middleware/upload.middleware';

// Base upload directory
const BASE_UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';

/**
 * @desc    Upload a media file
 * @route   POST /api/media
 * @access  Private
 */
export const uploadMedia = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      throw new ApiError('No file uploaded', 400);
    }

    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: 'User not authenticated'
      });
    }

    const file = req.file;
    // Casting userId to string to ensure it's the right type
    const userId = req.user._id.toString();
    const baseUrl = `https://${req.get('host')}`;
    
    // Determine media type
    const mediaType = file.mimetype.startsWith('image') ? 'images' : 
                      file.mimetype.startsWith('video') ? 'videos' : 'documents';
    
    // Create optimized version and file URLs
    let fileUrl, thumbnailUrl, optimizedFileUrl;
    let isOptimized = false;
    let optimizedSize = file.size;
    let newFileName = file.filename;
    
    // For images: Convert to WebP immediately and use optimized version as the primary file
    if (isImage(file.mimetype)) {
      // Generate a unique WebP filename
      const webpFilename = `${path.parse(file.filename).name}.webp`;
      const optimizedPath = getOptimizedPath(userId, mediaType, webpFilename);
      
      // Ensure optimized directory exists
      ensureUserDirExists(userId, `${mediaType}/optimized`);
      
      // Convert to WebP with good quality
      await sharp(file.path)
        .webp({ quality: 85 })
        .toFile(optimizedPath);
      
      // Get the file size of the optimized WebP file
      const optimizedStats = fs.statSync(optimizedPath);
      optimizedSize = optimizedStats.size;
      
      // Use optimized WebP as the primary file URL
      optimizedFileUrl = `${baseUrl}/uploads/${userId}/${mediaType}/optimized/${webpFilename}`;
      fileUrl = optimizedFileUrl;
      isOptimized = true;
      newFileName = webpFilename;
      
      // Create thumbnail
      const thumbnailFilename = `thumb_${webpFilename}`;
      const thumbnailPath = getThumbnailPath(userId, thumbnailFilename);
      
      await sharp(file.path)
        .resize(300, 300, { fit: 'inside' })
        .webp({ quality: 70 })
        .toFile(thumbnailPath);
      
      thumbnailUrl = `${baseUrl}/uploads/${userId}/thumbnails/${thumbnailFilename}`;
      
      // Delete the original file since we're only keeping the WebP version
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } 
    // For videos: Keep the original for now (video processing is more complex)
    else if (isVideo(file.mimetype)) {
      // Generate file URL with account-based structure for original (for now)
      fileUrl = `${baseUrl}/uploads/${userId}/${mediaType}/${file.filename}`;
      
      // Create thumbnail for videos (first frame)
      const thumbnailFilename = `thumb_${path.parse(file.filename).name}.jpg`;
      const thumbnailPath = getThumbnailPath(userId, thumbnailFilename);
      
      // Ensure thumbnail directory exists
      ensureUserDirExists(userId, 'thumbnails');
      
      // Generate thumbnail asynchronously, don't wait for completion
      ffmpeg(file.path)
        .screenshots({
          timestamps: ['00:00:01'],
          filename: thumbnailFilename,
          folder: path.join(BASE_UPLOAD_PATH, userId, 'thumbnails'),
          size: '300x?'
        })
        .on('error', (err) => {
          console.error('Error generating video thumbnail:', err);
        });
      
      thumbnailUrl = `${baseUrl}/uploads/${userId}/thumbnails/${thumbnailFilename}`;
      
      // Start optimization process asynchronously
      const optimizedFilename = `opt_${path.parse(file.filename).name}.mp4`;
      const optimizedPath = getOptimizedPath(userId, mediaType, optimizedFilename);
      
      ensureUserDirExists(userId, `${mediaType}/optimized`);
      
      // Add a reference to the database record that will be created
      const dbRecordId = uuidv4();
      
      ffmpeg(file.path)
        .outputOptions([
          '-c:v libx264',
          '-crf 28',
          '-preset medium',
          '-c:a aac',
          '-b:a 128k'
        ])
        .output(optimizedPath)
        .on('end', async () => {
          try {
            // Update database record after optimization completes
            const optimizedUrl = `${baseUrl}/uploads/${userId}/${mediaType}/optimized/${optimizedFilename}`;
            
            // Get the file size of the optimized video file
            const optimizedStats = fs.statSync(optimizedPath);
            
            // Update the media record
            await Media.findByIdAndUpdate(dbRecordId, {
              optimizedFileUrl: optimizedUrl,
              isOptimized: true,
              fileSize: optimizedStats.size
            });
            
            console.log(`Video optimized: ${file.filename}`);
            
            // Delete the original file after optimization is complete
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          } catch (err) {
            console.error('Error updating media record after optimization:', err);
          }
        })
        .on('error', (err) => {
          console.error('Error optimizing video:', err);
        })
        .run();
      
      optimizedFileUrl = null;
    }
    // For documents: just keep the original
    else {
      fileUrl = `${baseUrl}/uploads/${userId}/${mediaType}/${file.filename}`;
      thumbnailUrl = null;
      optimizedFileUrl = null;
    }
    
    // Create media record in database
    const media = await Media.create({
      fileName: newFileName,
      originalFileName: file.originalname,
      fileType: file.mimetype,
      fileSize: optimizedSize,
      fileUrl,
      thumbnailUrl,
      optimizedFileUrl,
      userId,
      isOptimized
    });
    
    res.status(201).json({
      success: true,
      message: 'Media uploaded successfully',
      media: {
        id: media._id,
        fileName: media.fileName,
        originalFileName: media.originalFileName,
        fileType: media.fileType,
        fileSize: media.fileSize,
        fileUrl: media.fileUrl,
        thumbnailUrl: media.thumbnailUrl,
        optimizedFileUrl: media.optimizedFileUrl,
        isOptimized: media.isOptimized,
        createdAt: media.createdAt
      }
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      error: true,
      message: error.message || 'An error occurred uploading media'
    });
  }
};

/**
 * @desc    Get all media files for a user
 * @route   GET /api/media
 * @access  Private
 */
export const getUserMedia = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: 'User not authenticated'
      });
    }
    
    const userId = req.user._id.toString();
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    // Optional filters
    const fileType = req.query.fileType as string;
    
    // Build query
    const query: any = { userId };
    if (fileType) {
      if (fileType === 'image') {
        query.fileType = { $regex: '^image/' };
      } else if (fileType === 'video') {
        query.fileType = { $regex: '^video/' };
      } else {
        query.fileType = fileType;
      }
    }
    
    // Count total matching documents
    const total = await Media.countDocuments(query);
    
    // Get media with pagination
    const media = await Media.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    res.status(200).json({
      success: true,
      count: media.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      media: media.map(item => ({
        id: item._id,
        fileName: item.fileName,
        originalFileName: item.originalFileName,
        fileType: item.fileType,
        fileSize: item.fileSize,
        fileUrl: item.fileUrl,
        thumbnailUrl: item.thumbnailUrl,
        optimizedFileUrl: item.optimizedFileUrl,
        isOptimized: item.isOptimized,
        createdAt: item.createdAt
      }))
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      error: true,
      message: error.message || 'An error occurred retrieving media'
    });
  }
};

/**
 * @desc    Get a media file by ID
 * @route   GET /api/media/:id
 * @access  Private
 */
export const getMediaById = async (req: Request, res: Response) => {
  try {
    const mediaId = req.params.id;
    
    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: 'User not authenticated'
      });
    }
    
    const userId = req.user._id.toString();
    
    const media = await Media.findOne({ _id: mediaId, userId });
    
    if (!media) {
      throw new ApiError('Media not found', 404);
    }
    
    res.status(200).json({
      success: true,
      media: {
        id: media._id,
        fileName: media.fileName,
        originalFileName: media.originalFileName,
        fileType: media.fileType,
        fileSize: media.fileSize,
        fileUrl: media.fileUrl,
        thumbnailUrl: media.thumbnailUrl,
        optimizedFileUrl: media.optimizedFileUrl,
        isOptimized: media.isOptimized,
        createdAt: media.createdAt
      }
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      error: true,
      message: error.message || 'An error occurred retrieving media'
    });
  }
};

/**
 * @desc    Delete a media file
 * @route   DELETE /api/media/:id
 * @access  Private
 */
export const deleteMedia = async (req: Request, res: Response) => {
  try {
    const mediaId = req.params.id;
    
    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: 'User not authenticated'
      });
    }
    
    const userId = req.user._id.toString();
    
    const media = await Media.findOne({ _id: mediaId, userId });
    
    if (!media) {
      throw new ApiError('Media not found', 404);
    }
    
    // Determine media type
    const mediaType = isImage(media.fileType) ? 'images' : 
                      isVideo(media.fileType) ? 'videos' : 'documents';
    
    // For WebP optimized images, they might only exist in the optimized folder,
    // and fileUrl might point directly to the optimized file
    
    // First check if the file is stored in the normal location
    if (media.fileUrl && !media.fileUrl.includes('/optimized/')) {
      const filePath = getUserFilePath(userId, mediaType, media.fileName);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    // Delete thumbnail if exists
    if (media.thumbnailUrl) {
      const thumbnailFilename = path.basename(media.thumbnailUrl);
      const thumbnailPath = getThumbnailPath(userId, thumbnailFilename);
      
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }
    }
    
    // Delete optimized version if exists
    if (media.optimizedFileUrl || media.fileUrl.includes('/optimized/')) {
      const fileUrl = media.optimizedFileUrl || media.fileUrl;
      const optimizedFilename = path.basename(fileUrl);
      const optimizedPath = getOptimizedPath(userId, mediaType, optimizedFilename);
      
      if (fs.existsSync(optimizedPath)) {
        fs.unlinkSync(optimizedPath);
      }
    }
    
    // Delete from database
    await media.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Media deleted successfully',
      id: mediaId
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      error: true,
      message: error.message || 'An error occurred deleting media'
    });
  }
};

/**
 * @desc    Optimize a media file
 * @route   POST /api/media/:id/optimize
 * @access  Private
 */
export const optimizeMedia = async (req: Request, res: Response) => {
  try {
    const mediaId = req.params.id;
    
    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: 'User not authenticated'
      });
    }
    
    const userId = req.user._id.toString();
    
    const media = await Media.findOne({ _id: mediaId, userId });
    
    if (!media) {
      throw new ApiError('Media not found', 404);
    }
    
    // If the media is already optimized, just return the optimized URL
    if (media.isOptimized && media.optimizedFileUrl) {
      return res.status(200).json({
        success: true,
        message: 'Media already optimized',
        media: {
          id: media._id,
          optimizedFileUrl: media.optimizedFileUrl,
          isOptimized: media.isOptimized
        }
      });
    }
    
    // Determine media type
    const mediaType = isImage(media.fileType) ? 'images' : 
                      isVideo(media.fileType) ? 'videos' : 'documents';
    
    // Use account-based structure for optimized files
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    // For images: Convert to WebP (if not already WebP format)
    if (isImage(media.fileType)) {
      // If the file is not already in WebP format, convert it
      if (!media.fileName.endsWith('.webp')) {
        const webpFilename = `opt_${path.parse(media.fileName).name}.webp`;
        const optimizedPath = getOptimizedPath(userId, mediaType, webpFilename);
        const optimizedUrl = `${baseUrl}/uploads/${userId}/${mediaType}/optimized/${webpFilename}`;
        
        // Get the source path - this could be the original file
        const sourcePath = getUserFilePath(userId, mediaType, media.fileName);
        
        // Ensure the optimized directory exists
        ensureUserDirExists(userId, `${mediaType}/optimized`);
        
        // Convert to WebP with good quality
        await sharp(sourcePath)
          .webp({ quality: 80 })
          .toFile(optimizedPath);
        
        // Get the file size of the optimized WebP file
        const optimizedStats = fs.statSync(optimizedPath);
        
        // Update the database record
        media.optimizedFileUrl = optimizedUrl;
        media.isOptimized = true;
        media.fileSize = optimizedStats.size; // Update the file size to the optimized size
        await media.save();
        
        // Delete the original file if it exists and is different from the optimized file
        if (fs.existsSync(sourcePath) && sourcePath !== optimizedPath) {
          fs.unlinkSync(sourcePath);
          
          // Update the fileUrl to point to the optimized version
          media.fileUrl = optimizedUrl;
          await media.save();
        }
        
        return res.status(200).json({
          success: true,
          message: 'Image optimized successfully',
          media: {
            id: media._id,
            fileUrl: media.fileUrl,
            optimizedFileUrl: media.optimizedFileUrl,
            isOptimized: media.isOptimized,
            fileSize: media.fileSize
          }
        });
      } else {
        // The file is already in WebP format, just mark it as optimized
        media.isOptimized = true;
        await media.save();
        
        return res.status(200).json({
          success: true,
          message: 'Image already in optimal WebP format',
          media: {
            id: media._id,
            fileUrl: media.fileUrl,
            isOptimized: media.isOptimized
          }
        });
      }
    } 
    // For videos: Optimize to MP4 with H.264
    else if (isVideo(media.fileType)) {
      const optimizedFilename = `opt_${path.parse(media.fileName).name}.mp4`;
      const optimizedPath = getOptimizedPath(userId, mediaType, optimizedFilename);
      const optimizedUrl = `${baseUrl}/uploads/${userId}/${mediaType}/optimized/${optimizedFilename}`;
      
      // Get the source path
      const sourcePath = getUserFilePath(userId, mediaType, media.fileName);
      
      // Ensure the optimized directory exists
      ensureUserDirExists(userId, `${mediaType}/optimized`);
      
      // Start the optimization process
      ffmpeg(sourcePath)
        .outputOptions([
          '-c:v libx264',
          '-crf 28',
          '-preset medium',
          '-c:a aac',
          '-b:a 128k'
        ])
        .output(optimizedPath)
        .on('end', async () => {
          try {
            // Get the file size of the optimized video
            const optimizedStats = fs.statSync(optimizedPath);
            
            // Update database record after optimization completes
            media.optimizedFileUrl = optimizedUrl;
            media.isOptimized = true;
            media.fileSize = optimizedStats.size;
            
            // Point the main fileUrl to the optimized version
            media.fileUrl = optimizedUrl;
            await media.save();
            
            // Delete the original file to save space
            if (fs.existsSync(sourcePath) && sourcePath !== optimizedPath) {
              fs.unlinkSync(sourcePath);
            }
            
            console.log(`Video optimized: ${media.fileName}`);
          } catch (err) {
            console.error('Error updating media record after optimization:', err);
          }
        })
        .on('error', (err) => {
          console.error('Error optimizing video:', err);
        })
        .run();
      
      return res.status(202).json({
        success: true,
        message: 'Video optimization started',
        media: {
          id: media._id
        }
      });
    } else {
      throw new ApiError('File type not supported for optimization', 400);
    }
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      error: true,
      message: error.message || 'An error occurred optimizing media'
    });
  }
};