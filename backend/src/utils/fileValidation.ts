import { ValidationResult } from '../types';

// Supported image formats
export const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];
export const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// File size limit: 10MB in bytes
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validates if the uploaded file is a supported image format
 */
export function validateFileFormat(file: Express.Multer.File): ValidationResult {
  if (!file) {
    return {
      isValid: false,
      errorMessage: 'No file provided'
    };
  }

  // Check MIME type
  if (!SUPPORTED_FORMATS.includes(file.mimetype)) {
    return {
      isValid: false,
      errorMessage: `Unsupported file format. Please upload a JPEG, PNG, or WEBP image. Received: ${file.mimetype}`
    };
  }

  // Check file extension as additional validation
  const fileExtension = getFileExtension(file.originalname);
  if (!SUPPORTED_EXTENSIONS.includes(fileExtension.toLowerCase())) {
    return {
      isValid: false,
      errorMessage: `Unsupported file extension. Please use .jpg, .jpeg, .png, or .webp files. Received: ${fileExtension}`
    };
  }

  return {
    isValid: true
  };
}

/**
 * Validates if the file size is within the allowed limit
 */
export function validateFileSize(file: Express.Multer.File): ValidationResult {
  if (!file) {
    return {
      isValid: false,
      errorMessage: 'No file provided'
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
    
    return {
      isValid: false,
      errorMessage: `File size too large. Maximum allowed size is ${maxSizeMB}MB. Your file is ${fileSizeMB}MB.`
    };
  }

  return {
    isValid: true
  };
}

/**
 * Comprehensive file validation combining format and size checks
 */
export function validateUploadedFile(file: Express.Multer.File): ValidationResult {
  // Check if file exists
  if (!file) {
    return {
      isValid: false,
      errorMessage: 'No file was uploaded. Please select an image file to upload.'
    };
  }

  // Validate file format
  const formatValidation = validateFileFormat(file);
  if (!formatValidation.isValid) {
    return formatValidation;
  }

  // Validate file size
  const sizeValidation = validateFileSize(file);
  if (!sizeValidation.isValid) {
    return sizeValidation;
  }

  return {
    isValid: true
  };
}

/**
 * Generates user-friendly error messages for common validation failures
 */
export function generateValidationErrorMessage(error: string): string {
  const errorMessages: Record<string, string> = {
    'no_file': 'Please select an image file to upload.',
    'invalid_format': 'Please upload a valid image file (JPEG, PNG, or WEBP format).',
    'file_too_large': 'The selected file is too large. Please choose an image under 10MB.',
    'corrupted_file': 'The uploaded file appears to be corrupted. Please try uploading a different image.',
    'network_error': 'Upload failed due to a network error. Please check your connection and try again.',
    'server_error': 'Upload failed due to a server error. Please try again in a few moments.'
  };

  return errorMessages[error] || 'An unexpected error occurred during file upload. Please try again.';
}

/**
 * Helper function to extract file extension from filename
 */
function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
}

/**
 * Checks if a file appears to be a valid image based on basic characteristics
 */
export function isValidImageFile(file: Express.Multer.File): boolean {
  // Basic checks for image file characteristics
  if (!file || file.size === 0) {
    return false;
  }

  // Check if file has image MIME type
  if (!file.mimetype.startsWith('image/')) {
    return false;
  }

  // Check for minimum file size (very small files are likely not valid images)
  const MIN_IMAGE_SIZE = 100; // 100 bytes minimum
  if (file.size < MIN_IMAGE_SIZE) {
    return false;
  }

  return true;
}

/**
 * Formats file size for display to users
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}