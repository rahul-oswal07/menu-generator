import { ProcessingPipeline } from './ProcessingPipeline';
import { ImageGeneratorService } from './ImageGeneratorService';
import { ProcessingResult } from '../types';
import ConnectionPool from '../utils/connectionPool';



interface ProcessingCache {
  ocrResults: Map<string, any>;
  imageMetadata: Map<string, any>;
  generatedImages: Map<string, any>;
}

export class OptimizedProcessingPipeline extends ProcessingPipeline {
  private processingCache: ProcessingCache;
  private connectionPool?: ConnectionPool<any>;
  private maxConcurrentTasks: number = 4;
  private activeTasks: Set<string> = new Set();
  private memoryMonitor?: NodeJS.Timeout;
  private readonly MAX_MEMORY_USAGE = 500 * 1024 * 1024; // 500MB

  constructor(imageGeneratorService?: ImageGeneratorService) {
    super(imageGeneratorService);
    
    this.processingCache = {
      ocrResults: new Map(),
      imageMetadata: new Map(),
      generatedImages: new Map()
    };

    // Initialize connection pool for external APIs
    this.initializeConnectionPool();
    
    // Start memory monitoring
    this.startMemoryMonitoring();
  }

  /**
   * Process menu image with optimized parallel processing
   * This version uses the parent class but adds caching and connection pooling
   */
  async processMenuImage(
    sessionId: string,
    imageUrl: string
  ): Promise<ProcessingResult> {
    // Check cache first
    const cachedResult = this.getCachedResult(sessionId, imageUrl);
    if (cachedResult) {
      return cachedResult;
    }

    // Use connection pool for processing if available
    if (this.connectionPool) {
      return this.connectionPool.execute(async () => {
        const result = await super.processMenuImage(sessionId, imageUrl);
        this.cacheResult(sessionId, imageUrl, result);
        return result;
      });
    } else {
      const result = await super.processMenuImage(sessionId, imageUrl);
      this.cacheResult(sessionId, imageUrl, result);
      return result;
    }
  }





  /**
   * Initialize connection pool for external API calls
   */
  private initializeConnectionPool(): void {
    this.connectionPool = new ConnectionPool(
      // Create connection (mock implementation)
      async () => ({ id: Date.now().toString() }),
      // Destroy connection
      async () => {},
      // Validate connection
      async () => true,
      {
        maxConnections: 8,
        minConnections: 2,
        acquireTimeoutMs: 10000,
        idleTimeoutMs: 300000
      }
    );
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    this.memoryMonitor = setInterval(() => {
      const memUsage = process.memoryUsage();
      
      if (memUsage.heapUsed > this.MAX_MEMORY_USAGE) {
        console.warn('High memory usage detected, clearing caches');
        this.clearCaches();
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Clear processing caches
   */
  private clearCaches(): void {
    this.processingCache.ocrResults.clear();
    this.processingCache.imageMetadata.clear();
    
    // Keep only recent generated images (last 50)
    if (this.processingCache.generatedImages.size > 50) {
      const entries = Array.from(this.processingCache.generatedImages.entries());
      this.processingCache.generatedImages.clear();
      
      // Keep the last 25 entries
      entries.slice(-25).forEach(([key, value]) => {
        this.processingCache.generatedImages.set(key, value);
      });
    }
  }





  /**
   * Get cached processing result
   */
  private getCachedResult(_sessionId: string, _imageUrl: string): ProcessingResult | null {
    // In a real implementation, this would check a persistent cache
    return null;
  }

  /**
   * Cache processing result
   */
  private cacheResult(sessionId: string, _imageUrl: string, _result: ProcessingResult): void {
    // In a real implementation, this would store in a persistent cache
    console.log(`Caching result for session ${sessionId}`);
  }

  /**
   * Get performance metrics
   */
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

  /**
   * Clean up resources
   */
  async destroy(): Promise<void> {
    // Clear memory monitor
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
    }
    
    // Close connection pool
    if (this.connectionPool) {
      await this.connectionPool.close();
    }
    
    // Clear caches
    this.clearCaches();
    
    // Call parent destroy
    super.destroy();
  }
}

export default OptimizedProcessingPipeline;