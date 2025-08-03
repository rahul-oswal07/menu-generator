import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// Custom error class for application errors
export class AppError extends Error {
  public statusCode: number;
  public errorCode: string;
  public isOperational: boolean;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.details = details;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Predefined error types
export const ErrorTypes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
  OCR_ERROR: 'OCR_ERROR',
  IMAGE_GENERATION_ERROR: 'IMAGE_GENERATION_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  UNAUTHORIZED_ERROR: 'UNAUTHORIZED_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR'
};

// Error factory functions
export const createValidationError = (message: string, details?: any) =>
  new AppError(message, 400, ErrorTypes.VALIDATION_ERROR, true, details);

export const createFileUploadError = (message: string, details?: any) =>
  new AppError(message, 400, ErrorTypes.FILE_UPLOAD_ERROR, true, details);

export const createOCRError = (message: string, details?: any) =>
  new AppError(message, 422, ErrorTypes.OCR_ERROR, true, details);

export const createImageGenerationError = (message: string, details?: any) =>
  new AppError(message, 422, ErrorTypes.IMAGE_GENERATION_ERROR, true, details);

export const createExternalServiceError = (message: string, details?: any) =>
  new AppError(message, 503, ErrorTypes.EXTERNAL_SERVICE_ERROR, true, details);

export const createRateLimitError = (message: string, retryAfter?: number) =>
  new AppError(message, 429, ErrorTypes.RATE_LIMIT_ERROR, true, { retryAfter });

export const createNotFoundError = (message: string = 'Resource not found') =>
  new AppError(message, 404, ErrorTypes.NOT_FOUND_ERROR, true);

export const createUnauthorizedError = (message: string = 'Unauthorized access') =>
  new AppError(message, 401, ErrorTypes.UNAUTHORIZED_ERROR, true);

export const createDatabaseError = (message: string, details?: any) =>
  new AppError(message, 500, ErrorTypes.DATABASE_ERROR, true, details);

export const createNetworkError = (message: string, details?: any) =>
  new AppError(message, 503, ErrorTypes.NETWORK_ERROR, true, details);

// Global error handler middleware
export const globalErrorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  let appError: AppError;

  // Convert generic errors to AppError
  if (error instanceof AppError) {
    appError = error;
  } else {
    // Handle specific error types
    if (error.name === 'ValidationError') {
      appError = createValidationError('Validation failed', error.message);
    } else if (error.name === 'CastError') {
      appError = createValidationError('Invalid data format');
    } else if (error.name === 'MulterError') {
      appError = createFileUploadError(`File upload error: ${error.message}`);
    } else if (error.message?.includes('ECONNREFUSED')) {
      appError = createNetworkError('External service unavailable');
    } else if (error.message?.includes('timeout')) {
      appError = createExternalServiceError('Request timeout');
    } else {
      // Unknown error
      appError = new AppError(
        'An unexpected error occurred',
        500,
        'INTERNAL_ERROR',
        false
      );
    }
  }

  // Log error details
  const errorContext = {
    errorCode: appError.errorCode,
    statusCode: appError.statusCode,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    sessionId: req.headers['x-session-id'],
    details: appError.details,
    stack: appError.stack
  };

  if (appError.statusCode >= 500) {
    logger.error('Server error occurred', errorContext);
  } else {
    logger.warn('Client error occurred', errorContext);
  }

  // Send error response
  const errorResponse: any = {
    success: false,
    error: appError.errorCode,
    message: appError.message
  };

  // Add additional details for client errors
  if (appError.statusCode < 500 && appError.details) {
    errorResponse.details = appError.details;
  }

  // Add retry information for rate limit errors
  if (appError.errorCode === ErrorTypes.RATE_LIMIT_ERROR && appError.details?.retryAfter) {
    res.set('Retry-After', appError.details.retryAfter.toString());
    errorResponse.retryAfter = appError.details.retryAfter;
  }

  // Don't leak error details in production for server errors
  if (process.env.NODE_ENV === 'production' && appError.statusCode >= 500) {
    errorResponse.message = 'An internal server error occurred';
    delete errorResponse.details;
  }

  res.status(appError.statusCode).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Unhandled rejection handler
export const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Promise Rejection', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise.toString()
    });
    
    // Graceful shutdown
    process.exit(1);
  });
};

// Uncaught exception handler
export const handleUncaughtException = () => {
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', {
      message: error.message,
      stack: error.stack
    });
    
    // Graceful shutdown
    process.exit(1);
  });
};