import { Request, Response, NextFunction } from 'express';
export declare class AppError extends Error {
    statusCode: number;
    errorCode: string;
    isOperational: boolean;
    details?: any;
    constructor(message: string, statusCode?: number, errorCode?: string, isOperational?: boolean, details?: any);
}
export declare const ErrorTypes: {
    VALIDATION_ERROR: string;
    FILE_UPLOAD_ERROR: string;
    OCR_ERROR: string;
    IMAGE_GENERATION_ERROR: string;
    EXTERNAL_SERVICE_ERROR: string;
    RATE_LIMIT_ERROR: string;
    NOT_FOUND_ERROR: string;
    UNAUTHORIZED_ERROR: string;
    DATABASE_ERROR: string;
    NETWORK_ERROR: string;
};
export declare const createValidationError: (message: string, details?: any) => AppError;
export declare const createFileUploadError: (message: string, details?: any) => AppError;
export declare const createOCRError: (message: string, details?: any) => AppError;
export declare const createImageGenerationError: (message: string, details?: any) => AppError;
export declare const createExternalServiceError: (message: string, details?: any) => AppError;
export declare const createRateLimitError: (message: string, retryAfter?: number) => AppError;
export declare const createNotFoundError: (message?: string) => AppError;
export declare const createUnauthorizedError: (message?: string) => AppError;
export declare const createDatabaseError: (message: string, details?: any) => AppError;
export declare const createNetworkError: (message: string, details?: any) => AppError;
export declare const globalErrorHandler: (error: Error | AppError, req: Request, res: Response, _next: NextFunction) => void;
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
export declare const handleUnhandledRejection: () => void;
export declare const handleUncaughtException: () => void;
//# sourceMappingURL=errorHandler.d.ts.map