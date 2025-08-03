import { ValidationResult } from '../types';
export declare const SUPPORTED_FORMATS: string[];
export declare const SUPPORTED_EXTENSIONS: string[];
export declare const MAX_FILE_SIZE: number;
export declare function validateFileFormat(file: Express.Multer.File): ValidationResult;
export declare function validateFileSize(file: Express.Multer.File): ValidationResult;
export declare function validateUploadedFile(file: Express.Multer.File): ValidationResult;
export declare function generateValidationErrorMessage(error: string): string;
export declare function isValidImageFile(file: Express.Multer.File): boolean;
export declare function formatFileSize(bytes: number): string;
//# sourceMappingURL=fileValidation.d.ts.map