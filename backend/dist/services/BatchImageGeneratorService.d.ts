import { ImageGenerator } from '../interfaces/ImageGenerator';
import { MenuItem, GeneratedImage } from '../types';
export interface BatchGenerationConfig {
    maxConcurrentRequests: number;
    requestDelayMs: number;
    maxRetries: number;
    progressCallback?: (progress: BatchProgress) => void;
}
export interface BatchProgress {
    total: number;
    completed: number;
    failed: number;
    inProgress: number;
    percentage: number;
    estimatedTimeRemaining?: number;
}
export interface BatchGenerationResult {
    sessionId: string;
    results: GeneratedImage[];
    progress: BatchProgress;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    startTime: Date;
    endTime?: Date;
}
export interface QueueItem {
    id: string;
    menuItem: MenuItem;
    sessionId: string;
    priority: number;
    retryCount: number;
    createdAt: Date;
}
export declare class BatchImageGeneratorService {
    private imageGenerator;
    private config;
    private queue;
    private processing;
    private results;
    private isProcessing;
    constructor(imageGenerator: ImageGenerator, config: BatchGenerationConfig);
    addBatch(sessionId: string, menuItems: MenuItem[]): Promise<string>;
    getBatchProgress(sessionId: string): BatchProgress | null;
    getBatchResults(sessionId: string): BatchGenerationResult | null;
    cancelBatch(sessionId: string): boolean;
    getQueueStatus(): {
        queueLength: number;
        processingCount: number;
        totalSessions: number;
    };
    private startProcessing;
    private processItem;
    private updateProgress;
    private delay;
    cleanup(maxAgeHours?: number): number;
    getStatistics(): {
        totalBatches: number;
        completedBatches: number;
        failedBatches: number;
        processingBatches: number;
        averageProcessingTime: number;
        totalImagesGenerated: number;
        successRate: number;
    };
    setPriority(sessionId: string, priority: number): boolean;
}
//# sourceMappingURL=BatchImageGeneratorService.d.ts.map