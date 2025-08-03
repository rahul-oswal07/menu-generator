import {
  validateFileFormat,
  validateFileSize,
  validateUploadedFile,
  generateValidationErrorMessage,
  isValidImageFile,
  formatFileSize,
  SUPPORTED_FORMATS,
  MAX_FILE_SIZE
} from '../fileValidation';

// Mock file helper function
function createMockFile(
  originalname: string,
  mimetype: string,
  size: number
): Express.Multer.File {
  return {
    originalname,
    mimetype,
    size,
    buffer: Buffer.alloc(size),
    fieldname: 'file',
    encoding: '7bit',
    filename: originalname,
    destination: '',
    path: ''
  } as Express.Multer.File;
}

describe('File Validation Utilities', () => {
  describe('validateFileFormat', () => {
    it('should accept valid JPEG files', () => {
      const file = createMockFile('test.jpg', 'image/jpeg', 1000);
      const result = validateFileFormat(file);
      
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    it('should accept valid PNG files', () => {
      const file = createMockFile('test.png', 'image/png', 1000);
      const result = validateFileFormat(file);
      
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    it('should accept valid WEBP files', () => {
      const file = createMockFile('test.webp', 'image/webp', 1000);
      const result = validateFileFormat(file);
      
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    it('should reject unsupported file formats', () => {
      const file = createMockFile('test.gif', 'image/gif', 1000);
      const result = validateFileFormat(file);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Unsupported file format');
      expect(result.errorMessage).toContain('image/gif');
    });

    it('should reject non-image files', () => {
      const file = createMockFile('test.pdf', 'application/pdf', 1000);
      const result = validateFileFormat(file);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Unsupported file format');
    });

    it('should reject files with mismatched extension and MIME type', () => {
      const file = createMockFile('test.txt', 'image/jpeg', 1000);
      const result = validateFileFormat(file);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Unsupported file extension');
    });

    it('should handle null file input', () => {
      const result = validateFileFormat(null as any);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('No file provided');
    });
  });

  describe('validateFileSize', () => {
    it('should accept files under the size limit', () => {
      const file = createMockFile('test.jpg', 'image/jpeg', 5 * 1024 * 1024); // 5MB
      const result = validateFileSize(file);
      
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    it('should accept files at the exact size limit', () => {
      const file = createMockFile('test.jpg', 'image/jpeg', MAX_FILE_SIZE);
      const result = validateFileSize(file);
      
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    it('should reject files over the size limit', () => {
      const file = createMockFile('test.jpg', 'image/jpeg', MAX_FILE_SIZE + 1);
      const result = validateFileSize(file);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('File size too large');
      expect(result.errorMessage).toContain('10MB');
    });

    it('should handle null file input', () => {
      const result = validateFileSize(null as any);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('No file provided');
    });
  });

  describe('validateUploadedFile', () => {
    it('should accept valid files', () => {
      const file = createMockFile('test.jpg', 'image/jpeg', 5 * 1024 * 1024);
      const result = validateUploadedFile(file);
      
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    it('should reject files with invalid format', () => {
      const file = createMockFile('test.gif', 'image/gif', 1000);
      const result = validateUploadedFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Unsupported file format');
    });

    it('should reject files that are too large', () => {
      const file = createMockFile('test.jpg', 'image/jpeg', MAX_FILE_SIZE + 1);
      const result = validateUploadedFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('File size too large');
    });

    it('should handle null file input', () => {
      const result = validateUploadedFile(null as any);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('No file was uploaded');
    });
  });

  describe('generateValidationErrorMessage', () => {
    it('should return appropriate message for known error codes', () => {
      expect(generateValidationErrorMessage('no_file')).toContain('Please select an image file');
      expect(generateValidationErrorMessage('invalid_format')).toContain('valid image file');
      expect(generateValidationErrorMessage('file_too_large')).toContain('too large');
      expect(generateValidationErrorMessage('network_error')).toContain('network error');
    });

    it('should return default message for unknown error codes', () => {
      const result = generateValidationErrorMessage('unknown_error');
      expect(result).toContain('unexpected error occurred');
    });
  });

  describe('isValidImageFile', () => {
    it('should return true for valid image files', () => {
      const file = createMockFile('test.jpg', 'image/jpeg', 1000);
      expect(isValidImageFile(file)).toBe(true);
    });

    it('should return false for non-image files', () => {
      const file = createMockFile('test.pdf', 'application/pdf', 1000);
      expect(isValidImageFile(file)).toBe(false);
    });

    it('should return false for empty files', () => {
      const file = createMockFile('test.jpg', 'image/jpeg', 0);
      expect(isValidImageFile(file)).toBe(false);
    });

    it('should return false for very small files', () => {
      const file = createMockFile('test.jpg', 'image/jpeg', 50); // Less than 100 bytes
      expect(isValidImageFile(file)).toBe(false);
    });

    it('should handle null file input', () => {
      expect(isValidImageFile(null as any)).toBe(false);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(500)).toBe('500 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(5 * 1024 * 1024)).toBe('5 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });
  });
});