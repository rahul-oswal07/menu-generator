import { ProcessingResult } from '../types';

export interface ResultsManager {
  saveResults(sessionId: string, results: ProcessingResult): Promise<void>;
  getResults(sessionId: string): Promise<ProcessingResult>;
}