
import { Request, Response, Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { sessionRepositoryInstance } from '../menuItemRepositoryInstance';
import { handleUploadError, upload, validateFileUpload } from '../middleware/upload';
import { ApiResponse, ProcessingStatus, UploadResponse } from '../types';

const router = Router();

// Singleton session repository for in-memory session management
const sessionRepo = sessionRepositoryInstance;

/**
 * @swagger
 * /api/upload:
 *   post:
 *     tags: [Upload]
 *     summary: Upload a menu image for processing
 *     description: Upload a menu image file to be processed by OCR and AI image generation
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               menuImage:
 *                 type: string
 *                 format: binary
 *                 description: Menu image file (JPEG, PNG, or WEBP, max 10MB)
 *               sessionId:
 *                 type: string
 *                 description: Optional session ID (will be generated if not provided)
 *             required:
 *               - menuImage
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UploadResponse'
 *             example:
 *               success: true
 *               data:
 *                 sessionId: "session_1234567890_abc123"
 *                 imageUrl: "/uploads/session_1234567890_abc123/original/menu.jpg"
 *               message: "File uploaded successfully"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       413:
 *         description: File too large
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error: 'FILE_TOO_LARGE'
 *               message: 'File size exceeds 10MB limit'
 *       415:
 *         description: Unsupported file type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error: 'INVALID_FILE_TYPE'
 *               message: 'Only JPEG, PNG, and WEBP files are supported'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// POST /api/upload - Upload menu image

router.post(
  '/upload',
  upload.single('menuImage'),
  handleUploadError,
  validateFileUpload,
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'no_file',
          message: 'No file was uploaded.'
        } as ApiResponse);
      }


      // Always use a single sessionId (if array, use first value)
      let sessionId = req.body.sessionId;
      if (Array.isArray(sessionId)) {
        sessionId = sessionId[0];
      }
      if (!sessionId) {
        sessionId = uuidv4();
      }
      const sessionDirName = `session_${sessionId}`;
      const imageUrl = `/uploads/${sessionDirName}/original/${req.file.filename}`;

      // Create session in repository
      await sessionRepo.create({
        id: sessionId,
        originalImageUrl: imageUrl,
        status: 'uploading' as ProcessingStatus
      });

      // Log successful upload
      console.log(`File uploaded successfully: ${req.file.filename}, Session: ${sessionId}`);

      // Return success response
      const response: ApiResponse<UploadResponse> = {
        success: true,
        data: {
          sessionId,
          imageUrl
        },
        message: 'File uploaded successfully'
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Upload endpoint error:', error);

      return res.status(500).json({
        success: false,
        error: 'server_error',
        message: 'An unexpected error occurred during file upload.'
      } as ApiResponse);
    }
  }
);

/**
 * @swagger
 * /api/upload/{sessionId}/status:
 *   get:
 *     tags: [Upload]
 *     summary: Check upload status
 *     description: Get the status of a file upload for a specific session
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session identifier
 *         example: "session_1234567890_abc123"
 *     responses:
 *       200:
 *         description: Upload status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         sessionId:
 *                           type: string
 *                         status:
 *                           type: string
 *                           enum: [uploaded]
 *                         message:
 *                           type: string
 *             example:
 *               success: true
 *               data:
 *                 sessionId: "session_1234567890_abc123"
 *                 status: "uploaded"
 *                 message: "File upload completed"
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// GET /api/upload/:sessionId/status - Check upload status (placeholder for future use)

router.get('/upload/:sessionId/status', async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = await sessionRepo.findById(sessionId);
  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'not_found',
      message: 'Session not found'
    } as ApiResponse);
  }
  return res.json({
    success: true,
    data: {
      sessionId: session.id,
      status: session.status,
      message: `Session status: ${session.status}`
    }
  } as ApiResponse);
});

export default router;