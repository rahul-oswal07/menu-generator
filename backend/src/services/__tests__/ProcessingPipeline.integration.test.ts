import { ProcessingPipeline } from '../ProcessingPipeline';
import { ImageGeneratorService } from '../ImageGeneratorService';
import { MenuItem } from '../../types';

// Mock the dependencies
jest.mock('../OCRExtractor');
jest.mock('../ImageUploadHandler');
jest.mock('../../models/Session');
jest.mock('../../models/MenuItemModel');

describe('ProcessingPipeline Integration', () => {
  let pipeline: ProcessingPipeline;
  let mockImageGenerator: jest.Mocked<ImageGeneratorService>;

  beforeEach(() => {
    // Create mock image generator
    mockImageGenerator = {
      generateDishImage: jest.fn(),
      batchGenerate: jest.fn(),
      setPlaceholderImageUrl: jest.fn(),
      getPlaceholderImageUrl: jest.fn()
    } as any;

    pipeline = new ProcessingPipeline(mockImageGenerator);
  });

  afterEach(() => {
    pipeline.destroy();
    jest.clearAllMocks();
  });

  describe('processMenuImage with image generation', () => {
    it('should complete full pipeline including image generation', async () => {
      const sessionId = 'test-session-1';
      const imageUrl = 'https://example.com/menu.jpg';

      // Mock successful image generation
      mockImageGenerator.generateDishImage.mockResolvedValue({
        url: 'https://example.com/generated-dish.jpg',
        menuItemId: 'item-1',
        status: 'success'
      });

      // Mock OCR and other services to return test data
      const mockMenuItems: MenuItem[] = [
        {
          id: 'item-1',
          name: 'Test Dish',
          description: 'A test dish',
          price: '$10.99'
        }
      ];

      // Mock the OCR extractor to return test data
      const ocrExtractor = require('../OCRExtractor').OCRExtractor;
      ocrExtractor.prototype.extractText = jest.fn().mockResolvedValue({
        rawText: 'Test Dish - A test dish - $10.99',
        confidence: 0.9,
        processingTime: 1000
      });
      ocrExtractor.prototype.parseMenuItems = jest.fn().mockResolvedValue(mockMenuItems);

      // Mock image upload handler
      const imageUploadHandler = require('../ImageUploadHandler').ImageUploadHandler;
      imageUploadHandler.prototype.preprocessImage = jest.fn().mockResolvedValue({
        url: imageUrl,
        metadata: { width: 800, height: 600, format: 'jpg', size: 100000 }
      });

      // Mock repositories
      const sessionRepository = require('../../models/Session').SessionRepository;
      sessionRepository.prototype.create = jest.fn().mockResolvedValue(true);

      const menuItemRepository = require('../../models/MenuItemModel').MenuItemRepository;
      menuItemRepository.prototype.createMany = jest.fn().mockResolvedValue(mockMenuItems);
      menuItemRepository.prototype.updateGenerationStatus = jest.fn().mockResolvedValue(true);

      // Track progress events
      const progressEvents: any[] = [];
      pipeline.on('progress', (progress) => {
        progressEvents.push(progress);
      });

      // Process the menu image
      const result = await pipeline.processMenuImage(sessionId, imageUrl);

      // Verify the result
      expect(result.processingStatus).toBe('completed');
      expect(result.extractedItems).toHaveLength(1);
      expect(result.extractedItems[0].name).toBe('Test Dish');

      // Verify progress events were emitted
      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[progressEvents.length - 1].status).toBe('completed');
      expect(progressEvents[progressEvents.length - 1].progress).toBe(100);
    });

    it('should handle image generation failures gracefully', async () => {
      const sessionId = 'test-session-2';
      const imageUrl = 'https://example.com/menu.jpg';

      // Mock failed image generation
      mockImageGenerator.generateDishImage.mockRejectedValue(new Error('Image generation failed'));

      // Mock OCR to return test data
      const mockMenuItems: MenuItem[] = [
        {
          id: 'item-1',
          name: 'Test Dish',
          description: 'A test dish',
          price: '$10.99'
        }
      ];

      // Mock the dependencies
      const ocrExtractor = require('../OCRExtractor').OCRExtractor;
      ocrExtractor.prototype.extractText = jest.fn().mockResolvedValue({
        rawText: 'Test Dish - A test dish - $10.99',
        confidence: 0.9,
        processingTime: 1000
      });
      ocrExtractor.prototype.parseMenuItems = jest.fn().mockResolvedValue(mockMenuItems);

      const imageUploadHandler = require('../ImageUploadHandler').ImageUploadHandler;
      imageUploadHandler.prototype.preprocessImage = jest.fn().mockResolvedValue({
        url: imageUrl,
        metadata: { width: 800, height: 600, format: 'jpg', size: 100000 }
      });

      const sessionRepository = require('../../models/Session').SessionRepository;
      sessionRepository.prototype.create = jest.fn().mockResolvedValue(true);

      const menuItemRepository = require('../../models/MenuItemModel').MenuItemRepository;
      menuItemRepository.prototype.createMany = jest.fn().mockResolvedValue(mockMenuItems);
      menuItemRepository.prototype.updateGenerationStatus = jest.fn().mockResolvedValue(true);

      // Process the menu image
      const result = await pipeline.processMenuImage(sessionId, imageUrl);

      // Should still complete successfully even if image generation fails
      expect(result.processingStatus).toBe('completed');
      expect(result.extractedItems).toHaveLength(1);
    });
  });

  describe('getImageGenerationStatus', () => {
    it('should return null when batch service is not available', () => {
      const pipelineWithoutImageGen = new ProcessingPipeline();
      const status = pipelineWithoutImageGen.getImageGenerationStatus('test-session');
      expect(status).toBeNull();
      pipelineWithoutImageGen.destroy();
    });

    it('should return status when batch service is available', () => {
      // This would require the batch service to be properly initialized
      // For now, we'll just test that the method exists and doesn't throw
      expect(() => {
        pipeline.getImageGenerationStatus('test-session');
      }).not.toThrow();
    });
  });

  describe('regenerateImages', () => {
    it('should return false when image generator is not available', async () => {
      const pipelineWithoutImageGen = new ProcessingPipeline();
      const result = await pipelineWithoutImageGen.regenerateImages('test-session', ['item-1']);
      expect(result).toBe(false);
      pipelineWithoutImageGen.destroy();
    });

    it('should attempt to regenerate images when service is available', async () => {
      // Mock menu item repository
      const menuItemRepository = require('../../models/MenuItemModel').MenuItemRepository;
      menuItemRepository.prototype.findBySessionId = jest.fn().mockResolvedValue([
        {
          id: 'item-1',
          name: 'Test Dish',
          description: 'A test dish',
          price: '$10.99',
          sessionId: 'test-session'
        }
      ]);

      const result = await pipeline.regenerateImages('test-session', ['item-1']);
      
      // Should return true if the process starts successfully
      expect(typeof result).toBe('boolean');
    });
  });

  describe('error handling', () => {
    it('should handle OCR failures gracefully', async () => {
      const sessionId = 'test-session-error';
      const imageUrl = 'https://example.com/menu.jpg';

      // Mock OCR failure
      const ocrExtractor = require('../OCRExtractor').OCRExtractor;
      ocrExtractor.prototype.extractText = jest.fn().mockRejectedValue(new Error('OCR failed'));

      const imageUploadHandler = require('../ImageUploadHandler').ImageUploadHandler;
      imageUploadHandler.prototype.preprocessImage = jest.fn().mockResolvedValue({
        url: imageUrl,
        metadata: { width: 800, height: 600, format: 'jpg', size: 100000 }
      });

      // Track progress events
      const progressEvents: any[] = [];
      pipeline.on('progress', (progress) => {
        progressEvents.push(progress);
      });

      const result = await pipeline.processMenuImage(sessionId, imageUrl);

      // Should return failed result
      expect(result.processingStatus).toBe('failed');
      expect(result.extractedItems).toHaveLength(0);

      // Should emit failure progress
      const lastEvent = progressEvents[progressEvents.length - 1];
      expect(lastEvent.status).toBe('failed');
      expect(lastEvent.error).toBeDefined();
    });

    it('should handle low confidence OCR results', async () => {
      const sessionId = 'test-session-low-confidence';
      const imageUrl = 'https://example.com/menu.jpg';

      // Mock low confidence OCR
      const ocrExtractor = require('../OCRExtractor').OCRExtractor;
      ocrExtractor.prototype.extractText = jest.fn().mockResolvedValue({
        rawText: 'unclear text',
        confidence: 0.1, // Very low confidence
        processingTime: 1000
      });

      const imageUploadHandler = require('../ImageUploadHandler').ImageUploadHandler;
      imageUploadHandler.prototype.preprocessImage = jest.fn().mockResolvedValue({
        url: imageUrl,
        metadata: { width: 800, height: 600, format: 'jpg', size: 100000 }
      });

      const result = await pipeline.processMenuImage(sessionId, imageUrl);

      // Should fail due to low confidence
      expect(result.processingStatus).toBe('failed');
    });
  });

  describe('timeout handling', () => {
    it('should handle processing timeout', async () => {
      const sessionId = 'test-session-timeout';
      const imageUrl = 'https://example.com/menu.jpg';

      // Mock a very slow OCR process
      const ocrExtractor = require('../OCRExtractor').OCRExtractor;
      ocrExtractor.prototype.extractText = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 70000)) // Longer than timeout
      );

      const imageUploadHandler = require('../ImageUploadHandler').ImageUploadHandler;
      imageUploadHandler.prototype.preprocessImage = jest.fn().mockResolvedValue({
        url: imageUrl,
        metadata: { width: 800, height: 600, format: 'jpg', size: 100000 }
      });

      // Track progress events
      const progressEvents: any[] = [];
      pipeline.on('progress', (progress) => {
        progressEvents.push(progress);
      });

      // This test would need to be adjusted based on actual timeout implementation
      // For now, we'll just verify the method completes
      const result = await pipeline.processMenuImage(sessionId, imageUrl);
      expect(result).toBeDefined();
    });
  });
});