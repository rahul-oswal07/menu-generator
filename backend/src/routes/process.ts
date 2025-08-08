import express from 'express';
import fs from 'fs';
import path from 'path';
import { asyncHandler } from '../middleware/errorHandler';
import { ImageGeneratorService } from '../services/ImageGeneratorService';
import { ProcessingPipeline } from '../services/ProcessingPipeline';
import { ApiResponse } from '../types';

const router = express.Router();

// Initialize services (in a real app, these would be injected)
let processingPipeline: ProcessingPipeline;

// Initialize with environment configuration
const initializeServices = () => {
  if (!processingPipeline) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for image generation.');
    }
    const imageGeneratorService = new ImageGeneratorService({
      apiKey,
      model: 'dall-e-3',
      quality: 'standard',
      size: '1024x1024',
      maxRetries: 3
    });
    processingPipeline = new ProcessingPipeline(imageGeneratorService);
  }
  return processingPipeline;
};

/**
 * @swagger
 * /api/process:
 *   post:
 *     tags: [Processing]
 *     summary: Start menu processing
 *     description: Begin OCR processing and AI image generation for an uploaded menu
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: Session ID from the upload response
 *             required:
 *               - sessionId
 *           example:
 *             sessionId: "session_1234567890_abc123"
 *     responses:
 *       200:
 *         description: Processing started successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         sessionId:
 *                           type: string
 *                         status:
 *                           type: string
 *                           enum: [processing]
 *                         message:
 *                           type: string
 *             example:
 *               success: true
 *               data:
 *                 sessionId: "session_1234567890_abc123"
 *                 status: "processing"
 *                 message: "Processing started successfully"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// POST /api/process - Start processing a menu image
router.post('/process', asyncHandler(async (req: express.Request, res: express.Response) => {

  let { sessionId } = req.body;
  // If sessionId is an array (e.g., from form-data), use the first value
  if (Array.isArray(sessionId)) {
    sessionId = sessionId[0];
  }
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Session ID is required and must be a string'
    } as ApiResponse);
  }

  try {
    const pipeline = initializeServices();

    // Find the actual uploaded file in the session directory
    const sessionDir = path.join(process.cwd(), 'uploads', `session_${sessionId}`, 'original');

    console.log(sessionDir);

    // Check if session directory exists
    if (!fs.existsSync(sessionDir)) {
      return res.status(404).json({
        success: false,
        error: 'SESSION_NOT_FOUND',
        message: 'No uploaded file found for this session'
      } as ApiResponse);
    }

    // Get all files in the session directory
    const files = fs.readdirSync(sessionDir);

    // Find the uploaded menu image file (starts with 'menu-image-')
    const uploadedFile = files.find(file => file.startsWith('menu-image-'));

    if (!uploadedFile) {
      return res.status(404).json({
        success: false,
        error: 'FILE_NOT_FOUND',
        message: 'No uploaded menu image found for this session'
      } as ApiResponse);
    }

    // Construct the correct image URL with the actual filename
    const imageUrl = `/uploads/session_${sessionId}/original/${uploadedFile}`;

    console.log(`Starting processing for session ${sessionId} with file: ${uploadedFile}`);

    // Start processing asynchronously
    pipeline.processMenuImage(sessionId, imageUrl)
      .then(() => {
        console.log(`\nProcessing completed for session: ${sessionId}`);
      })
      .catch((error) => {
        console.error(`Processing failed for session ${sessionId}:`, error);
      });

    // Return immediate response
    return res.json({
      success: true,
      data: {
        sessionId,
        status: 'processing',
        message: 'Processing started successfully'
      }
    } as ApiResponse);

  } catch (error) {
    console.error('Process endpoint error:', error);

    return res.status(500).json({
      success: false,
      error: 'PROCESSING_ERROR',
      message: 'Failed to start processing'
    } as ApiResponse);
  }
}));

/**
 * @swagger
 * /api/status/{sessionId}:
 *   get:
 *     tags: [Processing]
 *     summary: Get processing status
 *     description: Check the current status and progress of menu processing
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session identifier
 *         example: "session_1234567890_abc123"
 *     responses:
 *       200:
 *         description: Processing status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ProcessingStatusResponse'
 *             example:
 *               success: true
 *               data:
 *                 sessionId: "session_1234567890_abc123"
 *                 status: "processing"
 *                 progress: 75
 *                 currentStage: "Generating dish images..."
 *                 estimatedTimeRemaining: 15
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// GET /api/status/:sessionId - Get processing status
router.get('/status/:sessionId', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { sessionId } = req.params;

  try {
    const pipeline = initializeServices();
    const progress = pipeline.getProcessingProgress(sessionId);

    if (!progress) {
      // Try to get results to determine if processing is complete
      const results = await pipeline.getProcessingResults(sessionId);

      if (results) {
        // Processing is complete
        res.json({
          success: true,
          data: {
            sessionId,
            status: results.processingStatus,
            progress: results.processingStatus === 'completed' ? 100 : 0,
            currentStage: results.processingStatus === 'completed' ? 'Processing complete' : 'Processing failed'
          }
        } as ApiResponse);
      } else {
        // No progress found
        res.status(404).json({
          success: false,
          error: 'SESSION_NOT_FOUND',
          message: 'Session not found or processing not started'
        } as ApiResponse);
      }
    } else {
      res.json({
        success: true,
        data: progress
      } as ApiResponse);
    }

  } catch (error) {
    console.error('Status endpoint error:', error);

    res.status(500).json({
      success: false,
      error: 'STATUS_ERROR',
      message: 'Failed to get processing status'
    } as ApiResponse);
  }
}));

/**
 * @swagger
 * /api/regenerate:
 *   post:
 *     tags: [Processing]
 *     summary: Regenerate dish image
 *     description: Regenerate AI-generated image for a specific menu item
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: Session ID
 *               itemId:
 *                 type: string
 *                 description: Menu item ID to regenerate image for
 *             required:
 *               - sessionId
 *               - itemId
 *           example:
 *             sessionId: "session_1234567890_abc123"
 *             itemId: "item_abc123"
 *     responses:
 *       200:
 *         description: Image regeneration started successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         sessionId:
 *                           type: string
 *                         itemId:
 *                           type: string
 *                         status:
 *                           type: string
 *                           enum: [regenerating]
 *             example:
 *               success: true
 *               data:
 *                 sessionId: "session_1234567890_abc123"
 *                 itemId: "item_abc123"
 *                 status: "regenerating"
 *               message: "Image regeneration started"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// POST /api/regenerate - Regenerate images for specific items
router.post('/regenerate', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { sessionId, itemId } = req.body;

  if (!sessionId || !itemId) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Session ID and item ID are required'
    } as ApiResponse);
  }

  try {
    const pipeline = initializeServices();
    const success = await pipeline.regenerateImages(sessionId, [itemId]);

    if (success) {
      return res.json({
        success: true,
        data: {
          sessionId,
          itemId,
          status: 'regenerating'
        },
        message: 'Image regeneration started'
      } as ApiResponse);
    } else {
      return res.status(400).json({
        success: false,
        error: 'REGENERATION_ERROR',
        message: 'Failed to start image regeneration'
      } as ApiResponse);
    }

  } catch (error) {
    console.error('Regenerate endpoint error:', error);

    return res.status(500).json({
      success: false,
      error: 'REGENERATION_ERROR',
      message: 'Failed to regenerate image'
    } as ApiResponse);
  }
}));

export default router;