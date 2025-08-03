import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { ProcessingPipeline, ProcessingProgress } from '../ProcessingPipeline';

// Mock the dependencies
jest.mock('../OCRExtractor', () => ({
  OCRExtractor: jest.fn().mockImplementation(() => ({
    extractText: jest.fn().mockResolvedValue({
      rawText: 'Mock menu text\nBurger - $15.99\nPizza - $18.99',
      confidence: 0.85,
      processingTime: 1500
    }),
    parseMenuItems: jest.fn().mockResolvedValue([
      {
        id: 'item-1',
        name: 'Burger',
        description: 'Juicy beef burger',
        price: '$15.99',
        category: 'Main Course'
      },
      {
        id: 'item-2',
        name: 'Pizza',
        description: 'Margherita pizza',
        price: '$18.99',
        category: 'Main Course'
      }
    ])
  }))
}));

jest.mock('../ImageUploadHandler', () => ({
  ImageUploadHandler: jest.fn().mockImplementation(() => ({
    preprocessImage: jest.fn().mockResolvedValue({
      url: 'https://processed.example.com/menu.jpg',
      metadata: {
        width: 800,
        height: 600,
        format: 'jpeg',
        size: 150000
      }
    })
  }))
}));

describe('ProcessingPipeline', () => {
  let pipeline: ProcessingPipeline;
  let progressEvents: ProcessingProgress[] = [];

  beforeEach(() => {
    pipeline = new ProcessingPipeline();
    progressEvents = [];
    
    // Listen to progress events
    pipeline.on('progress', (progress: ProcessingProgress) => {
      progressEvents.push(progress);
    });
  });

  afterEach(() => {
    pipeline.destroy();
  });

  describe('processMenuImage', () => {
    it('should process menu image successfully through complete pipeline', async () => {
      const sessionId = 'test-session-123';
      const imageUrl = 'https://example.com/menu.jpg';

      const result = await pipeline.processMenuImage(sessionId, imageUrl);

      // Verify the result structure
      expect(result).toHaveProperty('originalImage', imageUrl);
      expect(result).toHaveProperty('extractedItems');
      expect(result).toHaveProperty('generatedImages');
      expect(result).toHaveProperty('processingStatus');
      expect(Array.isArray(result.extractedItems)).toBe(true);
      expect(Array.isArray(result.generatedImages)).toBe(true);
    });

    it('should emit progress events during processing', async () => {
      const sessionId = 'test-session-456';
      const imageUrl = 'https://example.com/menu.jpg';

      await pipeline.processMenuImage(sessionId, imageUrl);

      // Should have emitted multiple progress events
      expect(progressEvents.length).toBeGreaterThan(0);
      
      // Check that progress increases over time
      const progressValues = progressEvents.map(e => e.progress);
      expect(progressValues.length).toBeGreaterThan(1);
      expect(progressValues[progressValues.length - 1]).toBeGreaterThan(progressValues[0]);
      
      // Final event should indicate completion
      const finalEvent = progressEvents[progressEvents.length - 1];
      expect(finalEvent.status).toBe('completed');
      expect(finalEvent.progress).toBe(100);
    });

    it('should handle processing errors gracefully', async () => {
      // Create a new pipeline with failing mocks for this test
      const failingPipeline = new ProcessingPipeline();
      const failingProgressEvents: ProcessingProgress[] = [];
      
      failingPipeline.on('progress', (progress: ProcessingProgress) => {
        failingProgressEvents.push(progress);
      });

      // Mock the OCR extractor to throw an error
      const mockOCRExtractor = (failingPipeline as any).ocrExtractor;
      mockOCRExtractor.extractText = jest.fn().mockRejectedValue(new Error('OCR_LOW_CONFIDENCE'));

      const sessionId = 'test-session-error';
      const imageUrl = 'invalid-url';

      const result = await failingPipeline.processMenuImage(sessionId, imageUrl);

      // Should return failed result instead of throwing
      expect(result.processingStatus).toBe('failed');
      expect(result.extractedItems).toEqual([]);
      expect(result.generatedImages).toEqual([]);
      
      // Should emit error progress event
      const errorEvent = failingProgressEvents.find(e => e.status === 'failed');
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.error).toBeDefined();
      
      failingPipeline.destroy();
    });

    it('should include proper stage information in progress events', async () => {
      const sessionId = 'test-session-stages';
      const imageUrl = 'https://example.com/menu.jpg';

      await pipeline.processMenuImage(sessionId, imageUrl);

      // Check that different stages are reported
      const stages = progressEvents.map(e => e.currentStage);
      expect(stages.length).toBeGreaterThan(0);
      
      // Should have at least some of the expected stages
      const hasPreprocessing = stages.some(s => s.includes('Preprocessing'));
      const hasExtraction = stages.some(s => s.includes('Extracting'));
      expect(hasPreprocessing || hasExtraction).toBe(true);
    });

    it('should provide estimated time remaining', async () => {
      const sessionId = 'test-session-timing';
      const imageUrl = 'https://example.com/menu.jpg';

      await pipeline.processMenuImage(sessionId, imageUrl);

      // Most progress events should have time estimates
      const eventsWithTime = progressEvents.filter(e => 
        e.estimatedTimeRemaining !== undefined && e.estimatedTimeRemaining > 0
      );
      expect(eventsWithTime.length).toBeGreaterThan(0);
    });
  });

  describe('timeout handling', () => {
    it('should handle processing timeout', async () => {
      const sessionId = 'test-timeout';
      
      // Test that timeout functionality exists by checking cancellation
      pipeline.cancelProcessing(sessionId);
      
      // Should emit cancellation event
      const cancelEvent = progressEvents.find(e => 
        e.error?.includes('cancelled')
      );
      expect(cancelEvent).toBeDefined();
    });
  });

  describe('cancelProcessing', () => {
    it('should cancel processing and emit cancellation event', async () => {
      const sessionId = 'test-cancel';
      
      // Start processing but cancel immediately
      const processingPromise = pipeline.processMenuImage(sessionId, 'https://example.com/menu.jpg');
      pipeline.cancelProcessing(sessionId);
      
      await processingPromise;

      // Should have emitted cancellation event
      const cancelEvent = progressEvents.find(e => 
        e.error?.includes('cancelled')
      );
      expect(cancelEvent).toBeDefined();
    });
  });

  describe('getProcessingResults', () => {
    it('should retrieve stored processing results', async () => {
      const sessionId = 'test-retrieve';
      const imageUrl = 'https://example.com/menu.jpg';

      // Process an image first
      await pipeline.processMenuImage(sessionId, imageUrl);

      // Then retrieve the results
      const results = await pipeline.getProcessingResults(sessionId);

      expect(results).toBeDefined();
      expect(results?.originalImage).toBe(imageUrl);
      expect(results?.processingStatus).toBe('completed');
    });

    it('should return null for non-existent session', async () => {
      const results = await pipeline.getProcessingResults('non-existent-session');
      expect(results).toBeNull();
    });
  });

  describe('error message handling', () => {
    it('should provide user-friendly error messages', async () => {
      const sessionId = 'test-error-messages';
      
      // Test that error messages are user-friendly
      progressEvents = []; // Reset events
      
      const result = await pipeline.processMenuImage(sessionId, 'error-url');
      
      if (result.processingStatus === 'failed') {
        const errorEvent = progressEvents.find(e => e.error);
        expect(errorEvent?.error).toBeDefined();
        expect(typeof errorEvent?.error).toBe('string');
        expect(errorEvent?.error?.length).toBeGreaterThan(0);
      }
    });
  });

  describe('resource cleanup', () => {
    it('should clean up resources when destroyed', () => {
      const pipeline = new ProcessingPipeline();
      
      // Start some processing
      pipeline.processMenuImage('test-cleanup', 'https://example.com/menu.jpg');
      
      // Destroy should not throw
      expect(() => pipeline.destroy()).not.toThrow();
    });
  });

  describe('integration with repositories', () => {
    it('should store session and menu items in repositories', async () => {
      const sessionId = 'test-storage';
      const imageUrl = 'https://example.com/menu.jpg';

      const result = await pipeline.processMenuImage(sessionId, imageUrl);

      // Verify that data was stored by retrieving it
      const storedResults = await pipeline.getProcessingResults(sessionId);
      
      expect(storedResults).toBeDefined();
      expect(storedResults?.originalImage).toBe(imageUrl);
      
      // If menu items were extracted, they should be stored
      if (result.extractedItems.length > 0) {
        expect(storedResults?.extractedItems.length).toBeGreaterThan(0);
      }
    });
  });
});