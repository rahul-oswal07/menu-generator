"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessingPipeline = void 0;
const OCRExtractor_1 = require("./OCRExtractor");
const ImageUploadHandler_1 = require("./ImageUploadHandler");
const BatchImageGeneratorService_1 = require("./BatchImageGeneratorService");
const Session_1 = require("../models/Session");
const MenuItemModel_1 = require("../models/MenuItemModel");
const events_1 = require("events");
class ProcessingPipeline extends events_1.EventEmitter {
    constructor(imageGeneratorService) {
        super();
        this.processingTimeouts = new Map();
        this.PROCESSING_TIMEOUT = 60000;
        this.ocrExtractor = new OCRExtractor_1.OCRExtractor();
        this.imageUploadHandler = new ImageUploadHandler_1.ImageUploadHandler();
        this.sessionRepository = new Session_1.SessionRepository();
        this.menuItemRepository = new MenuItemModel_1.MenuItemRepository();
        if (imageGeneratorService) {
            this.imageGeneratorService = imageGeneratorService;
            this.batchImageGeneratorService = new BatchImageGeneratorService_1.BatchImageGeneratorService(imageGeneratorService, {
                maxConcurrentRequests: 3,
                requestDelayMs: 1000,
                maxRetries: 2,
                progressCallback: (progress) => {
                    this.emit('imageGenerationProgress', progress);
                }
            });
        }
    }
    async processMenuImage(sessionId, imageUrl) {
        try {
            this.setupProcessingTimeout(sessionId);
            this.emitProgress(sessionId, {
                sessionId,
                status: 'processing',
                progress: 10,
                currentStage: 'Preprocessing image...',
                estimatedTimeRemaining: 25000
            });
            const processedImage = await this.imageUploadHandler.preprocessImage(imageUrl);
            this.emitProgress(sessionId, {
                sessionId,
                status: 'processing',
                progress: 30,
                currentStage: 'Extracting text from image...',
                estimatedTimeRemaining: 20000
            });
            const extractedText = await this.ocrExtractor.extractText(processedImage.url);
            if (extractedText.confidence < 0.3) {
                throw new Error('OCR_LOW_CONFIDENCE');
            }
            this.emitProgress(sessionId, {
                sessionId,
                status: 'processing',
                progress: 70,
                currentStage: 'Parsing menu items...',
                estimatedTimeRemaining: 5000
            });
            const menuItems = await this.ocrExtractor.parseMenuItems(extractedText.rawText);
            this.emitProgress(sessionId, {
                sessionId,
                status: 'processing',
                progress: 90,
                currentStage: 'Storing results...',
                estimatedTimeRemaining: 2000
            });
            await this.sessionRepository.create({
                id: sessionId,
                originalImageUrl: imageUrl,
                status: 'completed'
            });
            await this.menuItemRepository.createMany(sessionId, menuItems);
            let generatedImages = [];
            if (this.imageGeneratorService && menuItems.length > 0) {
                this.emitProgress(sessionId, {
                    sessionId,
                    status: 'processing',
                    progress: 95,
                    currentStage: 'Generating dish images...',
                    estimatedTimeRemaining: 10000
                });
                await this.batchImageGeneratorService.addBatch(sessionId, menuItems);
                const batchResult = await this.waitForBatchCompletion(sessionId, 30000);
                if (batchResult) {
                    generatedImages = batchResult.results;
                    for (const generatedImage of generatedImages) {
                        if (generatedImage.status === 'success') {
                            await this.menuItemRepository.updateGenerationStatus(generatedImage.menuItemId, 'completed', generatedImage.url);
                        }
                        else {
                            await this.menuItemRepository.updateGenerationStatus(generatedImage.menuItemId, 'failed');
                        }
                    }
                }
            }
            const result = {
                originalImage: imageUrl,
                extractedItems: menuItems,
                generatedImages,
                processingStatus: 'completed'
            };
            this.emitProgress(sessionId, {
                sessionId,
                status: 'completed',
                progress: 100,
                currentStage: 'Processing complete',
                estimatedTimeRemaining: 0
            });
            this.clearProcessingTimeout(sessionId);
            return result;
        }
        catch (error) {
            this.clearProcessingTimeout(sessionId);
            const errorMessage = this.getErrorMessage(error);
            this.emitProgress(sessionId, {
                sessionId,
                status: 'failed',
                progress: 0,
                currentStage: 'Processing failed',
                error: errorMessage
            });
            return {
                originalImage: imageUrl,
                extractedItems: [],
                generatedImages: [],
                processingStatus: 'failed'
            };
        }
    }
    getProcessingProgress(_sessionId) {
        return null;
    }
    cancelProcessing(sessionId) {
        this.clearProcessingTimeout(sessionId);
        this.emitProgress(sessionId, {
            sessionId,
            status: 'failed',
            progress: 0,
            currentStage: 'Processing cancelled',
            error: 'Processing was cancelled by user'
        });
    }
    setupProcessingTimeout(sessionId) {
        const timeout = setTimeout(() => {
            this.emitProgress(sessionId, {
                sessionId,
                status: 'failed',
                progress: 0,
                currentStage: 'Processing timed out',
                error: 'Processing took too long and was cancelled'
            });
        }, this.PROCESSING_TIMEOUT);
        this.processingTimeouts.set(sessionId, timeout);
    }
    clearProcessingTimeout(sessionId) {
        const timeout = this.processingTimeouts.get(sessionId);
        if (timeout) {
            clearTimeout(timeout);
            this.processingTimeouts.delete(sessionId);
        }
    }
    emitProgress(_sessionId, progress) {
        this.emit('progress', progress);
    }
    async waitForBatchCompletion(sessionId, timeoutMs) {
        if (!this.batchImageGeneratorService) {
            return null;
        }
        const startTime = Date.now();
        return new Promise((resolve) => {
            const checkCompletion = () => {
                const batchResult = this.batchImageGeneratorService.getBatchResults(sessionId);
                if (batchResult && batchResult.status === 'completed') {
                    resolve(batchResult);
                    return;
                }
                if (Date.now() - startTime > timeoutMs) {
                    resolve(batchResult);
                    return;
                }
                setTimeout(checkCompletion, 500);
            };
            checkCompletion();
        });
    }
    getImageGenerationStatus(sessionId) {
        if (!this.batchImageGeneratorService) {
            return null;
        }
        return this.batchImageGeneratorService.getBatchProgress(sessionId);
    }
    async regenerateImages(sessionId, menuItemIds) {
        if (!this.imageGeneratorService || !this.batchImageGeneratorService) {
            return false;
        }
        try {
            const menuItems = await this.menuItemRepository.findBySessionId(sessionId);
            const itemsToRegenerate = menuItems.filter(item => menuItemIds.includes(item.id)).map(item => ({
                id: item.id,
                name: item.name,
                description: item.description,
                price: item.price,
                category: item.category,
                isManuallyEdited: item.isManuallyEdited
            }));
            if (itemsToRegenerate.length === 0) {
                return false;
            }
            await this.batchImageGeneratorService.addBatch(`${sessionId}-regen`, itemsToRegenerate);
            return true;
        }
        catch (error) {
            console.error('Failed to regenerate images:', error);
            return false;
        }
    }
    async getProcessingResults(sessionId) {
        const session = await this.sessionRepository.findById(sessionId);
        if (!session) {
            return null;
        }
        const menuItems = await this.menuItemRepository.findBySessionId(sessionId);
        return {
            originalImage: session.originalImageUrl,
            extractedItems: menuItems.map(item => ({
                id: item.id,
                name: item.name,
                description: item.description,
                price: item.price,
                category: item.category,
                isManuallyEdited: item.isManuallyEdited
            })),
            generatedImages: menuItems
                .filter(item => item.generatedImageUrl)
                .map(item => ({
                url: item.generatedImageUrl,
                menuItemId: item.id,
                status: item.generationStatus === 'completed' ? 'success' : 'failed'
            })),
            processingStatus: session.status
        };
    }
    getErrorMessage(error) {
        switch (error.message) {
            case 'OCR_LOW_CONFIDENCE':
                return 'The image quality is too low for accurate text extraction. Please try a clearer image.';
            case 'NO_TEXT_DETECTED':
                return 'No menu text was found in the image. Please ensure the image contains a readable menu.';
            case 'API_ERROR':
                return 'There was a problem with the text extraction service. Please try again.';
            case 'TIMEOUT':
                return 'Processing took too long and was cancelled. Please try with a smaller or clearer image.';
            default:
                return 'An unexpected error occurred during processing. Please try again.';
        }
    }
    destroy() {
        for (const timeout of this.processingTimeouts.values()) {
            clearTimeout(timeout);
        }
        this.processingTimeouts.clear();
        this.removeAllListeners();
    }
}
exports.ProcessingPipeline = ProcessingPipeline;
//# sourceMappingURL=ProcessingPipeline.js.map