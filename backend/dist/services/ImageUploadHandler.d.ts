import { ImageUploadHandler as IImageUploadHandler } from '../interfaces/ImageUploadHandler';
import { ValidationResult, ProcessedImage } from '../types';
export declare class ImageUploadHandler implements IImageUploadHandler {
    private uploadsDir;
    constructor(uploadsDir?: string);
    validateFile(file: Express.Multer.File): ValidationResult;
    uploadToStorage(file: Express.Multer.File): Promise<string>;
    preprocessImage(imageUrl: string): Promise<ProcessedImage>;
    private ensureUploadsDirectory;
    private urlToFilePath;
    private getFormatFromExtension;
    static generateSessionId(): string;
    static createSessionDirectory(sessionId: string, baseDir?: string): string;
}
//# sourceMappingURL=ImageUploadHandler.d.ts.map