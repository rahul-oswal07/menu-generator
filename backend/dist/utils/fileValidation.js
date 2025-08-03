"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_FILE_SIZE = exports.SUPPORTED_EXTENSIONS = exports.SUPPORTED_FORMATS = void 0;
exports.validateFileFormat = validateFileFormat;
exports.validateFileSize = validateFileSize;
exports.validateUploadedFile = validateUploadedFile;
exports.generateValidationErrorMessage = generateValidationErrorMessage;
exports.isValidImageFile = isValidImageFile;
exports.formatFileSize = formatFileSize;
exports.SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];
exports.SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
exports.MAX_FILE_SIZE = 10 * 1024 * 1024;
function validateFileFormat(file) {
    if (!file) {
        return {
            isValid: false,
            errorMessage: 'No file provided'
        };
    }
    if (!exports.SUPPORTED_FORMATS.includes(file.mimetype)) {
        return {
            isValid: false,
            errorMessage: `Unsupported file format. Please upload a JPEG, PNG, or WEBP image. Received: ${file.mimetype}`
        };
    }
    const fileExtension = getFileExtension(file.originalname);
    if (!exports.SUPPORTED_EXTENSIONS.includes(fileExtension.toLowerCase())) {
        return {
            isValid: false,
            errorMessage: `Unsupported file extension. Please use .jpg, .jpeg, .png, or .webp files. Received: ${fileExtension}`
        };
    }
    return {
        isValid: true
    };
}
function validateFileSize(file) {
    if (!file) {
        return {
            isValid: false,
            errorMessage: 'No file provided'
        };
    }
    if (file.size > exports.MAX_FILE_SIZE) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        const maxSizeMB = (exports.MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
        return {
            isValid: false,
            errorMessage: `File size too large. Maximum allowed size is ${maxSizeMB}MB. Your file is ${fileSizeMB}MB.`
        };
    }
    return {
        isValid: true
    };
}
function validateUploadedFile(file) {
    if (!file) {
        return {
            isValid: false,
            errorMessage: 'No file was uploaded. Please select an image file to upload.'
        };
    }
    const formatValidation = validateFileFormat(file);
    if (!formatValidation.isValid) {
        return formatValidation;
    }
    const sizeValidation = validateFileSize(file);
    if (!sizeValidation.isValid) {
        return sizeValidation;
    }
    return {
        isValid: true
    };
}
function generateValidationErrorMessage(error) {
    const errorMessages = {
        'no_file': 'Please select an image file to upload.',
        'invalid_format': 'Please upload a valid image file (JPEG, PNG, or WEBP format).',
        'file_too_large': 'The selected file is too large. Please choose an image under 10MB.',
        'corrupted_file': 'The uploaded file appears to be corrupted. Please try uploading a different image.',
        'network_error': 'Upload failed due to a network error. Please check your connection and try again.',
        'server_error': 'Upload failed due to a server error. Please try again in a few moments.'
    };
    return errorMessages[error] || 'An unexpected error occurred during file upload. Please try again.';
}
function getFileExtension(filename) {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
}
function isValidImageFile(file) {
    if (!file || file.size === 0) {
        return false;
    }
    if (!file.mimetype.startsWith('image/')) {
        return false;
    }
    const MIN_IMAGE_SIZE = 100;
    if (file.size < MIN_IMAGE_SIZE) {
        return false;
    }
    return true;
}
function formatFileSize(bytes) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
//# sourceMappingURL=fileValidation.js.map