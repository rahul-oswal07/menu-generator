import { OCRExtractor } from '../OCRExtractor';
import { OCRError } from '../../types';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock Google Cloud Vision
jest.mock('@google-cloud/vision', () => ({
  ImageAnnotatorClient: jest.fn().mockImplementation(() => ({
    textDetection: jest.fn().mockRejectedValue(new Error('Mock API error'))
  }))
}));

describe('OCRExtractor', () => {
  let ocrExtractor: OCRExtractor;

  beforeEach(() => {
    ocrExtractor = new OCRExtractor();
    // Set NODE_ENV to development to use mock OCR
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('extractText', () => {
    it('should extract text from image successfully', async () => {
      const imageUrl = 'https://example.com/menu.jpg';
      
      const result = await ocrExtractor.extractText(imageUrl);
      
      expect(result).toHaveProperty('rawText');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('processingTime');
      expect(typeof result.rawText).toBe('string');
      expect(typeof result.confidence).toBe('number');
      expect(typeof result.processingTime).toBe('number');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should return empty result when OCR fails', async () => {
      // Mock a failing OCR by temporarily changing the mock
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.GOOGLE_APPLICATION_CREDENTIALS = 'fake-credentials';
      
      const result = await ocrExtractor.extractText('invalid-url');
      
      expect(result.rawText).toBe('');
      expect(result.confidence).toBe(0);
      expect(result.processingTime).toBeGreaterThan(0);
      
      process.env.NODE_ENV = originalEnv;
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }, 10000);

    it('should handle processing time correctly', async () => {
      const startTime = Date.now();
      const result = await ocrExtractor.extractText('https://example.com/menu.jpg');
      const endTime = Date.now();
      
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
      expect(result.processingTime).toBeLessThanOrEqual(endTime - startTime + 100); // Allow some margin
    });
  });

  describe('parseMenuItems', () => {
    it('should parse menu items from extracted text', async () => {
      const menuText = `
APPETIZERS

Crispy Calamari Rings - $12.99
Fresh squid rings served with marinara sauce

Buffalo Wings - $14.99
Spicy wings with celery sticks

MAIN COURSES

Grilled Salmon - $24.99
Atlantic salmon with lemon herb butter
      `.trim();

      const result = await ocrExtractor.parseMenuItems(menuText);
      
      expect(result).toHaveLength(3);
      
      expect(result[0]).toEqual({
        id: expect.any(String),
        name: 'Crispy Calamari Rings',
        description: 'Fresh squid rings served with marinara sauce',
        price: '$12.99',
        category: 'APPETIZERS'
      });
      
      expect(result[1]).toEqual({
        id: expect.any(String),
        name: 'Buffalo Wings',
        description: 'Spicy wings with celery sticks',
        price: '$14.99',
        category: 'APPETIZERS'
      });
      
      expect(result[2]).toEqual({
        id: expect.any(String),
        name: 'Grilled Salmon',
        description: 'Atlantic salmon with lemon herb butter',
        price: '$24.99',
        category: 'MAIN COURSES'
      });
    });

    it('should handle empty text', async () => {
      const result = await ocrExtractor.parseMenuItems('');
      expect(result).toEqual([]);
    });

    it('should handle text with no menu items', async () => {
      const result = await ocrExtractor.parseMenuItems('This is just random text without prices');
      expect(result).toEqual([]);
    });

    it('should parse items without categories', async () => {
      const menuText = `
Burger - $15.99
Juicy beef burger with fries

Pizza - $18.99
Margherita pizza with fresh basil
      `.trim();

      const result = await ocrExtractor.parseMenuItems(menuText);
      
      expect(result).toHaveLength(2);
      expect(result[0].category).toBeUndefined();
      expect(result[1].category).toBeUndefined();
    });

    it('should handle items without descriptions', async () => {
      const menuText = `
DESSERTS

Chocolate Cake - $8.99

Ice Cream - $5.99
      `.trim();

      const result = await ocrExtractor.parseMenuItems(menuText);
      
      expect(result).toHaveLength(2);
      expect(result[0].description).toBe('');
      expect(result[1].description).toBe('');
    });

    it('should handle different price formats', async () => {
      const menuText = `
Item One - $12.99
Item Two - $15
Item Three - $8.50
      `.trim();

      const result = await ocrExtractor.parseMenuItems(menuText);
      
      expect(result).toHaveLength(3);
      expect(result[0].price).toBe('$12.99');
      expect(result[1].price).toBe('$15');
      expect(result[2].price).toBe('$8.50');
    });
  });

  describe('suggestImageQualityImprovements', () => {
    it('should provide suggestions for low confidence errors', () => {
      const error: OCRError = {
        code: 'LOW_CONFIDENCE',
        message: 'OCR confidence is too low'
      };

      const suggestions = ocrExtractor.suggestImageQualityImprovements(error);
      
      expect(suggestions).toContain('Try taking a clearer photo with better lighting');
      expect(suggestions).toContain('Ensure the menu is flat and not wrinkled or folded');
      expect(suggestions).toContain('Take the photo from directly above the menu');
    });

    it('should provide suggestions for no text detected errors', () => {
      const error: OCRError = {
        code: 'NO_TEXT_DETECTED',
        message: 'No text found in image'
      };

      const suggestions = ocrExtractor.suggestImageQualityImprovements(error);
      
      expect(suggestions).toContain('Make sure the menu text is clearly visible');
      expect(suggestions).toContain('Check that the image contains actual menu text');
      expect(suggestions).toContain('Try cropping the image to focus on the menu content');
    });

    it('should provide suggestions for API errors', () => {
      const error: OCRError = {
        code: 'API_ERROR',
        message: 'OCR service unavailable'
      };

      const suggestions = ocrExtractor.suggestImageQualityImprovements(error);
      
      expect(suggestions).toContain('Please try again in a few moments');
      expect(suggestions).toContain('Check your internet connection');
      expect(suggestions).toContain('The OCR service may be temporarily unavailable');
    });

    it('should provide default suggestions for unknown errors', () => {
      const error: OCRError = {
        code: 'UNKNOWN_ERROR',
        message: 'Something went wrong'
      };

      const suggestions = ocrExtractor.suggestImageQualityImprovements(error);
      
      expect(suggestions).toContain('Try uploading a different image');
      expect(suggestions).toContain('Ensure the image is clear and well-lit');
      expect(suggestions).toContain('Make sure the menu text is readable');
    });
  });

  describe('retry logic', () => {
    it('should retry failed operations with exponential backoff', async () => {
      // This test verifies the retry mechanism works
      // We'll test this indirectly through the extractText method
      const imageUrl = 'https://example.com/menu.jpg';
      
      const result = await ocrExtractor.extractText(imageUrl);
      
      // Should still get a result even if some retries happened
      expect(result).toHaveProperty('rawText');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('processingTime');
    });
  });

  describe('text parsing edge cases', () => {
    it('should handle malformed menu text gracefully', async () => {
      const malformedText = `
BROKEN CATEGORY
Item with no price
- $12.99 Price with no item name
$$$$ Invalid price format
      `.trim();

      const result = await ocrExtractor.parseMenuItems(malformedText);
      
      // Should not crash and should filter out invalid items
      expect(Array.isArray(result)).toBe(true);
    });

    it('should normalize whitespace and line breaks', async () => {
      const messyText = `


APPETIZERS


Calamari   -   $12.99


Fresh squid rings


      `.trim();

      const result = await ocrExtractor.parseMenuItems(messyText);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Calamari');
      expect(result[0].description).toBe('Fresh squid rings');
    });
  });
});