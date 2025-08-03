import sharp from 'sharp';
export interface ImageOptimizationOptions {
    quality?: number;
    width?: number;
    height?: number;
    format?: 'jpeg' | 'png' | 'webp';
    progressive?: boolean;
}
export interface OptimizedImageResult {
    path: string;
    size: number;
    width: number;
    height: number;
    format: string;
}
export declare class ImageOptimizer {
    private static readonly QUALITY_PRESETS;
    static optimizeImage(inputPath: string, outputPath: string, options?: ImageOptimizationOptions): Promise<OptimizedImageResult>;
    static generateMultipleQualities(inputPath: string, outputDir: string, filename: string): Promise<Record<string, OptimizedImageResult>>;
    static createPlaceholder(inputPath: string, outputPath: string): Promise<OptimizedImageResult>;
    static getImageMetadata(imagePath: string): Promise<{
        width: number;
        height: number;
        format: keyof sharp.FormatEnum;
        size: number;
        hasAlpha: boolean;
        density: number;
    }>;
    static shouldOptimize(imagePath: string): Promise<boolean>;
}
export default ImageOptimizer;
//# sourceMappingURL=imageOptimization.d.ts.map