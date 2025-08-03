import axios from 'axios';
import { ImageGeneratorService, ImageGenerationConfig } from '../ImageGeneratorService';
import { MenuItem } from '../../types';

// Mock axios
jest.mock('axios', () => ({
  post: jest.fn(),
  isAxiosError: jest.fn()
}));

const mockedAxios = axios as any;

// Helper function to create mock axios response
const createMockResponse = <T>(data: T) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {} as any
});

describe('ImageGeneratorService', () => {
  let service: ImageGeneratorService;
  let mockConfig: ImageGenerationConfig;
  let mockMenuItem: MenuItem;

  beforeEach(() => {
    mockConfig = {
      apiKey: 'test-api-key',
      model: 'dall-e-3',
      size: '512x512',
      quality: 'standard',
      maxRetries: 3,
      retryDelay: 100 // Reduced for testing
    };

    service = new ImageGeneratorService(mockConfig);

    mockMenuItem = {
      id: 'item-1',
      name: 'Margherita Pizza',
      description: 'Classic pizza with tomato sauce, mozzarella, and fresh basil',
      price: '$12.99',
      category: 'Italian'
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const minimalConfig = { apiKey: 'test-key' };
      const serviceWithDefaults = new ImageGeneratorService(minimalConfig);
      
      expect(serviceWithDefaults.getPlaceholderImageUrl()).toBe('/assets/placeholder-dish.jpg');
    });

    it('should use provided configuration values', () => {
      const customConfig: ImageGenerationConfig = {
        apiKey: 'custom-key',
        model: 'dall-e-3',
        size: '1024x1024',
        quality: 'hd',
        maxRetries: 5,
        retryDelay: 2000
      };

      const customService = new ImageGeneratorService(customConfig);
      expect(customService).toBeInstanceOf(ImageGeneratorService);
    });
  });

  describe('generateDishImage', () => {
    it('should successfully generate image for menu item', async () => {
      const mockImageUrl = 'https://example.com/generated-image.jpg';
      const mockResponse = createMockResponse({
        data: [{ url: mockImageUrl }]
      });

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await service.generateDishImage(mockMenuItem);

      expect(result).toEqual({
        url: mockImageUrl,
        menuItemId: 'item-1',
        status: 'success'
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.openai.com/v1/images/generations',
        {
          model: 'dall-e-3',
          prompt: expect.stringContaining('Margherita Pizza'),
          n: 1,
          size: '512x512',
          quality: 'standard',
          response_format: 'url'
        },
        {
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
    });

    it('should return placeholder image on API failure', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('API Error'));

      const result = await service.generateDishImage(mockMenuItem);

      expect(result).toEqual({
        url: '/assets/placeholder-dish.jpg',
        menuItemId: 'item-1',
        status: 'failed',
        errorMessage: 'Image generation failed due to an unexpected error.'
      });
    });

    it('should handle authentication error', async () => {
      const authError = {
        response: {
          status: 401,
          data: { error: { message: 'Invalid API key' } }
        }
      };

      mockedAxios.post.mockRejectedValueOnce(authError);

      const result = await service.generateDishImage(mockMenuItem);

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toBe('Authentication failed. Please check API configuration.');
    });

    it('should retry on retryable errors', async () => {
      const serverError = {
        response: {
          status: 500,
          data: { error: { message: 'Internal server error' } }
        }
      };

      mockedAxios.post
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce(createMockResponse({
          data: [{ url: 'https://example.com/success.jpg' }]
        }));

      const result = await service.generateDishImage(mockMenuItem);

      expect(result.status).toBe('success');
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const badRequestError = {
        response: {
          status: 400,
          data: { error: { message: 'Bad request' } }
        }
      };

      mockedAxios.post.mockRejectedValueOnce(badRequestError);

      const result = await service.generateDishImage(mockMenuItem);

      expect(result.status).toBe('failed');
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('batchGenerate', () => {
    it('should generate images for multiple menu items', async () => {
      const menuItems: MenuItem[] = [
        mockMenuItem,
        {
          id: 'item-2',
          name: 'Caesar Salad',
          description: 'Fresh romaine lettuce with caesar dressing',
          price: '$8.99'
        }
      ];

      const mockResponse = createMockResponse({
        data: [{ url: 'https://example.com/image.jpg' }]
      });

      mockedAxios.post.mockResolvedValue(mockResponse);

      const results = await service.batchGenerate(menuItems);

      expect(results).toHaveLength(2);
      expect(results[0].menuItemId).toBe('item-1');
      expect(results[1].menuItemId).toBe('item-2');
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should handle mixed success and failure results', async () => {
      const menuItems: MenuItem[] = [mockMenuItem, { ...mockMenuItem, id: 'item-2' }];

      mockedAxios.post
        .mockResolvedValueOnce(createMockResponse({
          data: [{ url: 'https://example.com/success.jpg' }]
        }))
        .mockRejectedValueOnce(new Error('API Error'));

      const results = await service.batchGenerate(menuItems);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('success');
      expect(results[1].status).toBe('failed');
    });

    it('should return empty array for empty input', async () => {
      const results = await service.batchGenerate([]);
      expect(results).toEqual([]);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('generatePrompt', () => {
    it('should generate basic prompt with name only', async () => {
      const basicItem: MenuItem = {
        id: 'test',
        name: 'Burger',
        description: '',
        price: '$10'
      };

      // We need to access the private method through the public interface
      mockedAxios.post.mockResolvedValueOnce(createMockResponse({
        data: [{ url: 'test.jpg' }]
      }));

      await service.generateDishImage(basicItem);

      const callArgs = mockedAxios.post.mock.calls[0][1] as any;
      expect(callArgs.prompt).toContain('Burger');
      expect(callArgs.prompt).toContain('professional food photography');
    });

    it('should include description in prompt', async () => {
      mockedAxios.post.mockResolvedValueOnce(createMockResponse({
        data: [{ url: 'test.jpg' }]
      }));

      await service.generateDishImage(mockMenuItem);

      const callArgs = mockedAxios.post.mock.calls[0][1] as any;
      expect(callArgs.prompt).toContain('Margherita Pizza');
      expect(callArgs.prompt).toContain('tomato sauce, mozzarella');
    });

    it('should include category in prompt', async () => {
      mockedAxios.post.mockResolvedValueOnce(createMockResponse({
        data: [{ url: 'test.jpg' }]
      }));

      await service.generateDishImage(mockMenuItem);

      const callArgs = mockedAxios.post.mock.calls[0][1] as any;
      expect(callArgs.prompt).toContain('Italian cuisine');
    });

    it('should clean special characters from description', async () => {
      const itemWithSpecialChars: MenuItem = {
        id: 'test',
        name: 'Test Dish',
        description: 'Description with @#$% special chars!',
        price: '$10'
      };

      mockedAxios.post.mockResolvedValueOnce(createMockResponse({
        data: [{ url: 'test.jpg' }]
      }));

      await service.generateDishImage(itemWithSpecialChars);

      const callArgs = mockedAxios.post.mock.calls[0][1] as any;
      expect(callArgs.prompt).not.toContain('@#$%');
      expect(callArgs.prompt).toContain('Description with  special chars');
    });
  });

  describe('placeholder image management', () => {
    it('should set and get placeholder image URL', () => {
      const newPlaceholderUrl = 'https://example.com/new-placeholder.jpg';
      service.setPlaceholderImageUrl(newPlaceholderUrl);
      
      expect(service.getPlaceholderImageUrl()).toBe(newPlaceholderUrl);
    });
  });

  describe('validateConfig', () => {
    it('should validate valid configuration', () => {
      expect(() => {
        ImageGeneratorService.validateConfig(mockConfig);
      }).not.toThrow();
    });

    it('should throw error for missing API key', () => {
      expect(() => {
        ImageGeneratorService.validateConfig({ apiKey: '' });
      }).toThrow('API key is required for image generation');
    });

    it('should throw error for invalid image size', () => {
      expect(() => {
        ImageGeneratorService.validateConfig({
          apiKey: 'test',
          size: '128x128' as any
        });
      }).toThrow('Invalid image size');
    });

    it('should throw error for invalid quality', () => {
      expect(() => {
        ImageGeneratorService.validateConfig({
          apiKey: 'test',
          quality: 'ultra' as any
        });
      }).toThrow('Invalid image quality');
    });

    it('should throw error for invalid max retries', () => {
      expect(() => {
        ImageGeneratorService.validateConfig({
          apiKey: 'test',
          maxRetries: 15
        });
      }).toThrow('Max retries must be between 1 and 10');
    });
  });

  describe('error handling edge cases', () => {
    it('should handle invalid API response format', async () => {
      // Mock a response that doesn't have the expected structure
      mockedAxios.post.mockResolvedValueOnce(createMockResponse({
        data: [] // Empty array instead of array with url objects
      }));

      const result = await service.generateDishImage(mockMenuItem);

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toContain('Invalid response format');
    });

    it('should handle network connection errors', async () => {
      const networkError = { code: 'ENOTFOUND' };
      mockedAxios.post.mockRejectedValueOnce(networkError);

      const result = await service.generateDishImage(mockMenuItem);

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toContain('Unable to connect to image generation service');
    });
  });
});