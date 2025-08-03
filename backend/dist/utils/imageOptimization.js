"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageOptimizer = void 0;
const sharp_1 = __importDefault(require("sharp"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
class ImageOptimizer {
    static async optimizeImage(inputPath, outputPath, options = {}) {
        const { quality = 80, width, height, format = 'jpeg', progressive = true } = options;
        try {
            let pipeline = (0, sharp_1.default)(inputPath);
            if (width || height) {
                pipeline = pipeline.resize(width, height, {
                    fit: 'inside',
                    withoutEnlargement: true
                });
            }
            switch (format) {
                case 'jpeg':
                    pipeline = pipeline.jpeg({
                        quality,
                        progressive,
                        mozjpeg: true
                    });
                    break;
                case 'png':
                    pipeline = pipeline.png({
                        quality,
                        progressive,
                        compressionLevel: 9
                    });
                    break;
                case 'webp':
                    pipeline = pipeline.webp({
                        quality,
                        effort: 6
                    });
                    break;
            }
            const outputDir = path_1.default.dirname(outputPath);
            await promises_1.default.mkdir(outputDir, { recursive: true });
            const info = await pipeline.toFile(outputPath);
            const stats = await promises_1.default.stat(outputPath);
            return {
                path: outputPath,
                size: stats.size,
                width: info.width,
                height: info.height,
                format: info.format
            };
        }
        catch (error) {
            throw new Error(`Image optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    static async generateMultipleQualities(inputPath, outputDir, filename) {
        const results = {};
        const baseFilename = path_1.default.parse(filename).name;
        for (const [qualityLevel, preset] of Object.entries(this.QUALITY_PRESETS)) {
            const outputFilename = `${baseFilename}-${qualityLevel}.webp`;
            const outputPath = path_1.default.join(outputDir, outputFilename);
            try {
                results[qualityLevel] = await this.optimizeImage(inputPath, outputPath, {
                    ...preset,
                    format: 'webp'
                });
            }
            catch (error) {
                console.error(`Failed to generate ${qualityLevel} quality version:`, error);
            }
        }
        return results;
    }
    static async createPlaceholder(inputPath, outputPath) {
        return this.optimizeImage(inputPath, outputPath, {
            quality: 20,
            width: 50,
            format: 'jpeg',
            progressive: false
        });
    }
    static async getImageMetadata(imagePath) {
        try {
            const metadata = await (0, sharp_1.default)(imagePath).metadata();
            return {
                width: metadata.width || 0,
                height: metadata.height || 0,
                format: metadata.format || 'unknown',
                size: metadata.size || 0,
                hasAlpha: metadata.hasAlpha || false,
                density: metadata.density || 72
            };
        }
        catch (error) {
            throw new Error(`Failed to get image metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    static async shouldOptimize(imagePath) {
        try {
            const stats = await promises_1.default.stat(imagePath);
            const metadata = await this.getImageMetadata(imagePath);
            const shouldOptimizeSize = stats.size > 500 * 1024;
            const shouldOptimizeDimensions = (metadata.width > 1920) || (metadata.height > 1080);
            const isUnoptimizedFormat = !['webp', 'avif'].includes(metadata.format);
            return shouldOptimizeSize || shouldOptimizeDimensions || isUnoptimizedFormat;
        }
        catch (error) {
            console.error('Error checking if image should be optimized:', error);
            return true;
        }
    }
}
exports.ImageOptimizer = ImageOptimizer;
ImageOptimizer.QUALITY_PRESETS = {
    low: { quality: 40, width: 400 },
    medium: { quality: 70, width: 800 },
    high: { quality: 90, width: 1200 }
};
exports.default = ImageOptimizer;
//# sourceMappingURL=imageOptimization.js.map