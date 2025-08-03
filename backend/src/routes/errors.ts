import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import ErrorReportingService from '../services/ErrorReportingService';

import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * @swagger
 * /api/errors/client:
 *   post:
 *     tags: [Errors]
 *     summary: Report client-side errors
 *     description: Submit client-side error reports for monitoring and debugging
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               errors:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       description: Error message
 *                     stack:
 *                       type: string
 *                       description: Error stack trace
 *                     url:
 *                       type: string
 *                       description: URL where error occurred
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       description: When the error occurred
 *                     userAgent:
 *                       type: string
 *                       description: Browser user agent
 *                     userId:
 *                       type: string
 *                       description: User identifier (optional)
 *                     sessionId:
 *                       type: string
 *                       description: Session identifier (optional)
 *                     context:
 *                       type: object
 *                       description: Additional error context
 *             required:
 *               - errors
 *           example:
 *             errors:
 *               - message: "Cannot read property 'length' of undefined"
 *                 stack: "TypeError: Cannot read property 'length' of undefined\\n    at App.tsx:42:15"
 *                 url: "https://example.com/app"
 *                 timestamp: "2023-12-01T12:00:00.000Z"
 *                 userAgent: "Mozilla/5.0..."
 *                 context:
 *                   component: "FileUpload"
 *                   action: "file_validation"
 *     responses:
 *       200:
 *         description: Error reports processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *             example:
 *               success: true
 *               message: "Processed 1 error reports"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Report client-side errors
router.post('/client', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { errors } = req.body;

  if (!Array.isArray(errors)) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Errors must be an array'
    });
  }

  // Process each error report
  for (const errorData of errors) {
    const errorReport = {
      id: uuidv4(),
      timestamp: new Date(errorData.timestamp),
      level: 'error' as const,
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

    await ErrorReportingService.reportError(errorReport);
  }

  return res.json({
    success: true,
    message: `Processed ${errors.length} error reports`
  });
}));

// Report server-side errors (internal use)
router.post('/', asyncHandler(async (req: express.Request, res: express.Response) => {
  const {
    message,
    errorCode,
    level = 'error',
    service = 'backend',
    context,
    userId,
    sessionId
  } = req.body;

  const errorReport = {
    id: uuidv4(),
    timestamp: new Date(),
    level,
    service,
    errorCode,
    message,
    context,
    userId,
    sessionId
  };

  await ErrorReportingService.reportError(errorReport);

  res.json({
    success: true,
    message: 'Error report processed'
  });
}));

// Get error statistics (for monitoring dashboard)
router.get('/stats', asyncHandler(async (_req: express.Request, res: express.Response) => {
  const stats = ErrorReportingService.getErrorStats();
  
  res.json({
    success: true,
    data: stats
  });
}));

// Health check for error reporting service
router.get('/health', asyncHandler(async (_req: express.Request, res: express.Response) => {
  res.json({
    success: true,
    service: 'error-reporting',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
}));

export default router;