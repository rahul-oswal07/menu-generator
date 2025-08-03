"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageOptimizationMiddleware = void 0;
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const imageOptimization_1 = require("../utils/imageOptimization");
const imageOptimizationMiddleware = async (req, res, next) => {
    try {
        const { quality = 'medium', format, width, height } = req.query;
        const requestedPath = req.path;
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
        const fileExtension = path_1.default.extname(requestedPath).toLowerCase();
        if (!imageExtensions.includes(fileExtension)) {
            return next();
        }
        const uploadsDir = path_1.default.join(process.cwd(), 'uploads');
        const originalFilePath = path_1.default.join(uploadsDir, requestedPath.replace('/uploads/', ''));
        try {
            await promises_1.default.access(originalFilePath);
        }
        catch {
            return res.status(404).json({
                success: false,
                error: 'file_not_found',
                message: 'Image file not found'
            });
        }
        const parsedPath = path_1.default.parse(originalFilePath);
        const optimizedDir = path_1.default.join(parsedPath.dir, 'optimized');
        const optimizedFilename = `${parsedPath.name}-${quality}${width ? `-w${width}` : ''}${height ? `-h${height}` : ''}.${format || 'webp'}`;
        const optimizedFilePath = path_1.default.join(optimizedDir, optimizedFilename);
        let shouldGenerate = true;
        try {
            const optimizedStats = await promises_1.default.stat(optimizedFilePath);
            const originalStats = await promises_1.default.stat(originalFilePath);
            shouldGenerate = originalStats.mtime > optimizedStats.mtime;
        }
        catch {
            shouldGenerate = true;
        }
        if (shouldGenerate) {
            await promises_1.default.mkdir(optimizedDir, { recursive: true });
            const optimizationOptions = {
                quality: getQualityValue(quality),
                width: width ? parseInt(width) : undefined,
                height: height ? parseInt(height) : undefined,
                format: (format || 'webp')
            };
            await imageOptimization_1.ImageOptimizer.optimizeImage(originalFilePath, optimizedFilePath, optimizationOptions);
        }
        const maxAge = 30 * 24 * 60 * 60;
        res.set({
            'Cache-Control': `public, max-age=${maxAge}, immutable`,
            'ETag': `"${path_1.default.basename(optimizedFilePath)}"`,
            'Vary': 'Accept-Encoding',
            'Content-Type': getMimeType(format || 'webp')
        });
        const clientETag = req.headers['if-none-match'];
        if (clientETag === `"${path_1.default.basename(optimizedFilePath)}"`) {
            return res.status(304).end();
        }
        res.sendFile(optimizedFilePath);
    }
    catch (error) {
        console.error('Image optimization middleware error:', error);
        next();
    }
};
exports.imageOptimizationMiddleware = imageOptimizationMiddleware;
function getQualityValue(quality) {
    switch (quality) {
        case 'low': return 40;
        case 'medium': return 70;
        case 'high': return 90;
        default: return 70;
    }
}
function getMimeType(format) {
    switch (format) {
        case 'jpeg': return 'image/jpeg';
        case 'png': return 'image/png';
        case 'webp': return 'image/webp';
        default: return 'image/webp';
    }
}
exports.default = exports.imageOptimizationMiddleware;
//# sourceMappingURL=imageOptimization.js.map