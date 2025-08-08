import { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { validateUploadedFile } from '../utils/fileValidation';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = 
multer.diskStorage({
  destination: (req, _file, cb) => {
    // Generate or reuse sessionId ONCE per request and store on req object
    if (!req.body.sessionId) {
      req.body.sessionId = uuidv4();
    }
    const sessionId = req.body.sessionId;
    const sessionDir = path.join(uploadsDir, `session_${sessionId}`, 'original');
    // Ensure session directory exists
    fs.mkdirSync(sessionDir, { recursive: true });
    cb(null, sessionDir);
  },
  filename: (_req, file, cb) => {
    // Generate unique filename while preserving extension
    const ext = path.extname(file.originalname);
    const filename = `menu-image-${Date.now()}${ext}`;
    cb(null, filename);
  }
});

// Configure multer with file size limits
export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only allow one file at a time
  },
  fileFilter: (_req, file, cb) => {
    // Basic file type check (more validation happens in middleware)
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WEBP images are allowed.'));
    }
  }
});

// Validation middleware that runs after multer
export const validateFileUpload = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'no_file',
        message: 'No file was uploaded. Please select an image file.',
      });
    }

    const validation = validateUploadedFile(req.file);

    if (!validation.isValid) {
      // Clean up the uploaded file
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(400).json({
        success: false,
        error: 'validation_failed',
        message: validation.errorMessage,
      });
    }

    // Proceed to next middleware
    return next();
  } catch (error) {
    console.error('File validation error:', error);

    // Clean up file if it exists
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'An error occurred while validating the uploaded file.',
    });
  }
};

// Error handling middleware for multer errors
export const handleUploadError = (error: any, _req: Request, res: Response, next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(413).json({
          success: false,
          error: 'file_too_large',
          message: 'File size too large. Maximum allowed size is 10MB.'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          error: 'too_many_files',
          message: 'Too many files. Please upload only one image at a time.'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: 'unexpected_field',
          message: 'Unexpected file field. Please use the correct upload field name.'
        });
      default:
        return res.status(400).json({
          success: false,
          error: 'upload_error',
          message: 'An error occurred during file upload.'
        });
    }
  }

  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      error: 'invalid_format',
      message: error.message
    });
  }

  // Pass other errors to the next error handler
  return next(error);
};