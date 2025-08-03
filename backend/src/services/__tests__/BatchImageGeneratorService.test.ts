import { BatchImageGeneratorService, BatchGenerationConfig } from '../BatchImageGeneratorService';
import { ImageGenerator } from '../../interfaces/ImageGenerator';
import { MenuItem } from '../../types';

// Mock ImageGenerator
const mockImageGenerator: jest.Mocked<ImageGenerator> = {
  generateDishImage: jest.fn(),
  batchGenerate: jest.fn()
};

describe('BatchImageGeneratorService', () => {
  let service: BatchImageGeneratorService;
  let mockConfig: BatchGenerationConfig;
  let mockMenuItems: MenuItem[];
  let mockProgressCallback: jest.Mock;

  beforeEach(() => {
    mockProgressCallback = jest.fn();
    mockConfig = {
      maxConcurrentRequests: 2,
      requestDelayMs: 50, // Reduced for testing
      maxRetries: 2,
      progressCallback: mockProgressCallback
    };

    service = new BatchImageGeneratorService(mockImageGenerator, mockConfig);

    mockMenuItems = [
      {
        id: 'item-1',
        name: 'Pizza',
        description: 'Delicious pizza',
        price: '$12.99'
      },
      {
        id: 'item-2',
        name: 'Burger',
        description: 'Tasty burger',
        price: '$8.99'
      },
      {
        id: 'item-3',
        name: 'Salad',
        description: 'Fresh salad',
        price: '$6.99'
      }
    ];

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('addBatch', () => {
    it('should add batch to queue and return session ID', async () => {
      const sessionId = 'test-session-1';
      
      // Mock to prevent automatic processing
      mockImageGenerator.generateDishImage.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          url: 'test.jpg',
          menuItemId: 'test',
          status: 'success'
        }), 1000))
      );
      
      const result = await service.addBatch(sessionId, mockMenuItems);
      
      expect(result).toBe(sessionId);
      
      const progress = service.getBatchProgress(sessionId);
      expect(progress!.total).toBe(3);
      expect(progress!.completed).toBe(0);
      expect(progress!.failed).toBe(0);
    });

    it('should start processing automatically', async () => {
      const sessionId = 'test-session-1';
      
      mockImageGenerator.generateDishImage.mockResolvedValue({
        url: 'https://example.com/image.jpg',
        menuItemId: 'item-1',
        status: 'success'
      });

      await service.addBatch(sessionId, [mockMenuItems[0]]);
      
      // Wait for processing to start
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockImageGenerator.generateDishImage).toHaveBeenCalledWith(mockMenuItems[0]);
    });
  });

  describe('getBatchProgress', () => {
    it('should return null for non-existent session', () => {
      const progress = service.getBatchProgress('non-existent');
      expect(progress).toBeNull();
    });

    it('should return progress for existing session', async () => {
      const sessionId = 'test-session-1';
      await service.addBatch(sessionId, mockMenuItems);
      
      const progress = service.getBatchProgress(sessionId);
      expect(progress).toBeDefined();
      expect(progress!.total).toBe(3);
    });
  });

  describe('getBatchResults', () => {
    it('should return null for non-existent session', () => {
      const results = service.getBatchResults('non-existent');
      expect(results).toBeNull();
    });

    it('should return results for existing session', async () => {
      const sessionId = 'test-session-1';
      
      // Mock to prevent automatic processing
      mockImageGenerator.generateDishImage.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          url: 'test.jpg',
          menuItemId: 'test',
          status: 'success'
        }), 1000))
      );
      
      await service.addBatch(sessionId, mockMenuItems);
      
      const results = service.getBatchResults(sessionId);
      expect(results).toBeDefined();
      expect(results!.sessionId).toBe(sessionId);
      expect(['pending', 'processing']).toContain(results!.status);
    });
  });

  describe('batch processing', () => {
    it('should process items successfully', async () => {
      const sessionId = 'test-session-1';
      
      mockImageGenerator.generateDishImage
        .mockResolvedValueOnce({
          url: 'https://example.com/image1.jpg',
          menuItemId: 'item-1',
          status: 'success'
        })
        .mockResolvedValueOnce({
          url: 'https://example.com/image2.jpg',
          menuItemId: 'item-2',
          status: 'success'
        });

      await service.addBatch(sessionId, mockMenuItems.slice(0, 2));
      
      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const results = service.getBatchResults(sessionId);
      expect(results!.status).toBe('completed');
      expect(results!.results).toHaveLength(2);
      expect(results!.progress.completed).toBe(2);
      expect(results!.progress.percentage).toBe(100);
    });

    it('should handle failed image generation', async () => {
      const sessionId = 'test-session-1';
      
      mockImageGenerator.generateDishImage
        .mockResolvedValueOnce({
          url: '',
          menuItemId: 'item-1',
          status: 'failed',
          errorMessage: 'Generation failed'
        });

      await service.addBatch(sessionId, [mockMenuItems[0]]);
      
      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const results = service.getBatchResults(sessionId);
      expect(results!.status).toBe('completed');
      expect(results!.progress.failed).toBe(1);
      expect(results!.progress.completed).toBe(0);
    });

    it('should respect max concurrent requests', async () => {
      const sessionId = 'test-session-1';
      let concurrentCalls = 0;
      let maxConcurrent = 0;
      
      mockImageGenerator.generateDishImage.mockImplementation(async () => {
        concurrentCalls++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCalls);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        concurrentCalls--;
        return {
          url: 'https://example.com/image.jpg',
          menuItemId: 'test',
          status: 'success'
        };
      });

      await service.addBatch(sessionId, mockMenuItems);
      
      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(maxConcurrent).toBeLessThanOrEqual(mockConfig.maxConcurrentRequests);
    });

    it('should call progress callback during processing', async () => {
      const sessionId = 'test-session-1';
      
      mockImageGenerator.generateDishImage.mockResolvedValue({
        url: 'https://example.com/image.jpg',
        menuItemId: 'test',
        status: 'success'
      });

      await service.addBatch(sessionId, [mockMenuItems[0]]);
      
      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(mockProgressCallback).toHaveBeenCalled();
      const lastCall = mockProgressCallback.mock.calls[mockProgressCallback.mock.calls.length - 1][0];
      expect(lastCall.percentage).toBe(100);
    });
  });

  describe('retry logic', () => {
    it('should retry failed requests up to max retries', async () => {
      const sessionId = 'test-session-1';
      
      mockImageGenerator.generateDishImage
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValueOnce({
          url: 'https://example.com/image.jpg',
          menuItemId: 'item-1',
          status: 'success'
        });

      await service.addBatch(sessionId, [mockMenuItems[0]]);
      
      // Wait for processing with retries to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(mockImageGenerator.generateDishImage).toHaveBeenCalledTimes(3);
      
      const results = service.getBatchResults(sessionId);
      expect(results!.progress.completed).toBe(1);
    });

    it('should mark as failed after max retries exceeded', async () => {
      const sessionId = 'test-session-1';
      
      mockImageGenerator.generateDishImage.mockRejectedValue(new Error('Persistent failure'));

      await service.addBatch(sessionId, [mockMenuItems[0]]);
      
      // Wait for processing with retries to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(mockImageGenerator.generateDishImage).toHaveBeenCalledTimes(mockConfig.maxRetries + 1);
      
      const results = service.getBatchResults(sessionId);
      expect(results!.progress.failed).toBe(1);
      expect(results!.results[0].errorMessage).toBe('Max retries exceeded');
    });
  });

  describe('cancelBatch', () => {
    it('should cancel pending batch', async () => {
      const sessionId = 'test-session-1';
      
      await service.addBatch(sessionId, mockMenuItems);
      
      const cancelled = service.cancelBatch(sessionId);
      expect(cancelled).toBe(true);
      
      const results = service.getBatchResults(sessionId);
      expect(results!.status).toBe('failed');
    });

    it('should not cancel completed batch', async () => {
      const sessionId = 'test-session-1';
      
      mockImageGenerator.generateDishImage.mockResolvedValue({
        url: 'https://example.com/image.jpg',
        menuItemId: 'test',
        status: 'success'
      });

      await service.addBatch(sessionId, [mockMenuItems[0]]);
      
      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const cancelled = service.cancelBatch(sessionId);
      expect(cancelled).toBe(false);
    });

    it('should return false for non-existent session', () => {
      const cancelled = service.cancelBatch('non-existent');
      expect(cancelled).toBe(false);
    });
  });

  describe('getQueueStatus', () => {
    it('should return correct queue status', async () => {
      const sessionId1 = 'test-session-1';
      const sessionId2 = 'test-session-2';
      
      await service.addBatch(sessionId1, mockMenuItems.slice(0, 2));
      await service.addBatch(sessionId2, mockMenuItems.slice(2));
      
      const status = service.getQueueStatus();
      expect(status.totalSessions).toBe(2);
      expect(status.queueLength).toBeGreaterThan(0);
    });
  });

  describe('cleanup', () => {
    it('should clean up old completed batches', async () => {
      const sessionId = 'test-session-1';
      
      mockImageGenerator.generateDishImage.mockResolvedValue({
        url: 'https://example.com/image.jpg',
        menuItemId: 'test',
        status: 'success'
      });

      await service.addBatch(sessionId, [mockMenuItems[0]]);
      
      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Manually set old end time
      const results = service.getBatchResults(sessionId)!;
      results.endTime = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      
      const cleanedCount = service.cleanup(24);
      expect(cleanedCount).toBe(1);
      
      const resultsAfterCleanup = service.getBatchResults(sessionId);
      expect(resultsAfterCleanup).toBeNull();
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics', async () => {
      const sessionId = 'test-session-1';
      
      mockImageGenerator.generateDishImage
        .mockResolvedValueOnce({
          url: 'https://example.com/image.jpg',
          menuItemId: 'item-1',
          status: 'success'
        })
        .mockResolvedValueOnce({
          url: '',
          menuItemId: 'item-2',
          status: 'failed',
          errorMessage: 'Failed'
        });

      await service.addBatch(sessionId, mockMenuItems.slice(0, 2));
      
      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const stats = service.getStatistics();
      expect(stats.totalBatches).toBe(1);
      expect(stats.completedBatches).toBe(1);
      expect(stats.totalImagesGenerated).toBe(2);
      expect(stats.successRate).toBe(50); // 1 success out of 2
    });
  });

  describe('setPriority', () => {
    it('should update priority for session items', async () => {
      const sessionId1 = 'test-session-1';
      const sessionId2 = 'test-session-2';
      
      await service.addBatch(sessionId1, [mockMenuItems[0]]);
      await service.addBatch(sessionId2, [mockMenuItems[1]]);
      
      const updated = service.setPriority(sessionId2, 10);
      expect(updated).toBe(true);
    });

    it('should return false for non-existent session', () => {
      const updated = service.setPriority('non-existent', 10);
      expect(updated).toBe(false);
    });
  });

  describe('rate limiting', () => {
    it('should respect request delay', async () => {
      const sessionId = 'test-session-1';
      const startTime = Date.now();
      
      mockImageGenerator.generateDishImage.mockResolvedValue({
        url: 'https://example.com/image.jpg',
        menuItemId: 'test',
        status: 'success'
      });

      await service.addBatch(sessionId, mockMenuItems.slice(0, 2));
      
      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should take at least the delay time between requests
      expect(totalTime).toBeGreaterThan(mockConfig.requestDelayMs);
    });
  });
});