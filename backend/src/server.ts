/**
 * @swagger
 * /:
 *   get:
 *     tags: [General]
 *     summary: API information
 *     description: Get basic information about the AI Menu Generator API
 *     responses:
 *       200:
 *         description: API information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 version:
 *                   type: string
 *                 endpoints:
 *                   type: object
 *                   additionalProperties:
 *                     type: string
 *             example:
 *               message: "AI Menu Generator API"
 *               version: "1.0.0"
 *               endpoints:
 *                 upload: "/api/upload"
 *                 process: "/api/process"
 *                 results: "/api/results"
 *                 health: "/api/health"
 *                 docs: "/api-docs"
 */

// Main server entry point
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import uploadRoutes from './routes/upload';
import imageGenerationRoutes from './routes/imageGeneration';
import resultsRoutes from './routes/results';
import shareRoutes from './routes/share';
import errorRoutes from './routes/errors';
import healthRoutes from './routes/health';
import processRoutes from './routes/process';
import { 
  globalErrorHandler, 
  handleUnhandledRejection, 
  handleUncaughtException 
} from './middleware/errorHandler';
import logger from './utils/logger';
import HealthMonitoringService from './services/HealthMonitoringService';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';

dotenv.config();

// Set up global error handlers
handleUnhandledRejection();
handleUncaughtException();

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request metrics middleware
app.use((_req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const isError = res.statusCode >= 400;
    HealthMonitoringService.recordRequest(responseTime, isError);
  });
  
  next();
});

// Image optimization middleware for uploads
import imageOptimizationMiddleware from './middleware/imageOptimization';
app.use('/uploads', imageOptimizationMiddleware);

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/api', uploadRoutes);
app.use('/api/image-generation', imageGenerationRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/errors', errorRoutes);
app.use('/api/health', healthRoutes);
app.use('/api', processRoutes);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'AI Menu Generator API Documentation'
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Legacy health check endpoint (redirect to new endpoint)
app.get('/health', (_req, res) => {
  res.redirect('/api/health');
});

// Root endpoint
app.get('/', (_req, res) => {
  res.json({ 
    message: 'AI Menu Generator API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      healthDetailed: '/api/health/detailed',
      metrics: '/api/health/metrics',
      dashboard: '/api/health/dashboard',
      process: '/api/process',
      status: '/api/status/:sessionId',
      regenerate: '/api/regenerate',
      docs: '/api-docs',
      docsJson: '/api-docs.json',
      upload: '/api/upload',
      imageGeneration: '/api/image-generation',
      results: '/api/results',
      share: '/api/share'
    }
  });
});

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({
    success: false,
    error: 'not_found',
    message: 'Endpoint not found.'
  });
});

// Global error handler (must be last)
app.use(globalErrorHandler);

app.listen(PORT, () => {
  logger.info(`Server started successfully`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.FRONTEND_URL || 'http://localhost:3000'
  });
});

export default app;