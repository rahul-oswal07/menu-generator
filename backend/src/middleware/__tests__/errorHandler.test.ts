import { Request, Response, NextFunction } from 'express';
import {
  AppError,
  globalErrorHandler,
  createValidationError,
  createFileUploadError,
  createOCRError,
  createImageGenerationError,
  createExternalServiceError,
  createRateLimitError,
  createNotFoundError,
  createUnauthorizedError,
  createDatabaseError,
  createNetworkError,
  asyncHandler
} from '../errorHandler';

// Mock logger
jest.mock('../../utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
}));

describe('ErrorHandler', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      url: '/test',
      method: 'GET',
      get: jest.fn().mockReturnValue('test-user-agent'),
      ip: '127.0.0.1',
      headers: {}
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
  });

  describe('AppError', () => {
    it('should create an AppError with default values', () => {
      const error = new AppError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.errorCode).toBe('INTERNAL_ERROR');
      expect(error.isOperational).toBe(true);
    });

    it('should create an AppError with custom values', () => {
      const error = new AppError('Custom error', 400, 'CUSTOM_ERROR', false, { detail: 'test' });
      
      expect(error.message).toBe('Custom error');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('CUSTOM_ERROR');
      expect(error.isOperational).toBe(false);
      expect(error.details).toEqual({ detail: 'test' });
    });
  });

  describe('Error factory functions', () => {
    it('should create validation error', () => {
      const error = createValidationError('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should create file upload error', () => {
      const error = createFileUploadError('File too large');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('FILE_UPLOAD_ERROR');
    });

    it('should create OCR error', () => {
      const error = createOCRError('OCR failed');
      expect(error.statusCode).toBe(422);
      expect(error.errorCode).toBe('OCR_ERROR');
    });

    it('should create image generation error', () => {
      const error = createImageGenerationError('Generation failed');
      expect(error.statusCode).toBe(422);
      expect(error.errorCode).toBe('IMAGE_GENERATION_ERROR');
    });

    it('should create external service error', () => {
      const error = createExternalServiceError('Service unavailable');
      expect(error.statusCode).toBe(503);
      expect(error.errorCode).toBe('EXTERNAL_SERVICE_ERROR');
    });

    it('should create rate limit error', () => {
      const error = createRateLimitError('Rate limited', 60);
      expect(error.statusCode).toBe(429);
      expect(error.errorCode).toBe('RATE_LIMIT_ERROR');
      expect(error.details).toEqual({ retryAfter: 60 });
    });

    it('should create not found error', () => {
      const error = createNotFoundError();
      expect(error.statusCode).toBe(404);
      expect(error.errorCode).toBe('NOT_FOUND_ERROR');
    });

    it('should create unauthorized error', () => {
      const error = createUnauthorizedError();
      expect(error.statusCode).toBe(401);
      expect(error.errorCode).toBe('UNAUTHORIZED_ERROR');
    });

    it('should create database error', () => {
      const error = createDatabaseError('DB connection failed');
      expect(error.statusCode).toBe(500);
      expect(error.errorCode).toBe('DATABASE_ERROR');
    });

    it('should create network error', () => {
      const error = createNetworkError('Network timeout');
      expect(error.statusCode).toBe(503);
      expect(error.errorCode).toBe('NETWORK_ERROR');
    });
  });

  describe('globalErrorHandler', () => {
    it('should handle AppError correctly', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR');
      
      globalErrorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'TEST_ERROR',
        message: 'Test error'
      });
    });

    it('should handle generic Error correctly', () => {
      const error = new Error('Generic error');
      
      globalErrorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      });
    });

    it('should handle ValidationError correctly', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      
      globalErrorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: 'Validation failed'
      });
    });

    it('should handle MulterError correctly', () => {
      const error = new Error('File upload failed');
      error.name = 'MulterError';
      
      globalErrorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'FILE_UPLOAD_ERROR',
        message: 'File upload error: File upload failed'
      });
    });

    it('should set Retry-After header for rate limit errors', () => {
      const error = createRateLimitError('Rate limited', 60);
      
      globalErrorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.set).toHaveBeenCalledWith('Retry-After', '60');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'RATE_LIMIT_ERROR',
        message: 'Rate limited',
        details: { retryAfter: 60 },
        retryAfter: 60
      });
    });

    it('should include details for client errors', () => {
      const error = new AppError('Validation failed', 400, 'VALIDATION_ERROR', true, { field: 'email' });
      
      globalErrorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: { field: 'email' }
      });
    });

    it('should not include details for server errors in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const error = new AppError('Server error', 500, 'INTERNAL_ERROR', true, { sensitive: 'data' });
      
      globalErrorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An internal server error occurred'
      });
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('asyncHandler', () => {
    it('should handle successful async function', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = asyncHandler(asyncFn);
      
      await wrappedFn(mockReq as Request, mockRes as Response, mockNext);
      
      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle async function that throws error', async () => {
      const error = new Error('Async error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = asyncHandler(asyncFn);
      
      await wrappedFn(mockReq as Request, mockRes as Response, mockNext);
      
      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});