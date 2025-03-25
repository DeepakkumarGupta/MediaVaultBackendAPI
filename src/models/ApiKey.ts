import mongoose, { Document, Schema, Model } from 'mongoose';
import crypto from 'crypto';

// API Key document interface
export interface IApiKey extends Document {
  key: string;
  name: string;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  lastUsed?: Date;
}

// API Key model interface with static methods
interface IApiKeyModel extends Model<IApiKey> {
  generateKey(): string;
}

// API Key schema
const apiKeySchema = new Schema<IApiKey>({
  key: {
    type: String,
    required: [true, 'API key is required'],
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'API key name is required'],
    trim: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUsed: {
    type: Date
  }
});

// Add compound index for userId and createdAt for faster lookups
apiKeySchema.index({ userId: 1, createdAt: -1 });

// Static method to generate a random API key
apiKeySchema.statics.generateKey = function(): string {
  // Create a secure random string (32 bytes = 64 hex chars)
  return crypto.randomBytes(32).toString('hex');
};

// Create and export the ApiKey model
const ApiKey = mongoose.model<IApiKey, IApiKeyModel>('ApiKey', apiKeySchema);

export default ApiKey;