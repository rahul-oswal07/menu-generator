"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ProcessingPipeline_1 = require("../services/ProcessingPipeline");
const ImageGeneratorService_1 = require("../services/ImageGeneratorService");
const router = express_1.default.Router();
let processingPipeline;
const initializeServices = () => {
    if (!processingPipeline) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) {
            const imageGeneratorService = new ImageGeneratorService_1.ImageGeneratorService({
                apiKey,
                size: '512x512',
                quality: 'standard',
                maxRetries: 3
            });
            processingPipeline = new ProcessingPipeline_1.ProcessingPipeline(imageGeneratorService);
        }
        else {
            processingPipeline = new ProcessingPipeline_1.ProcessingPipeline();
        }
    }
    return processingPipeline;
};
router.get('/status/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const pipeline = initializeServices();
        const status = pipeline.getImageGenerationStatus(sessionId);
        if (!status) {
            const response = {
                success: false,
                error: 'Session not found or image generation not available'
            };
            return res.status(404).json(response);
        }
        const response = {
            success: true,
            data: {
                sessionId,
                progress: status,
                timestamp: new Date().toISOString()
            }
        };
        return res.json(response);
    }
    catch (error) {
        console.error('Error getting image generation status:', error);
        const response = {
            success: false,
            error: 'Failed to get image generation status'
        };
        return res.status(500).json(response);
    }
});
router.post('/regenerate/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { menuItemIds } = req.body;
        if (!Array.isArray(menuItemIds) || menuItemIds.length === 0) {
            const response = {
                success: false,
                error: 'menuItemIds must be a non-empty array'
            };
            return res.status(400).json(response);
        }
        const pipeline = initializeServices();
        const success = await pipeline.regenerateImages(sessionId, menuItemIds);
        if (!success) {
            const response = {
                success: false,
                error: 'Failed to start image regeneration'
            };
            return res.status(400).json(response);
        }
        const response = {
            success: true,
            data: {
                sessionId,
                regeneratingItems: menuItemIds,
                message: 'Image regeneration started'
            }
        };
        return res.json(response);
    }
    catch (error) {
        console.error('Error regenerating images:', error);
        const response = {
            success: false,
            error: 'Failed to regenerate images'
        };
        return res.status(500).json(response);
    }
});
router.get('/queue-status', async (_req, res) => {
    try {
        const response = {
            success: true,
            data: {
                message: 'Image generation service is running',
                timestamp: new Date().toISOString()
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error getting queue status:', error);
        const response = {
            success: false,
            error: 'Failed to get queue status'
        };
        res.status(500).json(response);
    }
});
exports.default = router;
//# sourceMappingURL=imageGeneration.js.map