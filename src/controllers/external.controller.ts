import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { v4 as uuidv4 } from 'uuid';
import Media from '../models/Media';
import User from '../models/User';
import { ApiError } from '../middleware/error.middleware';
import { isImage, isVideo } from '../utils';
import { 
  getUserFilePath, 
  getThumbnailPath, 
  getOptimizedPath, 
  ensureUserDirExists 
} from '../middleware/upload.middleware';

const BASE_UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';

/**
 * @desc    Upload a media file via external API
 * @route   POST /api/external/media
 * @access  API Key
 */
export const uploadMedia = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      throw new ApiError('No file uploaded', 400);
    }

    const file = req.file;
    const userId = req.userId; // Set by API key middleware
    const baseUrl = `https://${req.get('host')}`;
    
    // Ensure user exists
    if (!userId) {
      throw new ApiError('User ID is required', 401);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError('User associated with this API key not found', 401);
    }
    
    // Determine media type
    const mediaType = file.mimetype.startsWith('image') ? 'images' : 
                      file.mimetype.startsWith('video') ? 'videos' : 'documents';
    
    // Create optimized version and file URLs
    let fileUrl, thumbnailUrl, optimizedFileUrl;
    let isOptimized = false;
    let optimizedSize = file.size;
    let newFileName = file.filename;
    
    // For images: Convert to WebP immediately
    if (isImage(file.mimetype)) {
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
    // For videos: Keep the original and process asynchronously
    else if (isVideo(file.mimetype)) {
      // Generate file URL with account-based structure
      fileUrl = `${baseUrl}/uploads/${userId}/${mediaType}/${file.filename}`;
      
      // Create thumbnail for videos (first frame)
      const thumbnailFilename = `thumb_${path.parse(file.filename).name}.jpg`;
      const thumbnailPath = getThumbnailPath(userId, thumbnailFilename);
      
      // Ensure directories exist
      ensureUserDirExists(userId, 'thumbnails');
      ensureUserDirExists(userId, mediaType);
      
      // Generate thumbnail asynchronously
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
      
      // Move the video to user's folder
      const userVideoPath = getUserFilePath(userId, mediaType, file.filename);
      fs.renameSync(file.path, userVideoPath);
      
      // Start optimization process asynchronously
      const optimizedFilename = `opt_${path.parse(file.filename).name}.mp4`;
      const optimizedPath = getOptimizedPath(userId, mediaType, optimizedFilename);
      
      ensureUserDirExists(userId, `${mediaType}/optimized`);
      
      // Add a reference to the database record that will be created
      const dbRecordId = uuidv4();
      
      ffmpeg(userVideoPath)
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
        const optimizedUrl = `${baseUrl}/uploads/${userId}/${mediaType}/optimized/${optimizedFilename}`;
        const optimizedStats = fs.statSync(optimizedPath);
        
        await Media.findByIdAndUpdate(dbRecordId, {
          optimizedFileUrl: optimizedUrl,
          isOptimized: true,
          fileSize: optimizedStats.size
        });
        
        console.log(`Video optimized: ${file.filename}`);
        
        // Delete the original file after optimization is complete
        if (fs.existsSync(userVideoPath)) {
          fs.unlinkSync(userVideoPath);
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
 * @desc    Get all media files for a user via external API
 * @route   GET /api/external/media
 * @access  API Key
 */
export const getUserMedia = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new ApiError('User ID is required', 401);
    }
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
 * @desc    Get a media file by ID via external API
 * @route   GET /api/external/media/:id
 * @access  API Key
 */
export const getMediaById = async (req: Request, res: Response) => {
  try {
    const mediaId = req.params.id;
    const userId = req.userId; // Set by API key middleware
    
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
 * @desc    Delete a media file via external API
 * @route   DELETE /api/external/media/:id
 * @access  API Key
 */
export const deleteMedia = async (req: Request, res: Response) => {
  try {
    const mediaId = req.params.id;
    const userId = req.userId;
    
    if (!userId) {
      throw new ApiError('User ID is required', 401);
    }
    
    const media = await Media.findOne({ _id: mediaId, userId });
    
    if (!media) {
      throw new ApiError('Media not found', 404);
    }
    
    // Determine media type
    const mediaType = isImage(media.fileType) ? 'images' : 
                     isVideo(media.fileType) ? 'videos' : 'documents';
    
    // Delete original file if it exists in normal location
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