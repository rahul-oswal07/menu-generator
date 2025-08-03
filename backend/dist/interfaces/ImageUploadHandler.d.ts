import { ValidationResult, ProcessedImage } from '../types';
export interface ImageUploadHandler {
    validateFile(file: Express.Multer.File): ValidationResult;
    uploadToStorage(file: Express.Multer.File): Promise<string>;
    preprocessImage(imageUrl: string): Promise<ProcessedImage>;
}
//# sourceMappingURL=ImageUploadHandler.d.ts.map