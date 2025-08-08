import { EventEmitter } from 'events';
import { menuItemRepository, sessionRepositoryInstance } from '../menuItemRepositoryInstance';
import { ProcessingResult, ProcessingStatus } from '../types';
import { BatchImageGeneratorService } from './BatchImageGeneratorService';
import { ImageGeneratorService } from './ImageGeneratorService';
import { ImageUploadHandler } from './ImageUploadHandler';
import { OCRExtractor } from './OCRExtractor';

export interface ProcessingProgress {
  sessionId: string;
  status: ProcessingStatus;
  progress: number;
  currentStage: string;
  estimatedTimeRemaining?: number;
  error?: string;
}

export class ProcessingPipeline extends EventEmitter {
  private ocrExtractor: OCRExtractor;
  private imageUploadHandler: ImageUploadHandler;
  private batchImageGeneratorService: BatchImageGeneratorService;
  // Use singleton instance
  private processingTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private readonly PROCESSING_TIMEOUT = 60000; // 60 seconds (increased for image generation)

  constructor(imageGeneratorService: ImageGeneratorService) {
    super();
    this.ocrExtractor = new OCRExtractor();
    this.imageUploadHandler = new ImageUploadHandler();
    // Use singleton instance
    // Use singleton instance
    this.batchImageGeneratorService = new BatchImageGeneratorService(
      imageGeneratorService,
      {
        maxConcurrentRequests: 3,
        requestDelayMs: 1000,
        maxRetries: 2,
        progressCallback: (progress) => {
          // Emit image generation progress
          this.emit('imageGenerationProgress', progress);
        }
      }
    );
  }

  /**
   * Process a menu image through the complete OCR pipeline
   */
  async processMenuImage(
    sessionId: string,
    imageUrl: string
  ): Promise<ProcessingResult> {
    try {
      // Set up timeout for the entire processing pipeline
      this.setupProcessingTimeout(sessionId);

      // Stage 1: Image preprocessing
      this.emitProgress(sessionId, {
        sessionId,
        status: 'processing',
        progress: 10,
        currentStage: 'Preprocessing image...',
        estimatedTimeRemaining: 25000
      });

      const processedImage = await this.imageUploadHandler.preprocessImage(imageUrl);

      // Stage 2: OCR text extraction
      this.emitProgress(sessionId, {
        sessionId,
        status: 'processing',
        progress: 30,
        currentStage: 'Extracting text from image...',
        estimatedTimeRemaining: 20000
      });

      const extractedText = await this.ocrExtractor.extractText(processedImage.url);

      // Check if OCR was successful
      if (extractedText.confidence < 0.3) {
        throw new Error('OCR_LOW_CONFIDENCE');
      }

      // Stage 3: Parse menu items
      this.emitProgress(sessionId, {
        sessionId,
        status: 'processing',
        progress: 70,
        currentStage: 'Parsing menu items...',
        estimatedTimeRemaining: 5000
      });

      const menuItems = await this.ocrExtractor.parseMenuItems(extractedText.rawText);

      // Stage 4: Store results
      this.emitProgress(sessionId, {
        sessionId,
        status: 'processing',
        progress: 90,
        currentStage: 'Storing results...',
        estimatedTimeRemaining: 2000
      });

      // Store session and menu items in database
      await sessionRepositoryInstance.create({
        id: sessionId,
        originalImageUrl: imageUrl,
        status: 'completed'
      });

      await menuItemRepository.createMany(sessionId, menuItems);

      // Stage 5: Generate dish images (if image generator is available)
      let generatedImages: any[] = [];
      if (menuItems.length > 0) {
        this.emitProgress(sessionId, {
          sessionId,
          status: 'processing',
          progress: 95,
          currentStage: 'Generating dish images...',
          estimatedTimeRemaining: 10000
        });

        // Start batch image generation
        await this.batchImageGeneratorService.addBatch(sessionId, menuItems);
        
        // Wait for batch completion or timeout
        const batchResult = await this.waitForBatchCompletion(sessionId, 30000);
        if (batchResult) {
          generatedImages = batchResult.results;
          
          // Update database with generated images
          for (const generatedImage of generatedImages) {
            if (generatedImage.status === 'success') {
              await menuItemRepository.updateGenerationStatus(
                generatedImage.menuItemId,
                'completed',
                generatedImage.url
              );
            } else {
              await menuItemRepository.updateGenerationStatus(
                generatedImage.menuItemId,
                'failed'
              );
            }
          }
        }
      }

      const result: ProcessingResult = {
        originalImage: imageUrl,
        extractedItems: menuItems,
        generatedImages,
        processingStatus: 'completed'
      };

      // Stage 6: Complete
      this.emitProgress(sessionId, {
        sessionId,
        status: 'completed',
        progress: 100,
        currentStage: 'Processing complete',
        estimatedTimeRemaining: 0
      });

      this.clearProcessingTimeout(sessionId);
      return result;

    } catch (error) {
      this.clearProcessingTimeout(sessionId);
      
      const errorMessage = this.getErrorMessage(error as Error);
      
      this.emitProgress(sessionId, {
        sessionId,
        status: 'failed',
        progress: 0,
        currentStage: 'Processing failed',
        error: errorMessage
      });

      // Return failed result
      return {
        originalImage: imageUrl,
        extractedItems: [],
        generatedImages: [],
        processingStatus: 'failed'
      };
    }
  }

  /**
   * Get processing progress for a session
   */
  getProcessingProgress(_sessionId: string): ProcessingProgress | null {
    // In a real implementation, this would query the database or cache
    // For now, we'll return null as progress is emitted via events
    return null;
  }

  /**
   * Cancel processing for a session
   */
  cancelProcessing(sessionId: string): void {
    this.clearProcessingTimeout(sessionId);
    
    this.emitProgress(sessionId, {
      sessionId,
      status: 'failed',
      progress: 0,
      currentStage: 'Processing cancelled',
      error: 'Processing was cancelled by user'
    });
  }

  /**
   * Set up timeout for processing pipeline
   */
  private setupProcessingTimeout(sessionId: string): void {
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

  /**
   * Clear processing timeout
   */
  private clearProcessingTimeout(sessionId: string): void {
    const timeout = this.processingTimeouts.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.processingTimeouts.delete(sessionId);
    }
  }

  /**
   * Emit progress update
   */
  private emitProgress(_sessionId: string, progress: ProcessingProgress): void {
    this.emit('progress', progress);
  }

  /**
   * Wait for batch image generation to complete
   */
  private async waitForBatchCompletion(sessionId: string, timeoutMs: number): Promise<any> {
    if (!this.batchImageGeneratorService) {
      return null;
    }

    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const checkCompletion = () => {
        const batchResult = this.batchImageGeneratorService!.getBatchResults(sessionId);
        
        if (batchResult && batchResult.status === 'completed') {
          resolve(batchResult);
          return;
        }
        
        if (Date.now() - startTime > timeoutMs) {
          // Timeout reached, return partial results
          resolve(batchResult);
          return;
        }
        
        // Check again in 500ms
        setTimeout(checkCompletion, 500);
      };
      
      checkCompletion();
    });
  }

  /**
   * Get image generation status for a session
   */
  getImageGenerationStatus(sessionId: string): any {
    if (!this.batchImageGeneratorService) {
      return null;
    }
    
    return this.batchImageGeneratorService.getBatchProgress(sessionId);
  }

  /**
   * Regenerate images for specific menu items
   */
  async regenerateImages(sessionId: string, menuItemIds: string[]): Promise<boolean> {
    try {
      const menuItems = await menuItemRepository.findBySessionId(sessionId);
      const itemsToRegenerate = menuItems.filter(item => 
        menuItemIds.includes(item.id)
      ).map(item => ({
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

      // Start regeneration
      await this.batchImageGeneratorService.addBatch(`${sessionId}-regen`, itemsToRegenerate);
      return true;
    } catch (error) {
      console.error('Failed to regenerate images:', error);
      return false;
    }
  }

  /**
   * Get processing results for a session
   */
  async getProcessingResults(sessionId: string): Promise<ProcessingResult | null> {
    const session = await sessionRepositoryInstance.findById(sessionId);
    if (!session) {
      return null;
    }

    const menuItems = await menuItemRepository.findBySessionId(sessionId);
    
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
          url: item.generatedImageUrl!,
          menuItemId: item.id,
          status: item.generationStatus === 'completed' ? 'success' as const : 'failed' as const
        })),
      processingStatus: session.status
    };
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: Error): string {
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



  /**
   * Clean up resources
   */
  destroy(): void {
    // Clear all timeouts
    for (const timeout of this.processingTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.processingTimeouts.clear();
    
    // Remove all listeners
    this.removeAllListeners();
  }
}