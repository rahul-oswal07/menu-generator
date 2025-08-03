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

export class BatchImageGeneratorService {
  private imageGenerator: ImageGenerator;
  private config: BatchGenerationConfig;
  private queue: QueueItem[] = [];
  private processing: Map<string, QueueItem> = new Map();
  private results: Map<string, BatchGenerationResult> = new Map();
  private isProcessing = false;

  constructor(imageGenerator: ImageGenerator, config: BatchGenerationConfig) {
    this.imageGenerator = imageGenerator;
    this.config = {
      maxConcurrentRequests: config.maxConcurrentRequests ?? 3,
      requestDelayMs: config.requestDelayMs ?? 1000,
      maxRetries: config.maxRetries ?? 3,
      progressCallback: config.progressCallback
    };
  }

  /**
   * Add a batch of menu items to the generation queue
   */
  async addBatch(sessionId: string, menuItems: MenuItem[]): Promise<string> {
    const batchResult: BatchGenerationResult = {
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

    // Add items to queue
    for (const menuItem of menuItems) {
      const queueItem: QueueItem = {
        id: `${sessionId}-${menuItem.id}`,
        menuItem,
        sessionId,
        priority: 1,
        retryCount: 0,
        createdAt: new Date()
      };
      this.queue.push(queueItem);
    }

    // Start processing if not already running
    if (!this.isProcessing) {
      this.startProcessing();
    }

    return sessionId;
  }

  /**
   * Get batch generation progress
   */
  getBatchProgress(sessionId: string): BatchProgress | null {
    const result = this.results.get(sessionId);
    return result ? result.progress : null;
  }

  /**
   * Get batch generation results
   */
  getBatchResults(sessionId: string): BatchGenerationResult | null {
    return this.results.get(sessionId) || null;
  }

  /**
   * Cancel a batch generation
   */
  cancelBatch(sessionId: string): boolean {
    const result = this.results.get(sessionId);
    if (!result || result.status === 'completed') {
      return false;
    }

    // Remove items from queue
    this.queue = this.queue.filter(item => item.sessionId !== sessionId);

    // Remove from processing
    for (const [key, item] of this.processing.entries()) {
      if (item.sessionId === sessionId) {
        this.processing.delete(key);
      }
    }

    // Update result status
    result.status = 'failed';
    result.endTime = new Date();

    return true;
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    queueLength: number;
    processingCount: number;
    totalSessions: number;
  } {
    return {
      queueLength: this.queue.length,
      processingCount: this.processing.size,
      totalSessions: this.results.size
    };
  }

  /**
   * Start processing the queue
   */
  private async startProcessing(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0 || this.processing.size > 0) {
      // Process items up to max concurrent limit
      while (this.processing.size < this.config.maxConcurrentRequests && this.queue.length > 0) {
        const item = this.queue.shift()!;
        this.processing.set(item.id, item);
        this.processItem(item);
      }

      // Wait before checking again
      await this.delay(100);
    }

    this.isProcessing = false;
  }

  /**
   * Process a single queue item
   */
  private async processItem(item: QueueItem): Promise<void> {
    const result = this.results.get(item.sessionId);
    if (!result) {
      this.processing.delete(item.id);
      return;
    }

    try {
      // Update progress
      result.progress.inProgress++;
      result.status = 'processing';
      this.updateProgress(result);

      // Add delay for rate limiting
      if (this.config.requestDelayMs > 0) {
        await this.delay(this.config.requestDelayMs);
      }

      // Generate image
      const generatedImage = await this.imageGenerator.generateDishImage(item.menuItem);
      
      // Add to results
      result.results.push(generatedImage);
      
      if (generatedImage.status === 'success') {
        result.progress.completed++;
      } else {
        result.progress.failed++;
      }

      result.progress.inProgress--;
      this.updateProgress(result);

    } catch (error) {
      console.error(`Batch processing failed for item ${item.id}:`, error);
      
      // Handle retry logic
      if (item.retryCount < this.config.maxRetries) {
        item.retryCount++;
        item.priority++; // Lower priority for retries
        this.queue.push(item);
      } else {
        // Max retries reached, mark as failed
        const failedImage: GeneratedImage = {
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
    } finally {
      this.processing.delete(item.id);
    }

    // Check if batch is complete
    if (result.progress.completed + result.progress.failed >= result.progress.total) {
      result.status = 'completed';
      result.endTime = new Date();
      this.updateProgress(result);
    }
  }

  /**
   * Update progress and call callback if provided
   */
  private updateProgress(result: BatchGenerationResult): void {
    const progress = result.progress;
    progress.percentage = Math.round(
      ((progress.completed + progress.failed) / progress.total) * 100
    );

    // Calculate estimated time remaining
    if (progress.completed > 0 && result.status === 'processing') {
      const elapsed = Date.now() - result.startTime.getTime();
      const avgTimePerItem = elapsed / progress.completed;
      const remaining = progress.total - progress.completed - progress.failed;
      progress.estimatedTimeRemaining = Math.round(avgTimePerItem * remaining / 1000); // in seconds
    }

    // Call progress callback if provided
    if (this.config.progressCallback) {
      this.config.progressCallback(progress);
    }
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up old completed batches
   */
  cleanup(maxAgeHours: number = 24): number {
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

  /**
   * Get statistics about batch processing
   */
  getStatistics(): {
    totalBatches: number;
    completedBatches: number;
    failedBatches: number;
    processingBatches: number;
    averageProcessingTime: number;
    totalImagesGenerated: number;
    successRate: number;
  } {
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

  /**
   * Set priority for a specific session
   */
  setPriority(sessionId: string, priority: number): boolean {
    let updated = false;
    
    // Update queue items
    for (const item of this.queue) {
      if (item.sessionId === sessionId) {
        item.priority = priority;
        updated = true;
      }
    }

    // Sort queue by priority (higher priority first)
    if (updated) {
      this.queue.sort((a, b) => b.priority - a.priority);
    }

    return updated;
  }
}