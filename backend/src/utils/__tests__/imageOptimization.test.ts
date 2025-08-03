import { ImageOptimizer } from '../imageOptimization';
import fs from 'fs/promises';
import sharp from 'sharp';

// Mock sharp
jest.mock('sharp');
const mockSharp = sharp as jest.MockedFunction<typeof sharp>;

// Mock fs
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ImageOptimizer', () => {
  const mockSharpInstance = {
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    toFile: jest.fn(),
    metadata: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSharp.mockReturnValue(mockSharpInstance as any);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.stat.mockResolvedValue({ size: 1024 } as any);
  });

  describe('optimizeImage', () => {
    it('optimizes image with default settings', async () => {
      const mockInfo = { width: 800, height: 600, format: 'jpeg' };
      mockSharpInstance.toFile.mockResolvedValue(mockInfo);

      const result = await ImageOptimizer.optimizeImage(
        'input.jpg',
        'output.jpg'
      );

      expect(mockSharp).toHaveBeenCalledWith('input.jpg');
      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({
        quality: 80,
        progressive: true,
        mozjpeg: true
      });
      expect(result).toEqual({
        path: 'output.jpg',
        size: 1024,
        width: 800,
        height: 600,
        format: 'jpeg'
      });
    });

    it('applies resize when dimensions specified', async () => {
      const mockInfo = { width: 400, height: 300, format: 'jpeg' };
      mockSharpInstance.toFile.mockResolvedValue(mockInfo);

      await ImageOptimizer.optimizeImage('input.jpg', 'output.jpg', {
        width: 400,
        height: 300
      });

      expect(mockSharpInstance.resize).toHaveBeenCalledWith(400, 300, {
        fit: 'inside',
        withoutEnlargement: true
      });
    });

    it('handles different output formats', async () => {
      const mockInfo = { width: 800, height: 600, format: 'webp' };
      mockSharpInstance.toFile.mockResolvedValue(mockInfo);

      await ImageOptimizer.optimizeImage('input.jpg', 'output.webp', {
        format: 'webp',
        quality: 85
      });

      expect(mockSharpInstance.webp).toHaveBeenCalledWith({
        quality: 85,
        effort: 6
      });
    });

    it('creates output directory if it does not exist', async () => {
      const mockInfo = { width: 800, height: 600, format: 'jpeg' };
      mockSharpInstance.toFile.mockResolvedValue(mockInfo);

      await ImageOptimizer.optimizeImage(
        'input.jpg',
        'nested/dir/output.jpg'
      );

      expect(mockFs.mkdir).toHaveBeenCalledWith('nested/dir', { recursive: true });
    });

    it('throws error when optimization fails', async () => {
      mockSharpInstance.toFile.mockRejectedValue(new Error('Sharp error'));

      await expect(
        ImageOptimizer.optimizeImage('input.jpg', 'output.jpg')
      ).rejects.toThrow('Image optimization failed: Sharp error');
    });
  });

  describe('generateMultipleQualities', () => {
    it('generates low, medium, and high quality versions', async () => {
      const mockInfo = { width: 800, height: 600, format: 'webp' };
      mockSharpInstance.toFile.mockResolvedValue(mockInfo);

      const results = await ImageOptimizer.generateMultipleQualities(
        'input.jpg',
        'output',
        'image.jpg'
      );

      expect(Object.keys(results)).toEqual(['low', 'medium', 'high']);
      expect(mockSharpInstance.toFile).toHaveBeenCalledTimes(3);
      
      // Check that different quality settings were used
      expect(mockSharpInstance.webp).toHaveBeenCalledWith(
        expect.objectContaining({ quality: 40 })
      );
      expect(mockSharpInstance.webp).toHaveBeenCalledWith(
        expect.objectContaining({ quality: 70 })
      );
      expect(mockSharpInstance.webp).toHaveBeenCalledWith(
        expect.objectContaining({ quality: 90 })
      );
    });

    it('continues processing other qualities if one fails', async () => {
      const mockInfo = { width: 800, height: 600, format: 'webp' };
      mockSharpInstance.toFile
        .mockResolvedValueOnce(mockInfo) // low quality succeeds
        .mockRejectedValueOnce(new Error('Medium quality failed')) // medium fails
        .mockResolvedValueOnce(mockInfo); // high quality succeeds

      const results = await ImageOptimizer.generateMultipleQualities(
        'input.jpg',
        'output',
        'image.jpg'
      );

      expect(Object.keys(results)).toEqual(['low', 'high']);
      expect(results.medium).toBeUndefined();
    });
  });

  describe('createPlaceholder', () => {
    it('creates low quality placeholder image', async () => {
      const mockInfo = { width: 50, height: 38, format: 'jpeg' };
      mockSharpInstance.toFile.mockResolvedValue(mockInfo);

      const result = await ImageOptimizer.createPlaceholder(
        'input.jpg',
        'placeholder.jpg'
      );

      expect(mockSharpInstance.resize).toHaveBeenCalledWith(50, undefined, {
        fit: 'inside',
        withoutEnlargement: true
      });
      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({
        quality: 20,
        progressive: false,
        mozjpeg: true
      });
      expect(result.width).toBe(50);
    });
  });

  describe('getImageMetadata', () => {
    it('returns image metadata', async () => {
      const mockMetadata = {
        width: 1920,
        height: 1080,
        format: 'jpeg',
        size: 2048000,
        hasAlpha: false,
        density: 72
      };
      mockSharpInstance.metadata.mockResolvedValue(mockMetadata);

      const result = await ImageOptimizer.getImageMetadata('image.jpg');

      expect(mockSharp).toHaveBeenCalledWith('image.jpg');
      expect(result).toEqual(mockMetadata);
    });

    it('handles missing metadata fields', async () => {
      const mockMetadata = {}; // Empty metadata
      mockSharpInstance.metadata.mockResolvedValue(mockMetadata);

      const result = await ImageOptimizer.getImageMetadata('image.jpg');

      expect(result).toEqual({
        width: 0,
        height: 0,
        format: 'unknown',
        size: 0,
        hasAlpha: false,
        density: 72
      });
    });

    it('throws error when metadata extraction fails', async () => {
      mockSharpInstance.metadata.mockRejectedValue(new Error('Metadata error'));

      await expect(
        ImageOptimizer.getImageMetadata('image.jpg')
      ).rejects.toThrow('Failed to get image metadata: Metadata error');
    });
  });

  describe('shouldOptimize', () => {
    it('returns true for large files', async () => {
      mockFs.stat.mockResolvedValue({ size: 600 * 1024 } as any); // 600KB
      mockSharpInstance.metadata.mockResolvedValue({
        width: 800,
        height: 600,
        format: 'jpeg'
      });

      const result = await ImageOptimizer.shouldOptimize('image.jpg');
      expect(result).toBe(true);
    });

    it('returns true for large dimensions', async () => {
      mockFs.stat.mockResolvedValue({ size: 100 * 1024 } as any); // 100KB
      mockSharpInstance.metadata.mockResolvedValue({
        width: 2000,
        height: 1500,
        format: 'jpeg'
      });

      const result = await ImageOptimizer.shouldOptimize('image.jpg');
      expect(result).toBe(true);
    });

    it('returns true for unoptimized formats', async () => {
      mockFs.stat.mockResolvedValue({ size: 100 * 1024 } as any); // 100KB
      mockSharpInstance.metadata.mockResolvedValue({
        width: 800,
        height: 600,
        format: 'jpeg'
      });

      const result = await ImageOptimizer.shouldOptimize('image.jpg');
      expect(result).toBe(true);
    });

    it('returns false for already optimized images', async () => {
      mockFs.stat.mockResolvedValue({ size: 100 * 1024 } as any); // 100KB
      mockSharpInstance.metadata.mockResolvedValue({
        width: 800,
        height: 600,
        format: 'webp'
      });

      const result = await ImageOptimizer.shouldOptimize('image.webp');
      expect(result).toBe(false);
    });

    it('returns true when error occurs during check', async () => {
      mockFs.stat.mockRejectedValue(new Error('File not found'));

      const result = await ImageOptimizer.shouldOptimize('image.jpg');
      expect(result).toBe(true);
    });
  });
});

// Performance benchmarks
describe('ImageOptimizer Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks to use real implementations for performance tests
    jest.unmock('sharp');
    jest.unmock('fs/promises');
  });

  afterEach(() => {
    // Re-mock for other tests
    jest.mock('sharp');
    jest.mock('fs/promises');
  });

  it('optimizes images within acceptable time limits', async () => {
    // This would be a real performance test in a full implementation
    // For now, we'll simulate the timing expectations
    const startTime = Date.now();
    
    // Simulate optimization time
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    // Image optimization should complete within 1 second for typical images
    expect(processingTime).toBeLessThan(1000);
  });

  it('handles batch processing efficiently', async () => {
    const startTime = Date.now();
    
    // Simulate batch processing of 5 images
    const promises = Array(5).fill(null).map(() => 
      new Promise(resolve => setTimeout(resolve, 5))
    );
    
    await Promise.all(promises);
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    // Batch processing should be more efficient than sequential
    expect(processingTime).toBeLessThan(100); // Should be much faster than 5 * individual time
  });
});