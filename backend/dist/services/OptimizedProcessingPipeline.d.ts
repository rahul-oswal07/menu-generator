import { ProcessingPipeline } from './ProcessingPipeline';
import { ImageGeneratorService } from './ImageGeneratorService';
import { ProcessingResult } from '../types';
export declare class OptimizedProcessingPipeline extends ProcessingPipeline {
    private processingCache;
    private connectionPool?;
    private maxConcurrentTasks;
    private activeTasks;
    private memoryMonitor?;
    private readonly MAX_MEMORY_USAGE;
    constructor(imageGeneratorService?: ImageGeneratorService);
    processMenuImage(sessionId: string, imageUrl: string): Promise<ProcessingResult>;
    private initializeConnectionPool;
    private startMemoryMonitoring;
    private clearCaches;
    private getCachedResult;
    private cacheResult;
    getPerformanceMetrics(): {
        memory: {
            heapUsed: number;
            heapTotal: number;
            external: number;
            rss: number;
        };
        connectionPool: {
            totalConnections: number;
            inUseConnections: number;
            availableConnections: number;
            waitingRequests: number;
            maxConnections: number;
            minConnections: number;
        } | undefined;
        cache: {
            ocrResults: number;
            imageMetadata: number;
            generatedImages: number;
        };
        activeTasks: number;
        maxConcurrentTasks: number;
    };
    destroy(): Promise<void>;
}
export default OptimizedProcessingPipeline;
//# sourceMappingURL=OptimizedProcessingPipeline.d.ts.map