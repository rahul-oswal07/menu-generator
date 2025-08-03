"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchImageGeneratorService = void 0;
class BatchImageGeneratorService {
    constructor(imageGenerator, config) {
        this.queue = [];
        this.processing = new Map();
        this.results = new Map();
        this.isProcessing = false;
        this.imageGenerator = imageGenerator;
        this.config = {
            maxConcurrentRequests: config.maxConcurrentRequests ?? 3,
            requestDelayMs: config.requestDelayMs ?? 1000,
            maxRetries: config.maxRetries ?? 3,
            progressCallback: config.progressCallback
        };
    }
    async addBatch(sessionId, menuItems) {
        const batchResult = {
            sessionId,
            results: [],
            progress: {
                total: menuItems.length,
                completed: 0,
                failed: 0,
                inProgress: 0,
                percentage: 0
            },
            status: 'pending',
            startTime: new Date()
        };
        this.results.set(sessionId, batchResult);
        for (const menuItem of menuItems) {
            const queueItem = {
                id: `${sessionId}-${menuItem.id}`,
                menuItem,
                sessionId,
                priority: 1,
                retryCount: 0,
                createdAt: new Date()
            };
            this.queue.push(queueItem);
        }
        if (!this.isProcessing) {
            this.startProcessing();
        }
        return sessionId;
    }
    getBatchProgress(sessionId) {
        const result = this.results.get(sessionId);
        return result ? result.progress : null;
    }
    getBatchResults(sessionId) {
        return this.results.get(sessionId) || null;
    }
    cancelBatch(sessionId) {
        const result = this.results.get(sessionId);
        if (!result || result.status === 'completed') {
            return false;
        }
        this.queue = this.queue.filter(item => item.sessionId !== sessionId);
        for (const [key, item] of this.processing.entries()) {
            if (item.sessionId === sessionId) {
                this.processing.delete(key);
            }
        }
        result.status = 'failed';
        result.endTime = new Date();
        return true;
    }
    getQueueStatus() {
        return {
            queueLength: this.queue.length,
            processingCount: this.processing.size,
            totalSessions: this.results.size
        };
    }
    async startProcessing() {
        if (this.isProcessing) {
            return;
        }
        this.isProcessing = true;
        while (this.queue.length > 0 || this.processing.size > 0) {
            while (this.processing.size < this.config.maxConcurrentRequests && this.queue.length > 0) {
                const item = this.queue.shift();
                this.processing.set(item.id, item);
                this.processItem(item);
            }
            await this.delay(100);
        }
        this.isProcessing = false;
    }
    async processItem(item) {
        const result = this.results.get(item.sessionId);
        if (!result) {
            this.processing.delete(item.id);
            return;
        }
        try {
            result.progress.inProgress++;
            result.status = 'processing';
            this.updateProgress(result);
            if (this.config.requestDelayMs > 0) {
                await this.delay(this.config.requestDelayMs);
            }
            const generatedImage = await this.imageGenerator.generateDishImage(item.menuItem);
            result.results.push(generatedImage);
            if (generatedImage.status === 'success') {
                result.progress.completed++;
            }
            else {
                result.progress.failed++;
            }
            result.progress.inProgress--;
            this.updateProgress(result);
        }
        catch (error) {
            console.error(`Batch processing failed for item ${item.id}:`, error);
            if (item.retryCount < this.config.maxRetries) {
                item.retryCount++;
                item.priority++;
                this.queue.push(item);
            }
            else {
                const failedImage = {
                    url: '',
                    menuItemId: item.menuItem.id,
                    status: 'failed',
                    errorMessage: 'Max retries exceeded'
                };
                result.results.push(failedImage);
                result.progress.failed++;
                result.progress.inProgress--;
                this.updateProgress(result);
            }
        }
        finally {
            this.processing.delete(item.id);
        }
        if (result.progress.completed + result.progress.failed >= result.progress.total) {
            result.status = 'completed';
            result.endTime = new Date();
            this.updateProgress(result);
        }
    }
    updateProgress(result) {
        const progress = result.progress;
        progress.percentage = Math.round(((progress.completed + progress.failed) / progress.total) * 100);
        if (progress.completed > 0 && result.status === 'processing') {
            const elapsed = Date.now() - result.startTime.getTime();
            const avgTimePerItem = elapsed / progress.completed;
            const remaining = progress.total - progress.completed - progress.failed;
            progress.estimatedTimeRemaining = Math.round(avgTimePerItem * remaining / 1000);
        }
        if (this.config.progressCallback) {
            this.config.progressCallback(progress);
        }
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    cleanup(maxAgeHours = 24) {
        const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
        let cleanedCount = 0;
        for (const [sessionId, result] of this.results.entries()) {
            if (result.status === 'completed' && result.endTime && result.endTime < cutoffTime) {
                this.results.delete(sessionId);
                cleanedCount++;
            }
        }
        return cleanedCount;
    }
    getStatistics() {
        let completedBatches = 0;
        let failedBatches = 0;
        let processingBatches = 0;
        let totalProcessingTime = 0;
        let totalImagesGenerated = 0;
        let totalSuccessful = 0;
        for (const result of this.results.values()) {
            switch (result.status) {
                case 'completed':
                    completedBatches++;
                    if (result.endTime) {
                        totalProcessingTime += result.endTime.getTime() - result.startTime.getTime();
                    }
                    break;
                case 'failed':
                    failedBatches++;
                    break;
                case 'processing':
                    processingBatches++;
                    break;
            }
            totalImagesGenerated += result.results.length;
            totalSuccessful += result.results.filter(r => r.status === 'success').length;
        }
        return {
            totalBatches: this.results.size,
            completedBatches,
            failedBatches,
            processingBatches,
            averageProcessingTime: completedBatches > 0 ? totalProcessingTime / completedBatches : 0,
            totalImagesGenerated,
            successRate: totalImagesGenerated > 0 ? (totalSuccessful / totalImagesGenerated) * 100 : 0
        };
    }
    setPriority(sessionId, priority) {
        let updated = false;
        for (const item of this.queue) {
            if (item.sessionId === sessionId) {
                item.priority = priority;
                updated = true;
            }
        }
        if (updated) {
            this.queue.sort((a, b) => b.priority - a.priority);
        }
        return updated;
    }
}
exports.BatchImageGeneratorService = BatchImageGeneratorService;
//# sourceMappingURL=BatchImageGeneratorService.js.map