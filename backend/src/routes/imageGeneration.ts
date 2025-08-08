import express from 'express';
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
      size: '512x512',
      quality: 'standard',
      maxRetries: 3
    });
    processingPipeline = new ProcessingPipeline(imageGeneratorService);
  }
  return processingPipeline;
};

/**
 * GET /api/image-generation/status/:sessionId
 * Get image generation status for a session
 */
router.get('/status/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const pipeline = initializeServices();
    
    const status = pipeline.getImageGenerationStatus(sessionId);
    
    if (!status) {
      const response: ApiResponse = {
        success: false,
        error: 'Session not found or image generation not available'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        sessionId,
        progress: status,
        timestamp: new Date().toISOString()
      }
    };

    return res.json(response);
  } catch (error) {
    console.error('Error getting image generation status:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get image generation status'
    };
    return res.status(500).json(response);
  }
});

/**
 * POST /api/image-generation/regenerate/:sessionId
 * Regenerate images for specific menu items
 */
router.post('/regenerate/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { menuItemIds } = req.body;
    
    if (!Array.isArray(menuItemIds) || menuItemIds.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'menuItemIds must be a non-empty array'
      };
      return res.status(400).json(response);
    }

    const pipeline = initializeServices();
    const success = await pipeline.regenerateImages(sessionId, menuItemIds);
    
    if (!success) {
      const response: ApiResponse = {
        success: false,
        error: 'Failed to start image regeneration'
      };
      return res.status(400).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        sessionId,
        regeneratingItems: menuItemIds,
        message: 'Image regeneration started'
      }
    };

    return res.json(response);
  } catch (error) {
    console.error('Error regenerating images:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to regenerate images'
    };
    return res.status(500).json(response);
  }
});

/**
 * GET /api/image-generation/queue-status
 * Get overall queue status
 */
router.get('/queue-status', async (_req, res) => {
  try {
    // const pipeline = initializeServices(); // Not used currently
    
    // Access the batch service through the pipeline (would need to expose this)
    // For now, return a simple status
    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Image generation service is running',
        timestamp: new Date().toISOString()
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting queue status:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get queue status'
    };
    res.status(500).json(response);
  }
});

export default router;