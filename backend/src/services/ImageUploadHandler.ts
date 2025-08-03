import { ImageUploadHandler as IImageUploadHandler } from '../interfaces/ImageUploadHandler';
import { ValidationResult, ProcessedImage } from '../types';
import { validateUploadedFile } from '../utils/fileValidation';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export class ImageUploadHandler implements IImageUploadHandler {
  private uploadsDir: string;

  constructor(uploadsDir: string = 'uploads') {
    this.uploadsDir = path.resolve(uploadsDir);
    this.ensureUploadsDirectory();
  }

  /**
   * Validates the uploaded file according to our requirements
   */
  validateFile(file: Express.Multer.File): ValidationResult {
    return validateUploadedFile(file);
  }

  /**
   * Uploads file to storage and returns the URL
   * Note: In this implementation, the file is already uploaded by multer
   * This method would be used for cloud storage integration
   */
  async uploadToStorage(file: Express.Multer.File): Promise<string> {
    try {
      // For local storage, the file is already saved by multer
      // Return the relative URL path
      const relativePath = path.relative(process.cwd(), file.path);
      return `/${relativePath.replace(/\\/g, '/')}`;
    } catch (error) {
      console.error('Error uploading file to storage:', error);
      throw new Error('Failed to upload file to storage');
    }
  }

  /**
   * Preprocesses the image for OCR optimization
   * Currently returns basic metadata, can be extended for image processing
   */
  async preprocessImage(imageUrl: string): Promise<ProcessedImage> {
    try {
      // Convert URL to file path
      const filePath = this.urlToFilePath(imageUrl);
      
      if (!fs.existsSync(filePath)) {
        throw new Error('Image file not found');
      }

      // Get file stats
      const stats = fs.statSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      
      // Basic image metadata (in a real implementation, you'd use an image library)
      const metadata = {
        width: 0, // Would be determined by image processing library
        height: 0, // Would be determined by image processing library
        format: this.getFormatFromExtension(ext),
        size: stats.size
      };

      return {
        url: imageUrl,
        metadata
      };
    } catch (error) {
      console.error('Error preprocessing image:', error);
      throw new Error('Failed to preprocess image');
    }
  }

  /**
   * Ensures the uploads directory exists
   */
  private ensureUploadsDirectory(): void {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Converts a URL path to a file system path
   */
  private urlToFilePath(url: string): string {
    // Remove leading slash and convert to file path
    const relativePath = url.startsWith('/') ? url.slice(1) : url;
    return path.join(process.cwd(), relativePath);
  }

  /**
   * Gets image format from file extension
   */
  private getFormatFromExtension(ext: string): string {
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        return 'jpeg';
      case '.png':
        return 'png';
      case '.webp':
        return 'webp';
      default:
        return 'unknown';
    }
  }

  /**
   * Generates a unique session ID for file uploads
   */
  static generateSessionId(): string {
    return uuidv4();
  }

  /**
   * Creates a session-specific directory for file storage
   */
  static createSessionDirectory(sessionId: string, baseDir: string = 'uploads'): string {
    const sessionDir = path.join(baseDir, sessionId, 'original');
    fs.mkdirSync(sessionDir, { recursive: true });
    return sessionDir;
  }
}