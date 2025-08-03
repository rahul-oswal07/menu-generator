import { OCRExtractor as IOCRExtractor } from '../interfaces/OCRExtractor';
import { ExtractedText, MenuItem, OCRError } from '../types';
export declare class OCRExtractor implements IOCRExtractor {
    private visionClient;
    private maxRetries;
    private baseDelay;
    constructor();
    extractText(imageUrl: string): Promise<ExtractedText>;
    parseMenuItems(text: string): Promise<MenuItem[]>;
    suggestImageQualityImprovements(error: OCRError): string[];
    private retryWithBackoff;
    private performOCR;
    private mockOCR;
    private calculateConfidence;
    private cleanAndNormalizeText;
    private parseTextIntoItems;
    private isCategoryHeader;
    private containsPrice;
    private parseMenuItem;
    private generateId;
    private sleep;
}
//# sourceMappingURL=OCRExtractor.d.ts.map