import { Router, Request, Response } from 'express';
import { ResultsManager } from '../services/ResultsManager';
import { ApiResponse } from '../types';

const router = Router();

// Initialize results manager
const resultsManager = new ResultsManager();

/**
 * GET /api/share/:shareId
 * Access a shared dish image
 */
router.get('/:shareId', async (req: Request, res: Response) => {
  try {
    const { shareId } = req.params;
    
    const shareLink = resultsManager.getShareLink(shareId);
    
    if (!shareLink) {
      const response: ApiResponse = {
        success: false,
        error: 'share_link_not_found',
        message: 'Share link not found or has expired'
      };
      return res.status(404).json(response);
    }

    // Get the full results to provide context
    const results = await resultsManager.getResults(shareLink.sessionId);
    
    if (!results) {
      const response: ApiResponse = {
        success: false,
        error: 'results_not_found',
        message: 'Original results no longer available'
      };
      return res.status(404).json(response);
    }

    // Find the specific menu item and image
    const menuItem = results.extractedItems.find(item => item.id === shareLink.menuItemId);
    const generatedImage = results.generatedImages.find(img => img.menuItemId === shareLink.menuItemId);

    if (!menuItem || !generatedImage) {
      const response: ApiResponse = {
        success: false,
        error: 'item_not_found',
        message: 'Menu item or image not found'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        shareId,
        menuItem,
        generatedImage,
        sharedAt: shareLink.createdAt.toISOString(),
        expiresAt: shareLink.expiresAt.toISOString()
      },
      message: 'Shared content retrieved successfully'
    };

    return res.json(response);
  } catch (error) {
    console.error('Error accessing shared content:', error);
    const response: ApiResponse = {
      success: false,
      error: 'server_error',
      message: 'Failed to access shared content'
    };
    return res.status(500).json(response);
  }
});

/**
 * GET /api/share/:shareId/image
 * Direct access to the shared image file
 */
router.get('/:shareId/image', async (req: Request, res: Response) => {
  try {
    const { shareId } = req.params;
    
    const shareLink = resultsManager.getShareLink(shareId);
    
    if (!shareLink) {
      return res.status(404).json({
        success: false,
        error: 'share_link_not_found',
        message: 'Share link not found or has expired'
      });
    }

    // Redirect to the actual image URL
    return res.redirect(shareLink.url);
  } catch (error) {
    console.error('Error accessing shared image:', error);
    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Failed to access shared image'
    });
  }
});

export default router;