import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { ImageOptimizer } from '../utils/imageOptimization';

interface OptimizedImageRequest extends Request {
  query: {
    quality?: 'low' | 'medium' | 'high';
    format?: 'jpeg' | 'png' | 'webp';
    width?: string;
    height?: string;
  };
}

export const imageOptimizationMiddleware = async (
  req: OptimizedImageRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { quality = 'medium', format, width, height } = req.query;
    const requestedPath = req.path;
    
    // Only process image files
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const fileExtension = path.extname(requestedPath).toLowerCase();
    
    if (!imageExtensions.includes(fileExtension)) {
      return next();
    }

    // Construct the full file path
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const originalFilePath = path.join(uploadsDir, requestedPath.replace('/uploads/', ''));
    
    // Check if original file exists
    try {
      await fs.access(originalFilePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'file_not_found',
        message: 'Image file not found'
      });
    }

    // Generate optimized version filename
    const parsedPath = path.parse(originalFilePath);
    const optimizedDir = path.join(parsedPath.dir, 'optimized');
    const optimizedFilename = `${parsedPath.name}-${quality}${width ? `-w${width}` : ''}${height ? `-h${height}` : ''}.${format || 'webp'}`;
    const optimizedFilePath = path.join(optimizedDir, optimizedFilename);

    // Check if optimized version already exists
    let shouldGenerate = true;
    try {
      const optimizedStats = await fs.stat(optimizedFilePath);
      const originalStats = await fs.stat(originalFilePath);
      
      // Regenerate if original is newer than optimized version
      shouldGenerate = originalStats.mtime > optimizedStats.mtime;
    } catch {
      // Optimized version doesn't exist, need to generate
      shouldGenerate = true;
    }

    // Generate optimized version if needed
    if (shouldGenerate) {
      await fs.mkdir(optimizedDir, { recursive: true });
      
      const optimizationOptions = {
        quality: getQualityValue(quality),
        width: width ? parseInt(width) : undefined,
        height: height ? parseInt(height) : undefined,
        format: (format || 'webp') as 'jpeg' | 'png' | 'webp'
      };

      await ImageOptimizer.optimizeImage(
        originalFilePath,
        optimizedFilePath,
        optimizationOptions
      );
    }

    // Set caching headers
    const maxAge = 30 * 24 * 60 * 60; // 30 days
    res.set({
      'Cache-Control': `public, max-age=${maxAge}, immutable`,
      'ETag': `"${path.basename(optimizedFilePath)}"`,
      'Vary': 'Accept-Encoding',
      'Content-Type': getMimeType(format || 'webp')
    });

    // Check if client has cached version
    const clientETag = req.headers['if-none-match'];
    if (clientETag === `"${path.basename(optimizedFilePath)}"`) {
      return res.status(304).end();
    }

    // Serve the optimized image
    res.sendFile(optimizedFilePath);
    
  } catch (error) {
    console.error('Image optimization middleware error:', error);
    // Fall back to serving original file
    next();
  }
};

function getQualityValue(quality: string): number {
  switch (quality) {
    case 'low': return 40;
    case 'medium': return 70;
    case 'high': return 90;
    default: return 70;
  }
}

function getMimeType(format: string): string {
  switch (format) {
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'webp': return 'image/webp';
    default: return 'image/webp';
  }
}

export default imageOptimizationMiddleware;