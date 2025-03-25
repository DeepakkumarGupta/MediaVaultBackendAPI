import mongoose, { Document, Schema } from 'mongoose';

// Media document interface
export interface IMedia extends Document {
  fileName: string;
  originalFileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  thumbnailUrl?: string;
  userId: mongoose.Types.ObjectId;
  optimizedFileUrl?: string;
  isOptimized: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Media schema
const mediaSchema = new Schema<IMedia>(
  {
    fileName: {
      type: String,
      required: [true, 'Filename is required']
    },
    originalFileName: {
      type: String,
      required: [true, 'Original filename is required']
    },
    fileType: {
      type: String,
      required: [true, 'File type is required']
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required']
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL is required']
    },
    thumbnailUrl: {
      type: String
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required']
    },
    optimizedFileUrl: {
      type: String
    },
    isOptimized: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Add compound index for userId and createdAt for faster lookups
mediaSchema.index({ userId: 1, createdAt: -1 });

// Add text index for search functionality
mediaSchema.index({ originalFileName: 'text' });

// Create and export the Media model
const Media = mongoose.model<IMedia>('Media', mediaSchema);

export default Media;