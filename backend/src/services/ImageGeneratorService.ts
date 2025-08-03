import axios from 'axios';
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

export class ImageGeneratorService implements ImageGenerator {
  private config: Required<ImageGenerationConfig>;
  private placeholderImageUrl: string;

  constructor(config: ImageGenerationConfig) {
    this.config = {
      model: 'dall-e-3',
      size: '512x512',
      quality: 'standard',
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };
    
    // Default placeholder image URL (could be a local asset or generic food image)
    this.placeholderImageUrl = '/assets/placeholder-dish.jpg';
  }

  /**
   * Generate a single dish image from menu item data
   */
  async generateDishImage(menuItem: MenuItem): Promise<GeneratedImage> {
    try {
      const prompt = this.generatePrompt(menuItem);
      const imageUrl = await this.callImageGenerationAPI(prompt);
      
      return {
        url: imageUrl,
        menuItemId: menuItem.id,
        status: 'success'
      };
    } catch (error) {
      console.error(`Image generation failed for item ${menuItem.id}:`, error);
      
      return {
        url: this.placeholderImageUrl,
        menuItemId: menuItem.id,
        status: 'failed',
        errorMessage: this.getErrorMessage(error)
      };
    }
  }

  /**
   * Generate images for multiple menu items in batch
   */
  async batchGenerate(items: MenuItem[]): Promise<GeneratedImage[]> {
    const results: GeneratedImage[] = [];
    
    // Process items sequentially to avoid rate limiting
    for (const item of items) {
      const result = await this.generateDishImage(item);
      results.push(result);
      
      // Add delay between requests to respect rate limits
      if (results.length < items.length) {
        await this.delay(this.config.retryDelay);
      }
    }
    
    return results;
  }

  /**
   * Generate optimized prompt for dish image generation
   */
  private generatePrompt(menuItem: MenuItem): string {
    const { name, description, category } = menuItem;
    
    // Base prompt with food photography style
    let prompt = `A professional food photography shot of ${name}`;
    
    // Add description details if available
    if (description && description.trim()) {
      // Clean and limit description length
      const cleanDescription = description
        .replace(/[^\w\s,.-]/g, '') // Remove special characters
        .substring(0, 200) // Limit length
        .trim();
      
      if (cleanDescription) {
        prompt += `, ${cleanDescription}`;
      }
    }
    
    // Add category context if available
    if (category) {
      prompt += `, ${category} cuisine`;
    }
    
    // Add photography style instructions
    prompt += ', beautifully plated, restaurant quality, well-lit, appetizing, high resolution';
    
    return prompt;
  }

  /**
   * Call the external image generation API with retry logic
   */
  private async callImageGenerationAPI(prompt: string): Promise<string> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await axios.post<{
          data: Array<{ url: string }>;
        }>(
          'https://api.openai.com/v1/images/generations',
          {
            model: this.config.model,
            prompt: prompt,
            n: 1,
            size: this.config.size,
            quality: this.config.quality,
            response_format: 'url'
          },
          {
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000 // 30 second timeout
          }
        );

        const responseData = response.data;
        if (responseData && responseData.data && Array.isArray(responseData.data) && responseData.data.length > 0 && responseData.data[0] && responseData.data[0].url) {
          return responseData.data[0].url;
        } else {
          const error = new Error('Invalid response format from image generation API');
          (error as any).isInvalidResponse = true;
          throw error;
        }
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          break;
        }
        
        // Wait before retrying (exponential backoff)
        if (attempt < this.config.maxRetries) {
          await this.delay(this.config.retryDelay * Math.pow(2, attempt - 1));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Check if error should not be retried
   */
  private isNonRetryableError(error: any): boolean {
    if (error.response) {
      const status = error.response.status;
      // Don't retry on client errors (4xx) except rate limiting (429)
      return status !== undefined && status >= 400 && status < 500 && status !== 429;
    }
    return false;
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: any): string {
    // Handle invalid response format error
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

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Set custom placeholder image URL
   */
  setPlaceholderImageUrl(url: string): void {
    this.placeholderImageUrl = url;
  }

  /**
   * Get current placeholder image URL
   */
  getPlaceholderImageUrl(): string {
    return this.placeholderImageUrl;
  }

  /**
   * Validate configuration
   */
  static validateConfig(config: ImageGenerationConfig): void {
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