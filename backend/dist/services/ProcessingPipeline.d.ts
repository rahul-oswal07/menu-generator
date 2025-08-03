import { ImageGeneratorService } from './ImageGeneratorService';
import { ProcessingResult, ProcessingStatus } from '../types';
import { EventEmitter } from 'events';
export interface ProcessingProgress {
    sessionId: string;
    status: ProcessingStatus;
    progress: number;
    currentStage: string;
    estimatedTimeRemaining?: number;
    error?: string;
}
export declare class ProcessingPipeline extends EventEmitter {
    private ocrExtractor;
    private imageUploadHandler;
    private imageGeneratorService?;
    private batchImageGeneratorService?;
    private sessionRepository;
    private menuItemRepository;
    private processingTimeouts;
    private readonly PROCESSING_TIMEOUT;
    constructor(imageGeneratorService?: ImageGeneratorService);
    processMenuImage(sessionId: string, imageUrl: string): Promise<ProcessingResult>;
    getProcessingProgress(_sessionId: string): ProcessingProgress | null;
    cancelProcessing(sessionId: string): void;
    private setupProcessingTimeout;
    private clearProcessingTimeout;
    private emitProgress;
    private waitForBatchCompletion;
    getImageGenerationStatus(sessionId: string): any;
    regenerateImages(sessionId: string, menuItemIds: string[]): Promise<boolean>;
    getProcessingResults(sessionId: string): Promise<ProcessingResult | null>;
    private getErrorMessage;
    destroy(): void;
}
//# sourceMappingURL=ProcessingPipeline.d.ts.map