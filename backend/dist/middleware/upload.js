"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUploadError = exports.validateFileUpload = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const uuid_1 = require("uuid");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const fileValidation_1 = require("../utils/fileValidation");
const uploadsDir = path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (req, _file, cb) => {
        const sessionId = req.body.sessionId || (0, uuid_1.v4)();
        const sessionDir = path_1.default.join(uploadsDir, sessionId, 'original');
        fs_1.default.mkdirSync(sessionDir, { recursive: true });
        cb(null, sessionDir);
    },
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        const filename = `menu-image-${Date.now()}${ext}`;
        cb(null, filename);
    }
});
exports.upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1
    },
    fileFilter: (_req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and WEBP images are allowed.'));
        }
    }
});
const validateFileUpload = (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'no_file',
                message: 'No file was uploaded. Please select an image file.',
            });
        }
        const validation = (0, fileValidation_1.validateUploadedFile)(req.file);
        if (!validation.isValid) {
            if (req.file.path && fs_1.default.existsSync(req.file.path)) {
                fs_1.default.unlinkSync(req.file.path);
            }
            return res.status(400).json({
                success: false,
                error: 'validation_failed',
                message: validation.errorMessage,
            });
        }
        return next();
    }
    catch (error) {
        console.error('File validation error:', error);
        if (req.file?.path && fs_1.default.existsSync(req.file.path)) {
            fs_1.default.unlinkSync(req.file.path);
        }
        return res.status(500).json({
            success: false,
            error: 'server_error',
            message: 'An error occurred while validating the uploaded file.',
        });
    }
};
exports.validateFileUpload = validateFileUpload;
const handleUploadError = (error, _req, res, next) => {
    if (error instanceof multer_1.default.MulterError) {
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
    return next(error);
};
exports.handleUploadError = handleUploadError;
//# sourceMappingURL=upload.js.map