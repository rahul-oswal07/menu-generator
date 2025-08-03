import { Router, Request, Response } from 'express';
import { ResultsManager } from '../services/ResultsManager';
import { ApiResponse, ResultsResponse, ProcessingStatusResponse } from '../types';

const router = Router();

// Initialize results manager
const resultsManager = new ResultsManager();

/**
 * @swagger
 * /api/results/{sessionId}:
 *   get:
 *     tags: [Results]
 *     summary: Get processing results
 *     description: Retrieve the complete processing results including extracted menu items and generated images
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
 *         description: Results retrieved successfully
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
 *                         results:
 *                           $ref: '#/components/schemas/ProcessingResult'
 *             example:
 *               success: true
 *               data:
 *                 sessionId: "session_1234567890_abc123"
 *                 results:
 *                   originalImage: "/uploads/session_1234567890_abc123/original/menu.jpg"
 *                   extractedItems:
 *                     - id: "item_1"
 *                       name: "Caesar Salad"
 *                       description: "Fresh romaine lettuce with parmesan cheese"
 *                       price: "$12.99"
 *                       category: "appetizer"
 *                   generatedImages:
 *                     - url: "/uploads/session_1234567890_abc123/generated/item_1.jpg"
 *                       menuItemId: "item_1"
 *                       status: "success"
 *                   processingStatus: "completed"
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const results = await resultsManager.getResults(sessionId);
    
    if (!results) {
      const response: ApiResponse = {
        success: false,
        error: 'session_not_found',
        message: 'Session not found or results not available'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<ResultsResponse> = {
      success: true,
      data: {
        sessionId,
        results
      },
      message: 'Results retrieved successfully'
    };

    return res.json(response);
  } catch (error) {
    console.error('Error retrieving results:', error);
    const response: ApiResponse = {
      success: false,
      error: 'server_error',
      message: 'Failed to retrieve results'
    };
    return res.status(500).json(response);
  }
});

/**
 * @swagger
 * /api/results/{sessionId}/status:
 *   get:
 *     tags: [Results]
 *     summary: Get processing status (alternative endpoint)
 *     description: Alternative endpoint to check processing status for a session
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
 *         description: Status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ProcessingStatusResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/:sessionId/status', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const status = await resultsManager.getProcessingStatus(sessionId);
    
    if (!status) {
      const response: ApiResponse = {
        success: false,
        error: 'session_not_found',
        message: 'Session not found'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<ProcessingStatusResponse> = {
      success: true,
      data: status,
      message: 'Status retrieved successfully'
    };

    return res.json(response);
  } catch (error) {
    console.error('Error retrieving status:', error);
    const response: ApiResponse = {
      success: false,
      error: 'server_error',
      message: 'Failed to retrieve status'
    };
    return res.status(500).json(response);
  }
});

/**
 * POST /api/results/:sessionId/save-image
 * Save/download a specific dish image
 */
router.post('/:sessionId/save-image', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { menuItemId } = req.body;
    
    if (!menuItemId) {
      const response: ApiResponse = {
        success: false,
        error: 'missing_parameter',
        message: 'menuItemId is required'
      };
      return res.status(400).json(response);
    }

    const downloadUrl = await resultsManager.generateDownloadUrl(sessionId, menuItemId);
    
    if (!downloadUrl) {
      const response: ApiResponse = {
        success: false,
        error: 'image_not_found',
        message: 'Image not found or not available for download'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        downloadUrl,
        expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
      },
      message: 'Download URL generated successfully'
    };

    return res.json(response);
  } catch (error) {
    console.error('Error generating download URL:', error);
    const response: ApiResponse = {
      success: false,
      error: 'server_error',
      message: 'Failed to generate download URL'
    };
    return res.status(500).json(response);
  }
});

/**
 * POST /api/results/:sessionId/share-image
 * Generate a shareable link for a dish image
 */
router.post('/:sessionId/share-image', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { menuItemId } = req.body;
    
    if (!menuItemId) {
      const response: ApiResponse = {
        success: false,
        error: 'missing_parameter',
        message: 'menuItemId is required'
      };
      return res.status(400).json(response);
    }

    const shareUrl = await resultsManager.generateShareUrl(sessionId, menuItemId);
    
    if (!shareUrl) {
      const response: ApiResponse = {
        success: false,
        error: 'image_not_found',
        message: 'Image not found or not available for sharing'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        shareUrl,
        expiresAt: new Date(Date.now() + 7 * 24 * 3600000).toISOString() // 7 days from now
      },
      message: 'Share URL generated successfully'
    };

    return res.json(response);
  } catch (error) {
    console.error('Error generating share URL:', error);
    const response: ApiResponse = {
      success: false,
      error: 'server_error',
      message: 'Failed to generate share URL'
    };
    return res.status(500).json(response);
  }
});

/**
 * DELETE /api/results/:sessionId
 * Delete session results and cleanup files
 */
router.delete('/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const success = await resultsManager.deleteSession(sessionId);
    
    if (!success) {
      const response: ApiResponse = {
        success: false,
        error: 'session_not_found',
        message: 'Session not found or already deleted'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Session deleted successfully'
    };

    return res.json(response);
  } catch (error) {
    console.error('Error deleting session:', error);
    const response: ApiResponse = {
      success: false,
      error: 'server_error',
      message: 'Failed to delete session'
    };
    return res.status(500).json(response);
  }
});

/**
 * GET /api/results/:sessionId/cache-info
 * Get cache information for a session
 */
router.get('/:sessionId/cache-info', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const cacheInfo = await resultsManager.getCacheInfo(sessionId);
    
    if (!cacheInfo) {
      const response: ApiResponse = {
        success: false,
        error: 'session_not_found',
        message: 'Session not found in cache'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: cacheInfo,
      message: 'Cache info retrieved successfully'
    };

    return res.json(response);
  } catch (error) {
    console.error('Error retrieving cache info:', error);
    const response: ApiResponse = {
      success: false,
      error: 'server_error',
      message: 'Failed to retrieve cache info'
    };
    return res.status(500).json(response);
  }
});

export default router;