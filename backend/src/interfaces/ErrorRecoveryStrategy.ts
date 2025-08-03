export interface ServiceProvider {
  name: string;
  endpoint: string;
  apiKey: string;
}

export interface AlternativeImplementation {
  fallbackMethod: string;
  limitations: string[];
}

export interface ErrorRecoveryStrategy {
  retryWithBackoff(operation: () => Promise<any>, maxRetries: number): Promise<any>;
  fallbackToAlternativeService(primaryService: string): Promise<ServiceProvider>;
  gracefulDegradation(feature: string): AlternativeImplementation;
}