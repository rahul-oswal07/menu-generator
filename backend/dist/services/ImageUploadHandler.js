"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageUploadHandler = void 0;
const fileValidation_1 = require("../utils/fileValidation");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
class ImageUploadHandler {
    constructor(uploadsDir = 'uploads') {
        this.uploadsDir = path_1.default.resolve(uploadsDir);
        this.ensureUploadsDirectory();
    }
    validateFile(file) {
        return (0, fileValidation_1.validateUploadedFile)(file);
    }
    async uploadToStorage(file) {
        try {
            const relativePath = path_1.default.relative(process.cwd(), file.path);
            return `/${relativePath.replace(/\\/g, '/')}`;
        }
        catch (error) {
            console.error('Error uploading file to storage:', error);
            throw new Error('Failed to upload file to storage');
        }
    }
    async preprocessImage(imageUrl) {
        try {
            const filePath = this.urlToFilePath(imageUrl);
            if (!fs_1.default.existsSync(filePath)) {
                throw new Error('Image file not found');
            }
            const stats = fs_1.default.statSync(filePath);
            const ext = path_1.default.extname(filePath).toLowerCase();
            const metadata = {
                width: 0,
                height: 0,
                format: this.getFormatFromExtension(ext),
                size: stats.size
            };
            return {
                url: imageUrl,
                metadata
            };
        }
        catch (error) {
            console.error('Error preprocessing image:', error);
            throw new Error('Failed to preprocess image');
        }
    }
    ensureUploadsDirectory() {
        if (!fs_1.default.existsSync(this.uploadsDir)) {
            fs_1.default.mkdirSync(this.uploadsDir, { recursive: true });
        }
    }
    urlToFilePath(url) {
        const relativePath = url.startsWith('/') ? url.slice(1) : url;
        return path_1.default.join(process.cwd(), relativePath);
    }
    getFormatFromExtension(ext) {
        switch (ext) {
            case '.jpg':
            case '.jpeg':
                return 'jpeg';
            case '.png':
                return 'png';
            case '.webp':
                return 'webp';
            default:
                return 'unknown';
        }
    }
    static generateSessionId() {
        return (0, uuid_1.v4)();
    }
    static createSessionDirectory(sessionId, baseDir = 'uploads') {
        const sessionDir = path_1.default.join(baseDir, sessionId, 'original');
        fs_1.default.mkdirSync(sessionDir, { recursive: true });
        return sessionDir;
    }
}
exports.ImageUploadHandler = ImageUploadHandler;
//# sourceMappingURL=ImageUploadHandler.js.map