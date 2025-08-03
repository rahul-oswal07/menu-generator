// Core data models and interfaces for the AI Menu Generator

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: string;
  category?: string;
  isManuallyEdited?: boolean;
}

export interface ExtractedText {
  rawText: string;
  confidence: number;
  processingTime: number;
}

export interface GeneratedImage {
  url: string;
  menuItemId: string;
  status: 'success' | 'failed';
  errorMessage?: string;
}

export interface ProcessingResult {
  originalImage: string;
  extractedItems: MenuItem[];
  generatedImages: GeneratedImage[];
  processingStatus: ProcessingStatus;
}

export type ProcessingStatus = 'uploading' | 'processing' | 'completed' | 'failed';

export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export interface ProcessedImage {
  url: string;
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}

export interface OCRError {
  code: string;
  message: string;
  suggestions?: string[];
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UploadResponse {
  sessionId: string;
  imageUrl: string;
}

export interface ProcessingStatusResponse {
  sessionId: string;
  status: ProcessingStatus;
  progress: number;
  estimatedTimeRemaining?: number;
  currentStage?: string;
}

export interface ResultsResponse {
  sessionId: string;
  results: ProcessingResult;
}