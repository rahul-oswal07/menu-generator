// Shared types between frontend and backend

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: string;
  category?: string;
  isManuallyEdited?: boolean;
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

// Frontend-specific types
export interface FileUploadState {
  file: File | null;
  preview: string | null;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
}

export interface AppState {
  sessionId: string | null;
  uploadState: FileUploadState;
  processingState: ProcessingStatusResponse | null;
  results: ProcessingResult | null;
  error: string | null;
}