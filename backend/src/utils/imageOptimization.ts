import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

export interface ImageOptimizationOptions {
  quality?: number;
  width?: number;
  height?: number;
  format?: 'jpeg' | 'png' | 'webp';
  progressive?: boolean;
}

export interface OptimizedImageResult {
  path: string;
  size: number;
  width: number;
  height: number;
  format: string;
}

export class ImageOptimizer {
  private static readonly QUALITY_PRESETS = {
    low: { quality: 40, width: 400 },
    medium: { quality: 70, width: 800 },
    high: { quality: 90, width: 1200 }
  };

  /**
   * Optimize an image with specified options
   */
  static async optimizeImage(
    inputPath: string,
    outputPath: string,
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizedImageResult> {
    const {
      quality = 80,
      width,
      height,
      format = 'jpeg',
      progressive = true
    } = options;

    try {
      let pipeline = sharp(inputPath);

      // Resize if dimensions specified
      if (width || height) {
        pipeline = pipeline.resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Apply format-specific optimizations
      switch (format) {
        case 'jpeg':
          pipeline = pipeline.jpeg({
            quality,
            progressive,
            mozjpeg: true // Use mozjpeg encoder for better compression
          });
          break;
        case 'png':
          pipeline = pipeline.png({
            quality,
            progressive,
            compressionLevel: 9
          });
          break;
        case 'webp':
          pipeline = pipeline.webp({
            quality,
            effort: 6 // Higher effort for better compression
          });
          break;
      }

      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      await fs.mkdir(outputDir, { recursive: true });

      // Process and save the image
      const info = await pipeline.toFile(outputPath);
      
      // Get file size
      const stats = await fs.stat(outputPath);

      return {
        path: outputPath,
        size: stats.size,
        width: info.width,
        height: info.height,
        format: info.format
      };
    } catch (error) {
      throw new Error(`Image optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate multiple quality versions of an image
   */
  static async generateMultipleQualities(
    inputPath: string,
    outputDir: string,
    filename: string
  ): Promise<Record<string, OptimizedImageResult>> {
    const results: Record<string, OptimizedImageResult> = {};
    const baseFilename = path.parse(filename).name;

    for (const [qualityLevel, preset] of Object.entries(this.QUALITY_PRESETS)) {
      const outputFilename = `${baseFilename}-${qualityLevel}.webp`;
      const outputPath = path.join(outputDir, outputFilename);

      try {
        results[qualityLevel] = await this.optimizeImage(inputPath, outputPath, {
          ...preset,
          format: 'webp'
        });
      } catch (error) {
        console.error(`Failed to generate ${qualityLevel} quality version:`, error);
        // Continue with other quality levels even if one fails
      }
    }

    return results;
  }

  /**
   * Create a low-quality placeholder image
   */
  static async createPlaceholder(
    inputPath: string,
    outputPath: string
  ): Promise<OptimizedImageResult> {
    return this.optimizeImage(inputPath, outputPath, {
      quality: 20,
      width: 50,
      format: 'jpeg',
      progressive: false
    });
  }

  /**
   * Get optimized image metadata without processing
   */
  static async getImageMetadata(imagePath: string) {
    try {
      const metadata = await sharp(imagePath).metadata();
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: metadata.size || 0,
        hasAlpha: metadata.hasAlpha || false,
        density: metadata.density || 72
      };
    } catch (error) {
      throw new Error(`Failed to get image metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if image needs optimization based on size and format
   */
  static async shouldOptimize(imagePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(imagePath);
      const metadata = await this.getImageMetadata(imagePath);

      // Optimize if file is larger than 500KB or dimensions are very large
      const shouldOptimizeSize = stats.size > 500 * 1024;
      const shouldOptimizeDimensions = (metadata.width > 1920) || (metadata.height > 1080);
      const isUnoptimizedFormat = !['webp', 'avif'].includes(metadata.format);

      return shouldOptimizeSize || shouldOptimizeDimensions || isUnoptimizedFormat;
    } catch (error) {
      console.error('Error checking if image should be optimized:', error);
      return true; // Default to optimizing if we can't determine
    }
  }
}

export default ImageOptimizer;