"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ResultsManager_1 = require("../services/ResultsManager");
const router = (0, express_1.Router)();
const resultsManager = new ResultsManager_1.ResultsManager();
router.get('/:shareId', async (req, res) => {
    try {
        const { shareId } = req.params;
        const shareLink = resultsManager.getShareLink(shareId);
        if (!shareLink) {
            const response = {
                success: false,
                error: 'share_link_not_found',
                message: 'Share link not found or has expired'
            };
            return res.status(404).json(response);
        }
        const results = await resultsManager.getResults(shareLink.sessionId);
        if (!results) {
            const response = {
                success: false,
                error: 'results_not_found',
                message: 'Original results no longer available'
            };
            return res.status(404).json(response);
        }
        const menuItem = results.extractedItems.find(item => item.id === shareLink.menuItemId);
        const generatedImage = results.generatedImages.find(img => img.menuItemId === shareLink.menuItemId);
        if (!menuItem || !generatedImage) {
            const response = {
                success: false,
                error: 'item_not_found',
                message: 'Menu item or image not found'
            };
            return res.status(404).json(response);
        }
        const response = {
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
    }
    catch (error) {
        console.error('Error accessing shared content:', error);
        const response = {
            success: false,
            error: 'server_error',
            message: 'Failed to access shared content'
        };
        return res.status(500).json(response);
    }
});
router.get('/:shareId/image', async (req, res) => {
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
        return res.redirect(shareLink.url);
    }
    catch (error) {
        console.error('Error accessing shared image:', error);
        return res.status(500).json({
            success: false,
            error: 'server_error',
            message: 'Failed to access shared image'
        });
    }
});
exports.default = router;
//# sourceMappingURL=share.js.map