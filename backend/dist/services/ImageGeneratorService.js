"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageGeneratorService = void 0;
const axios_1 = __importDefault(require("axios"));
class ImageGeneratorService {
    constructor(config) {
        this.config = {
            model: 'dall-e-3',
            size: '512x512',
            quality: 'standard',
            maxRetries: 3,
            retryDelay: 1000,
            ...config
        };
        this.placeholderImageUrl = '/assets/placeholder-dish.jpg';
    }
    async generateDishImage(menuItem) {
        try {
            const prompt = this.generatePrompt(menuItem);
            const imageUrl = await this.callImageGenerationAPI(prompt);
            return {
                url: imageUrl,
                menuItemId: menuItem.id,
                status: 'success'
            };
        }
        catch (error) {
            console.error(`Image generation failed for item ${menuItem.id}:`, error);
            return {
                url: this.placeholderImageUrl,
                menuItemId: menuItem.id,
                status: 'failed',
                errorMessage: this.getErrorMessage(error)
            };
        }
    }
    async batchGenerate(items) {
        const results = [];
        for (const item of items) {
            const result = await this.generateDishImage(item);
            results.push(result);
            if (results.length < items.length) {
                await this.delay(this.config.retryDelay);
            }
        }
        return results;
    }
    generatePrompt(menuItem) {
        const { name, description, category } = menuItem;
        let prompt = `A professional food photography shot of ${name}`;
        if (description && description.trim()) {
            const cleanDescription = description
                .replace(/[^\w\s,.-]/g, '')
                .substring(0, 200)
                .trim();
            if (cleanDescription) {
                prompt += `, ${cleanDescription}`;
            }
        }
        if (category) {
            prompt += `, ${category} cuisine`;
        }
        prompt += ', beautifully plated, restaurant quality, well-lit, appetizing, high resolution';
        return prompt;
    }
    async callImageGenerationAPI(prompt) {
        let lastError;
        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                const response = await axios_1.default.post('https://api.openai.com/v1/images/generations', {
                    model: this.config.model,
                    prompt: prompt,
                    n: 1,
                    size: this.config.size,
                    quality: this.config.quality,
                    response_format: 'url'
                }, {
                    headers: {
                        'Authorization': `Bearer ${this.config.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                });
                const responseData = response.data;
                if (responseData && responseData.data && Array.isArray(responseData.data) && responseData.data.length > 0 && responseData.data[0] && responseData.data[0].url) {
                    return responseData.data[0].url;
                }
                else {
                    const error = new Error('Invalid response format from image generation API');
                    error.isInvalidResponse = true;
                    throw error;
                }
            }
            catch (error) {
                lastError = error;
                if (this.isNonRetryableError(error)) {
                    break;
                }
                if (attempt < this.config.maxRetries) {
                    await this.delay(this.config.retryDelay * Math.pow(2, attempt - 1));
                }
            }
        }
        throw lastError;
    }
    isNonRetryableError(error) {
        if (error.response) {
            const status = error.response.status;
            return status !== undefined && status >= 400 && status < 500 && status !== 429;
        }
        return false;
    }
    getErrorMessage(error) {
        if (error.isInvalidResponse) {
            return 'Invalid response format from image generation API';
        }
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;
            switch (status) {
                case 400:
                    return 'Invalid image generation request. The dish description may contain unsupported content.';
                case 401:
                    return 'Authentication failed. Please check API configuration.';
                case 429:
                    return 'Rate limit exceeded. Please try again later.';
                case 500:
                case 502:
                case 503:
                    return 'Image generation service is temporarily unavailable. Please try again later.';
                default:
                    if (data && data.error && data.error.message) {
                        return `Image generation failed: ${data.error.message}`;
                    }
                    return 'Image generation failed due to an unexpected error.';
            }
        }
        if (error.code === 'ECONNABORTED') {
            return 'Image generation timed out. Please try again.';
        }
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return 'Unable to connect to image generation service. Please check your internet connection.';
        }
        return 'Image generation failed due to an unexpected error.';
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    setPlaceholderImageUrl(url) {
        this.placeholderImageUrl = url;
    }
    getPlaceholderImageUrl() {
        return this.placeholderImageUrl;
    }
    static validateConfig(config) {
        if (!config.apiKey || config.apiKey.trim() === '') {
            throw new Error('API key is required for image generation');
        }
        if (config.size && !['256x256', '512x512', '1024x1024'].includes(config.size)) {
            throw new Error('Invalid image size. Must be 256x256, 512x512, or 1024x1024');
        }
        if (config.quality && !['standard', 'hd'].includes(config.quality)) {
            throw new Error('Invalid image quality. Must be standard or hd');
        }
        if (config.maxRetries && (config.maxRetries < 1 || config.maxRetries > 10)) {
            throw new Error('Max retries must be between 1 and 10');
        }
    }
}
exports.ImageGeneratorService = ImageGeneratorService;
//# sourceMappingURL=ImageGeneratorService.js.map