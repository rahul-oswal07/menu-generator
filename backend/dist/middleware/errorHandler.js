"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUncaughtException = exports.handleUnhandledRejection = exports.asyncHandler = exports.globalErrorHandler = exports.createNetworkError = exports.createDatabaseError = exports.createUnauthorizedError = exports.createNotFoundError = exports.createRateLimitError = exports.createExternalServiceError = exports.createImageGenerationError = exports.createOCRError = exports.createFileUploadError = exports.createValidationError = exports.ErrorTypes = exports.AppError = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
class AppError extends Error {
    constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR', isOperational = true, details) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = isOperational;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
exports.ErrorTypes = {
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
const createValidationError = (message, details) => new AppError(message, 400, exports.ErrorTypes.VALIDATION_ERROR, true, details);
exports.createValidationError = createValidationError;
const createFileUploadError = (message, details) => new AppError(message, 400, exports.ErrorTypes.FILE_UPLOAD_ERROR, true, details);
exports.createFileUploadError = createFileUploadError;
const createOCRError = (message, details) => new AppError(message, 422, exports.ErrorTypes.OCR_ERROR, true, details);
exports.createOCRError = createOCRError;
const createImageGenerationError = (message, details) => new AppError(message, 422, exports.ErrorTypes.IMAGE_GENERATION_ERROR, true, details);
exports.createImageGenerationError = createImageGenerationError;
const createExternalServiceError = (message, details) => new AppError(message, 503, exports.ErrorTypes.EXTERNAL_SERVICE_ERROR, true, details);
exports.createExternalServiceError = createExternalServiceError;
const createRateLimitError = (message, retryAfter) => new AppError(message, 429, exports.ErrorTypes.RATE_LIMIT_ERROR, true, { retryAfter });
exports.createRateLimitError = createRateLimitError;
const createNotFoundError = (message = 'Resource not found') => new AppError(message, 404, exports.ErrorTypes.NOT_FOUND_ERROR, true);
exports.createNotFoundError = createNotFoundError;
const createUnauthorizedError = (message = 'Unauthorized access') => new AppError(message, 401, exports.ErrorTypes.UNAUTHORIZED_ERROR, true);
exports.createUnauthorizedError = createUnauthorizedError;
const createDatabaseError = (message, details) => new AppError(message, 500, exports.ErrorTypes.DATABASE_ERROR, true, details);
exports.createDatabaseError = createDatabaseError;
const createNetworkError = (message, details) => new AppError(message, 503, exports.ErrorTypes.NETWORK_ERROR, true, details);
exports.createNetworkError = createNetworkError;
const globalErrorHandler = (error, req, res, _next) => {
    let appError;
    if (error instanceof AppError) {
        appError = error;
    }
    else {
        if (error.name === 'ValidationError') {
            appError = (0, exports.createValidationError)('Validation failed', error.message);
        }
        else if (error.name === 'CastError') {
            appError = (0, exports.createValidationError)('Invalid data format');
        }
        else if (error.name === 'MulterError') {
            appError = (0, exports.createFileUploadError)(`File upload error: ${error.message}`);
        }
        else if (error.message?.includes('ECONNREFUSED')) {
            appError = (0, exports.createNetworkError)('External service unavailable');
        }
        else if (error.message?.includes('timeout')) {
            appError = (0, exports.createExternalServiceError)('Request timeout');
        }
        else {
            appError = new AppError('An unexpected error occurred', 500, 'INTERNAL_ERROR', false);
        }
    }
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
        logger_1.default.error('Server error occurred', errorContext);
    }
    else {
        logger_1.default.warn('Client error occurred', errorContext);
    }
    const errorResponse = {
        success: false,
        error: appError.errorCode,
        message: appError.message
    };
    if (appError.statusCode < 500 && appError.details) {
        errorResponse.details = appError.details;
    }
    if (appError.errorCode === exports.ErrorTypes.RATE_LIMIT_ERROR && appError.details?.retryAfter) {
        res.set('Retry-After', appError.details.retryAfter.toString());
        errorResponse.retryAfter = appError.details.retryAfter;
    }
    if (process.env.NODE_ENV === 'production' && appError.statusCode >= 500) {
        errorResponse.message = 'An internal server error occurred';
        delete errorResponse.details;
    }
    res.status(appError.statusCode).json(errorResponse);
};
exports.globalErrorHandler = globalErrorHandler;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
const handleUnhandledRejection = () => {
    process.on('unhandledRejection', (reason, promise) => {
        logger_1.default.error('Unhandled Promise Rejection', {
            reason: reason?.message || reason,
            stack: reason?.stack,
            promise: promise.toString()
        });
        process.exit(1);
    });
};
exports.handleUnhandledRejection = handleUnhandledRejection;
const handleUncaughtException = () => {
    process.on('uncaughtException', (error) => {
        logger_1.default.error('Uncaught Exception', {
            message: error.message,
            stack: error.stack
        });
        process.exit(1);
    });
};
exports.handleUncaughtException = handleUncaughtException;
//# sourceMappingURL=errorHandler.js.map