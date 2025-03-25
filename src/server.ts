import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import path from 'path';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/error.middleware';
import dbConnect from './config/database';

// Import routes
import authRoutes from './routes/auth.routes';
import mediaRoutes from './routes/media.routes';
import apiKeyRoutes from './routes/apiKey.routes';
import externalRoutes from './routes/external.routes';

// Load environment variables
dotenv.config();

// Create Express app
const app: Express = express();
const PORT = parseInt(process.env.PORT || '5001', 10);

// Connect to MongoDB
dbConnect();

// Middlewares
app.use(cors({
  "origin": ["*", "http://localhost:3000"],
  credentials: true,
  exposedHeaders: ['Content-Disposition'], // Expose headers if needed
})); // Enable CORS for all routes
app.use(express.json()); // Parse JSON requests
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded requests
app.use(morgan('dev')); // HTTP request logger
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
})); // Security headers

// Serve static files
const uploadsPath = process.env.UPLOAD_PATH || './uploads';
app.use('/uploads', express.static(path.join(__dirname, '..', uploadsPath)));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/keys', apiKeyRoutes);
app.use('/api/external', externalRoutes);

// Root route
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Media Vault API',
    version: '1.0.0',
    status: 'running'
  });
});

// Error handling middleware
app.use(errorHandler);

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;