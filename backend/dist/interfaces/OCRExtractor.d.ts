import { ExtractedText, MenuItem, OCRError } from '../types';
export interface OCRExtractor {
    extractText(imageUrl: string): Promise<ExtractedText>;
    parseMenuItems(text: string): Promise<MenuItem[]>;
    suggestImageQualityImprovements(error: OCRError): string[];
}
//# sourceMappingURL=OCRExtractor.d.ts.map