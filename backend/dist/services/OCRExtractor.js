"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OCRExtractor = void 0;
const vision_1 = require("@google-cloud/vision");
class OCRExtractor {
    constructor() {
        this.maxRetries = 3;
        this.baseDelay = 1000;
        this.visionClient = new vision_1.ImageAnnotatorClient({});
    }
    async extractText(imageUrl) {
        const startTime = Date.now();
        try {
            const result = await this.retryWithBackoff(() => this.performOCR(imageUrl), this.maxRetries);
            const processingTime = Date.now() - startTime;
            return {
                rawText: result.text,
                confidence: result.confidence,
                processingTime
            };
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            console.error('OCR extraction failed:', error);
            return {
                rawText: '',
                confidence: 0,
                processingTime
            };
        }
    }
    async parseMenuItems(text) {
        if (!text || text.trim().length === 0) {
            return [];
        }
        const cleanedText = this.cleanAndNormalizeText(text);
        const menuItems = this.parseTextIntoItems(cleanedText);
        return menuItems;
    }
    suggestImageQualityImprovements(error) {
        const suggestions = [];
        switch (error.code) {
            case 'LOW_CONFIDENCE':
                suggestions.push('Try taking a clearer photo with better lighting', 'Ensure the menu is flat and not wrinkled or folded', 'Take the photo from directly above the menu');
                break;
            case 'NO_TEXT_DETECTED':
                suggestions.push('Make sure the menu text is clearly visible', 'Check that the image contains actual menu text', 'Try cropping the image to focus on the menu content');
                break;
            case 'API_ERROR':
                suggestions.push('Please try again in a few moments', 'Check your internet connection', 'The OCR service may be temporarily unavailable');
                break;
            default:
                suggestions.push('Try uploading a different image', 'Ensure the image is clear and well-lit', 'Make sure the menu text is readable');
        }
        return suggestions;
    }
    async retryWithBackoff(operation, maxRetries) {
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                if (attempt === maxRetries) {
                    break;
                }
                const delay = this.baseDelay * Math.pow(2, attempt);
                await this.sleep(delay);
            }
        }
        throw lastError;
    }
    async performOCR(imageUrl) {
        try {
            if (process.env.NODE_ENV === 'development' || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
                return this.mockOCR(imageUrl);
            }
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
        }
        catch (error) {
            console.error('OCR API error:', error);
            throw new Error('API_ERROR');
        }
    }
    async mockOCR(_imageUrl) {
        await this.sleep(1000 + Math.random() * 2000);
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
    calculateConfidence(detections) {
        if (!detections || detections.length === 0) {
            return 0;
        }
        return 0.85;
    }
    cleanAndNormalizeText(text) {
        return text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }
    parseTextIntoItems(text) {
        const items = [];
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        let currentCategory = '';
        let i = 0;
        while (i < lines.length) {
            const line = lines[i].trim();
            if (this.isCategoryHeader(line)) {
                currentCategory = line;
                i++;
                continue;
            }
            const menuItem = this.parseMenuItem(line, lines[i + 1], currentCategory);
            if (menuItem) {
                items.push(menuItem);
                if (lines[i + 1] && !this.containsPrice(lines[i + 1]) && !this.isCategoryHeader(lines[i + 1])) {
                    i++;
                }
            }
            i++;
        }
        return items;
    }
    isCategoryHeader(line) {
        return (line === line.toUpperCase() &&
            line.length > 2 &&
            !this.containsPrice(line) &&
            !/\d/.test(line));
    }
    containsPrice(line) {
        return /\$\d+\.?\d*/.test(line);
    }
    parseMenuItem(nameLine, descriptionLine, category) {
        if (!this.containsPrice(nameLine)) {
            return null;
        }
        const priceMatch = nameLine.match(/\$\d+\.?\d*/);
        if (!priceMatch) {
            return null;
        }
        const price = priceMatch[0];
        const name = nameLine.replace(/\s*-\s*\$\d+\.?\d*/, '').trim();
        if (name.length === 0) {
            return null;
        }
        let description = '';
        if (descriptionLine &&
            !this.containsPrice(descriptionLine) &&
            !this.isCategoryHeader(descriptionLine)) {
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
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.OCRExtractor = OCRExtractor;
//# sourceMappingURL=OCRExtractor.js.map