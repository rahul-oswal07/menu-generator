"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const errorHandler_1 = require("../middleware/errorHandler");
const ErrorReportingService_1 = __importDefault(require("../services/ErrorReportingService"));
const uuid_1 = require("uuid");
const router = express_1.default.Router();
router.post('/client', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { errors } = req.body;
    if (!Array.isArray(errors)) {
        return res.status(400).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Errors must be an array'
        });
    }
    for (const errorData of errors) {
        const errorReport = {
            id: (0, uuid_1.v4)(),
            timestamp: new Date(errorData.timestamp),
            level: 'error',
            service: 'frontend',
            errorCode: 'CLIENT_ERROR',
            message: errorData.message,
            context: {
                stack: errorData.stack,
                url: errorData.url,
                userAgent: errorData.userAgent,
                ...errorData.context
            },
            userId: errorData.userId,
            sessionId: errorData.sessionId
        };
        await ErrorReportingService_1.default.reportError(errorReport);
    }
    return res.json({
        success: true,
        message: `Processed ${errors.length} error reports`
    });
}));
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { message, errorCode, level = 'error', service = 'backend', context, userId, sessionId } = req.body;
    const errorReport = {
        id: (0, uuid_1.v4)(),
        timestamp: new Date(),
        level,
        service,
        errorCode,
        message,
        context,
        userId,
        sessionId
    };
    await ErrorReportingService_1.default.reportError(errorReport);
    res.json({
        success: true,
        message: 'Error report processed'
    });
}));
router.get('/stats', (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    const stats = ErrorReportingService_1.default.getErrorStats();
    res.json({
        success: true,
        data: stats
    });
}));
router.get('/health', (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    res.json({
        success: true,
        service: 'error-reporting',
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
}));
exports.default = router;
//# sourceMappingURL=errors.js.map