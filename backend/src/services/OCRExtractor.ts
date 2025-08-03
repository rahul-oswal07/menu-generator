import { ImageAnnotatorClient } from '@google-cloud/vision';
import { OCRExtractor as IOCRExtractor } from '../interfaces/OCRExtractor';
import { ExtractedText, MenuItem, OCRError } from '../types';

export class OCRExtractor implements IOCRExtractor {
  private visionClient: ImageAnnotatorClient;
  private maxRetries: number = 3;
  private baseDelay: number = 1000; // 1 second

  constructor() {
    // Initialize Google Cloud Vision client
    // In production, this would use service account credentials
    this.visionClient = new ImageAnnotatorClient({
      // For development, we'll use a mock or fallback to Tesseract.js
      // In production, set GOOGLE_APPLICATION_CREDENTIALS environment variable
    });
  }

  /**
   * Extract text from an image using OCR
   */
  async extractText(imageUrl: string): Promise<ExtractedText> {
    const startTime = Date.now();

    try {
      const result = await this.retryWithBackoff(
        () => this.performOCR(imageUrl),
        this.maxRetries
      );

      const processingTime = Date.now() - startTime;

      return {
        rawText: result.text,
        confidence: result.confidence,
        processingTime
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      // If OCR fails, return empty result with low confidence
      console.error('OCR extraction failed:', error);
      return {
        rawText: '',
        confidence: 0,
        processingTime
      };
    }
  }

  /**
   * Parse extracted text into menu items
   */
  async parseMenuItems(text: string): Promise<MenuItem[]> {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const cleanedText = this.cleanAndNormalizeText(text);
    const menuItems = this.parseTextIntoItems(cleanedText);

    return menuItems;
  }

  /**
   * Suggest improvements for better OCR results
   */
  suggestImageQualityImprovements(error: OCRError): string[] {
    const suggestions: string[] = [];

    switch (error.code) {
      case 'LOW_CONFIDENCE':
        suggestions.push(
          'Try taking a clearer photo with better lighting',
          'Ensure the menu is flat and not wrinkled or folded',
          'Take the photo from directly above the menu'
        );
        break;
      case 'NO_TEXT_DETECTED':
        suggestions.push(
          'Make sure the menu text is clearly visible',
          'Check that the image contains actual menu text',
          'Try cropping the image to focus on the menu content'
        );
        break;
      case 'API_ERROR':
        suggestions.push(
          'Please try again in a few moments',
          'Check your internet connection',
          'The OCR service may be temporarily unavailable'
        );
        break;
      default:
        suggestions.push(
          'Try uploading a different image',
          'Ensure the image is clear and well-lit',
          'Make sure the menu text is readable'
        );
    }

    return suggestions;
  }

  /**
   * Perform OCR with retry logic and exponential backoff
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = this.baseDelay * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Perform the actual OCR operation
   */
  private async performOCR(imageUrl: string): Promise<{ text: string; confidence: number }> {
    try {
      // For development, we'll use a mock implementation
      // In production, this would use Google Cloud Vision API
      if (process.env.NODE_ENV === 'development' || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        return this.mockOCR(imageUrl);
      }

      // Production implementation with Google Cloud Vision
      const [result] = await this.visionClient.textDetection(imageUrl);
      const detections = result.textAnnotations;

      if (!detections || detections.length === 0) {
        throw new Error('NO_TEXT_DETECTED');
      }

      const fullText = detections[0].description || '';
      const confidence = this.calculateConfidence(detections);

      return {
        text: fullText,
        confidence
      };
    } catch (error) {
      console.error('OCR API error:', error);
      throw new Error('API_ERROR');
    }
  }

  /**
   * Mock OCR implementation for development
   */
  private async mockOCR(_imageUrl: string): Promise<{ text: string; confidence: number }> {
    // Simulate processing delay
    await this.sleep(1000 + Math.random() * 2000);

    // Mock menu text for testing
    const mockMenuText = `
APPETIZERS

Crispy Calamari Rings - $12.99
Fresh squid rings served with marinara sauce and lemon

Buffalo Chicken Wings - $14.99
Spicy wings with celery sticks and blue cheese dip

Spinach Artichoke Dip - $10.99
Creamy dip served with tortilla chips

MAIN COURSES

Grilled Salmon - $24.99
Atlantic salmon with lemon herb butter and seasonal vegetables

Ribeye Steak - $32.99
12oz ribeye with garlic mashed potatoes and asparagus

Chicken Parmesan - $19.99
Breaded chicken breast with marinara and mozzarella over pasta

Vegetarian Pasta - $16.99
Penne with roasted vegetables in olive oil and herbs

DESSERTS

Chocolate Lava Cake - $8.99
Warm chocolate cake with vanilla ice cream

Tiramisu - $7.99
Classic Italian dessert with coffee and mascarpone
    `.trim();

    return {
      text: mockMenuText,
      confidence: 0.85
    };
  }

  /**
   * Calculate overall confidence from OCR detections
   */
  private calculateConfidence(detections: any[]): number {
    if (!detections || detections.length === 0) {
      return 0;
    }

    // For Google Cloud Vision, we'd calculate based on detection confidence
    // For mock, return a reasonable confidence score
    return 0.85;
  }

  /**
   * Clean and normalize extracted text
   */
  private cleanAndNormalizeText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Parse cleaned text into menu items
   */
  private parseTextIntoItems(text: string): MenuItem[] {
    const items: MenuItem[] = [];
    const lines = text.split('\n').filter(line => line.trim().length > 0);

    let currentCategory = '';
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();

      // Check if this line is a category header (all caps, no price)
      if (this.isCategoryHeader(line)) {
        currentCategory = line;
        i++;
        continue;
      }

      // Try to parse as menu item
      const menuItem = this.parseMenuItem(line, lines[i + 1], currentCategory);
      if (menuItem) {
        items.push(menuItem);
        // Skip the description line if it was used
        if (lines[i + 1] && !this.containsPrice(lines[i + 1]) && !this.isCategoryHeader(lines[i + 1])) {
          i++;
        }
      }

      i++;
    }

    return items;
  }

  /**
   * Check if a line is a category header
   */
  private isCategoryHeader(line: string): boolean {
    return (
      line === line.toUpperCase() &&
      line.length > 2 &&
      !this.containsPrice(line) &&
      !/\d/.test(line)
    );
  }

  /**
   * Check if a line contains a price
   */
  private containsPrice(line: string): boolean {
    return /\$\d+\.?\d*/.test(line);
  }

  /**
   * Parse a single menu item from text lines
   */
  private parseMenuItem(
    nameLine: string,
    descriptionLine: string | undefined,
    category: string
  ): MenuItem | null {
    if (!this.containsPrice(nameLine)) {
      return null;
    }

    // Extract price from the name line
    const priceMatch = nameLine.match(/\$\d+\.?\d*/);
    if (!priceMatch) {
      return null;
    }

    const price = priceMatch[0];
    const name = nameLine.replace(/\s*-\s*\$\d+\.?\d*/, '').trim();

    if (name.length === 0) {
      return null;
    }

    // Use description line if it doesn't contain a price and isn't a category
    let description = '';
    if (
      descriptionLine &&
      !this.containsPrice(descriptionLine) &&
      !this.isCategoryHeader(descriptionLine)
    ) {
      description = descriptionLine.trim();
    }

    return {
      id: this.generateId(),
      name,
      description,
      price,
      category: category || undefined
    };
  }

  /**
   * Generate a unique ID for menu items
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}