"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ProcessingPipeline_1 = require("../services/ProcessingPipeline");
const ImageGeneratorService_1 = require("../services/ImageGeneratorService");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
let processingPipeline;
const initializeServices = () => {
    if (!processingPipeline) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) {
            const imageGeneratorService = new ImageGeneratorService_1.ImageGeneratorService({
                apiKey,
                model: 'dall-e-3',
                quality: 'standard',
                size: '1024x1024',
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
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) {
        return res.status(400).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Session ID is required'
        });
    }
    try {
        const pipeline = initializeServices();
        const imageUrl = `/uploads/${sessionId}/original/menu.jpg`;
        pipeline.processMenuImage(sessionId, imageUrl)
            .then(() => {
            console.log(`Processing completed for session: ${sessionId}`);
        })
            .catch((error) => {
            console.error(`Processing failed for session ${sessionId}:`, error);
        });
        return res.json({
            success: true,
            data: {
                sessionId,
                status: 'processing',
                message: 'Processing started successfully'
            }
        });
    }
    catch (error) {
        console.error('Process endpoint error:', error);
        return res.status(500).json({
            success: false,
            error: 'PROCESSING_ERROR',
            message: 'Failed to start processing'
        });
    }
}));
router.get('/status/:sessionId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { sessionId } = req.params;
    try {
        const pipeline = initializeServices();
        const progress = pipeline.getProcessingProgress(sessionId);
        if (!progress) {
            const results = await pipeline.getProcessingResults(sessionId);
            if (results) {
                res.json({
                    success: true,
                    data: {
                        sessionId,
                        status: results.processingStatus,
                        progress: results.processingStatus === 'completed' ? 100 : 0,
                        currentStage: results.processingStatus === 'completed' ? 'Processing complete' : 'Processing failed'
                    }
                });
            }
            else {
                res.status(404).json({
                    success: false,
                    error: 'SESSION_NOT_FOUND',
                    message: 'Session not found or processing not started'
                });
            }
        }
        else {
            res.json({
                success: true,
                data: progress
            });
        }
    }
    catch (error) {
        console.error('Status endpoint error:', error);
        res.status(500).json({
            success: false,
            error: 'STATUS_ERROR',
            message: 'Failed to get processing status'
        });
    }
}));
router.post('/regenerate', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { sessionId, itemId } = req.body;
    if (!sessionId || !itemId) {
        return res.status(400).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Session ID and item ID are required'
        });
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
            });
        }
        else {
            return res.status(400).json({
                success: false,
                error: 'REGENERATION_ERROR',
                message: 'Failed to start image regeneration'
            });
        }
    }
    catch (error) {
        console.error('Regenerate endpoint error:', error);
        return res.status(500).json({
            success: false,
            error: 'REGENERATION_ERROR',
            message: 'Failed to regenerate image'
        });
    }
}));
exports.default = router;
//# sourceMappingURL=process.js.map