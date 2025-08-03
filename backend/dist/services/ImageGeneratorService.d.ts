import { ImageGenerator } from '../interfaces/ImageGenerator';
import { MenuItem, GeneratedImage } from '../types';
export interface ImageGenerationConfig {
    apiKey: string;
    model?: string;
    size?: '256x256' | '512x512' | '1024x1024';
    quality?: 'standard' | 'hd';
    maxRetries?: number;
    retryDelay?: number;
}
export declare class ImageGeneratorService implements ImageGenerator {
    private config;
    private placeholderImageUrl;
    constructor(config: ImageGenerationConfig);
    generateDishImage(menuItem: MenuItem): Promise<GeneratedImage>;
    batchGenerate(items: MenuItem[]): Promise<GeneratedImage[]>;
    private generatePrompt;
    private callImageGenerationAPI;
    private isNonRetryableError;
    private getErrorMessage;
    private delay;
    setPlaceholderImageUrl(url: string): void;
    getPlaceholderImageUrl(): string;
    static validateConfig(config: ImageGenerationConfig): void;
}
//# sourceMappingURL=ImageGeneratorService.d.ts.map