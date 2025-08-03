"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptimizedProcessingPipeline = void 0;
const ProcessingPipeline_1 = require("./ProcessingPipeline");
const connectionPool_1 = __importDefault(require("../utils/connectionPool"));
class OptimizedProcessingPipeline extends ProcessingPipeline_1.ProcessingPipeline {
    constructor(imageGeneratorService) {
        super(imageGeneratorService);
        this.maxConcurrentTasks = 4;
        this.activeTasks = new Set();
        this.MAX_MEMORY_USAGE = 500 * 1024 * 1024;
        this.processingCache = {
            ocrResults: new Map(),
            imageMetadata: new Map(),
            generatedImages: new Map()
        };
        this.initializeConnectionPool();
        this.startMemoryMonitoring();
    }
    async processMenuImage(sessionId, imageUrl) {
        const cachedResult = this.getCachedResult(sessionId, imageUrl);
        if (cachedResult) {
            return cachedResult;
        }
        if (this.connectionPool) {
            return this.connectionPool.execute(async () => {
                const result = await super.processMenuImage(sessionId, imageUrl);
                this.cacheResult(sessionId, imageUrl, result);
                return result;
            });
        }
        else {
            const result = await super.processMenuImage(sessionId, imageUrl);
            this.cacheResult(sessionId, imageUrl, result);
            return result;
        }
    }
    initializeConnectionPool() {
        this.connectionPool = new connectionPool_1.default(async () => ({ id: Date.now().toString() }), async () => { }, async () => true, {
            maxConnections: 8,
            minConnections: 2,
            acquireTimeoutMs: 10000,
            idleTimeoutMs: 300000
        });
    }
    startMemoryMonitoring() {
        this.memoryMonitor = setInterval(() => {
            const memUsage = process.memoryUsage();
            if (memUsage.heapUsed > this.MAX_MEMORY_USAGE) {
                console.warn('High memory usage detected, clearing caches');
                this.clearCaches();
                if (global.gc) {
                    global.gc();
                }
            }
        }, 30000);
    }
    clearCaches() {
        this.processingCache.ocrResults.clear();
        this.processingCache.imageMetadata.clear();
        if (this.processingCache.generatedImages.size > 50) {
            const entries = Array.from(this.processingCache.generatedImages.entries());
            this.processingCache.generatedImages.clear();
            entries.slice(-25).forEach(([key, value]) => {
                this.processingCache.generatedImages.set(key, value);
            });
        }
    }
    getCachedResult(_sessionId, _imageUrl) {
        return null;
    }
    cacheResult(sessionId, _imageUrl, _result) {
        console.log(`Caching result for session ${sessionId}`);
    }
    getPerformanceMetrics() {
        const memUsage = process.memoryUsage();
        const poolStats = this.connectionPool?.getStats();
        return {
            memory: {
                heapUsed: memUsage.heapUsed,
                heapTotal: memUsage.heapTotal,
                external: memUsage.external,
                rss: memUsage.rss
            },
            connectionPool: poolStats,
            cache: {
                ocrResults: this.processingCache.ocrResults.size,
                imageMetadata: this.processingCache.imageMetadata.size,
                generatedImages: this.processingCache.generatedImages.size
            },
            activeTasks: this.activeTasks.size,
            maxConcurrentTasks: this.maxConcurrentTasks
        };
    }
    async destroy() {
        if (this.memoryMonitor) {
            clearInterval(this.memoryMonitor);
        }
        if (this.connectionPool) {
            await this.connectionPool.close();
        }
        this.clearCaches();
        super.destroy();
    }
}
exports.OptimizedProcessingPipeline = OptimizedProcessingPipeline;
exports.default = OptimizedProcessingPipeline;
//# sourceMappingURL=OptimizedProcessingPipeline.js.map