"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ResultsManager_1 = require("../services/ResultsManager");
const router = (0, express_1.Router)();
const resultsManager = new ResultsManager_1.ResultsManager();
router.get('/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const results = await resultsManager.getResults(sessionId);
        if (!results) {
            const response = {
                success: false,
                error: 'session_not_found',
                message: 'Session not found or results not available'
            };
            return res.status(404).json(response);
        }
        const response = {
            success: true,
            data: {
                sessionId,
                results
            },
            message: 'Results retrieved successfully'
        };
        return res.json(response);
    }
    catch (error) {
        console.error('Error retrieving results:', error);
        const response = {
            success: false,
            error: 'server_error',
            message: 'Failed to retrieve results'
        };
        return res.status(500).json(response);
    }
});
router.get('/:sessionId/status', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const status = await resultsManager.getProcessingStatus(sessionId);
        if (!status) {
            const response = {
                success: false,
                error: 'session_not_found',
                message: 'Session not found'
            };
            return res.status(404).json(response);
        }
        const response = {
            success: true,
            data: status,
            message: 'Status retrieved successfully'
        };
        return res.json(response);
    }
    catch (error) {
        console.error('Error retrieving status:', error);
        const response = {
            success: false,
            error: 'server_error',
            message: 'Failed to retrieve status'
        };
        return res.status(500).json(response);
    }
});
router.post('/:sessionId/save-image', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { menuItemId } = req.body;
        if (!menuItemId) {
            const response = {
                success: false,
                error: 'missing_parameter',
                message: 'menuItemId is required'
            };
            return res.status(400).json(response);
        }
        const downloadUrl = await resultsManager.generateDownloadUrl(sessionId, menuItemId);
        if (!downloadUrl) {
            const response = {
                success: false,
                error: 'image_not_found',
                message: 'Image not found or not available for download'
            };
            return res.status(404).json(response);
        }
        const response = {
            success: true,
            data: {
                downloadUrl,
                expiresAt: new Date(Date.now() + 3600000).toISOString()
            },
            message: 'Download URL generated successfully'
        };
        return res.json(response);
    }
    catch (error) {
        console.error('Error generating download URL:', error);
        const response = {
            success: false,
            error: 'server_error',
            message: 'Failed to generate download URL'
        };
        return res.status(500).json(response);
    }
});
router.post('/:sessionId/share-image', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { menuItemId } = req.body;
        if (!menuItemId) {
            const response = {
                success: false,
                error: 'missing_parameter',
                message: 'menuItemId is required'
            };
            return res.status(400).json(response);
        }
        const shareUrl = await resultsManager.generateShareUrl(sessionId, menuItemId);
        if (!shareUrl) {
            const response = {
                success: false,
                error: 'image_not_found',
                message: 'Image not found or not available for sharing'
            };
            return res.status(404).json(response);
        }
        const response = {
            success: true,
            data: {
                shareUrl,
                expiresAt: new Date(Date.now() + 7 * 24 * 3600000).toISOString()
            },
            message: 'Share URL generated successfully'
        };
        return res.json(response);
    }
    catch (error) {
        console.error('Error generating share URL:', error);
        const response = {
            success: false,
            error: 'server_error',
            message: 'Failed to generate share URL'
        };
        return res.status(500).json(response);
    }
});
router.delete('/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const success = await resultsManager.deleteSession(sessionId);
        if (!success) {
            const response = {
                success: false,
                error: 'session_not_found',
                message: 'Session not found or already deleted'
            };
            return res.status(404).json(response);
        }
        const response = {
            success: true,
            message: 'Session deleted successfully'
        };
        return res.json(response);
    }
    catch (error) {
        console.error('Error deleting session:', error);
        const response = {
            success: false,
            error: 'server_error',
            message: 'Failed to delete session'
        };
        return res.status(500).json(response);
    }
});
router.get('/:sessionId/cache-info', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const cacheInfo = await resultsManager.getCacheInfo(sessionId);
        if (!cacheInfo) {
            const response = {
                success: false,
                error: 'session_not_found',
                message: 'Session not found in cache'
            };
            return res.status(404).json(response);
        }
        const response = {
            success: true,
            data: cacheInfo,
            message: 'Cache info retrieved successfully'
        };
        return res.json(response);
    }
    catch (error) {
        console.error('Error retrieving cache info:', error);
        const response = {
            success: false,
            error: 'server_error',
            message: 'Failed to retrieve cache info'
        };
        return res.status(500).json(response);
    }
});
exports.default = router;
//# sourceMappingURL=results.js.map