import request from 'supertest';
import express from 'express';
import resultsRouter from '../results';
import { ProcessingResult, MenuItem, GeneratedImage } from '../../types';

// Mock the ResultsManager
jest.mock('../../services/ResultsManager', () => {
  return {
    ResultsManager: jest.fn().mockImplementation(() => ({
      getResults: jest.fn(),
      getProcessingStatus: jest.fn(),
      generateDownloadUrl: jest.fn(),
      generateShareUrl: jest.fn(),
      deleteSession: jest.fn(),
      getCacheInfo: jest.fn()
    }))
  };
});

const app = express();
app.use(express.json());
app.use('/api/results', resultsRouter);

// Mock data
const mockMenuItem: MenuItem = {
  id: '1',
  name: 'Grilled Salmon',
  description: 'Fresh Atlantic salmon grilled to perfection',
  price: '$24.99',
  category: 'Main Course'
};

const mockGeneratedImage: GeneratedImage = {
  url: 'https://example.com/salmon.jpg',
  menuItemId: '1',
  status: 'success'
};

const mockResults: ProcessingResult = {
  originalImage: 'https://example.com/menu.jpg',
  extractedItems: [mockMenuItem],
  generatedImages: [mockGeneratedImage],
  processingStatus: 'completed'
};

describe('Results API', () => {
  let mockResultsManager: any;

  beforeEach(() => {
    jest.clearAllMocks();
    const { ResultsManager } = require('../../services/ResultsManager');
    mockResultsManager = new ResultsManager();
  });

  describe('GET /api/results/:sessionId', () => {
    it('should return results for valid session', async () => {
      mockResultsManager.getResults.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/results/test-session-id')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sessionId).toBe('test-session-id');
      expect(response.body.data.results).toEqual(mockResults);
      expect(mockResultsManager.getResults).toHaveBeenCalledWith('test-session-id');
    });

    it('should return 404 for non-existent session', async () => {
      mockResultsManager.getResults.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/results/non-existent-session')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('session_not_found');
    });

    it('should handle server errors', async () => {
      mockResultsManager.getResults.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/results/error-session')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('server_error');
    });
  });

  describe('GET /api/results/:sessionId/status', () => {
    it('should return processing status for valid session', async () => {
      const mockStatus = {
        sessionId: 'test-session-id',
        status: 'completed' as const,
        progress: 100,
        currentStage: 'Processing complete'
      };

      mockResultsManager.getProcessingStatus.mockResolvedValue(mockStatus);

      const response = await request(app)
        .get('/api/results/test-session-id/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStatus);
      expect(mockResultsManager.getProcessingStatus).toHaveBeenCalledWith('test-session-id');
    });

    it('should return 404 for non-existent session status', async () => {
      mockResultsManager.getProcessingStatus.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/results/non-existent-session/status')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('session_not_found');
    });
  });

  describe('POST /api/results/:sessionId/save-image', () => {
    it('should generate download URL for valid image', async () => {
      const mockDownloadUrl = 'https://example.com/salmon.jpg?download=true&sessionId=test-session-id';

      mockResultsManager.generateDownloadUrl.mockResolvedValue(mockDownloadUrl);

      const response = await request(app)
        .post('/api/results/test-session-id/save-image')
        .send({ menuItemId: '1' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.downloadUrl).toBe(mockDownloadUrl);
      expect(response.body.data.expiresAt).toBeDefined();
      expect(mockResultsManager.generateDownloadUrl).toHaveBeenCalledWith('test-session-id', '1');
    });

    it('should return 400 when menuItemId is missing', async () => {
      const response = await request(app)
        .post('/api/results/test-session-id/save-image')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('missing_parameter');
    });

    it('should return 404 when image is not found', async () => {
      mockResultsManager.generateDownloadUrl.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/results/test-session-id/save-image')
        .send({ menuItemId: 'non-existent' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('image_not_found');
    });
  });

  describe('POST /api/results/:sessionId/share-image', () => {
    it('should generate share URL for valid image', async () => {
      const mockShareUrl = '/api/share/share-id-123';

      mockResultsManager.generateShareUrl.mockResolvedValue(mockShareUrl);

      const response = await request(app)
        .post('/api/results/test-session-id/share-image')
        .send({ menuItemId: '1' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.shareUrl).toBe(mockShareUrl);
      expect(response.body.data.expiresAt).toBeDefined();
      expect(mockResultsManager.generateShareUrl).toHaveBeenCalledWith('test-session-id', '1');
    });

    it('should return 400 when menuItemId is missing', async () => {
      const response = await request(app)
        .post('/api/results/test-session-id/share-image')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('missing_parameter');
    });

    it('should return 404 when image is not found', async () => {
      mockResultsManager.generateShareUrl.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/results/test-session-id/share-image')
        .send({ menuItemId: 'non-existent' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('image_not_found');
    });
  });

  describe('DELETE /api/results/:sessionId', () => {
    it('should delete session successfully', async () => {
      mockResultsManager.deleteSession.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/results/test-session-id')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockResultsManager.deleteSession).toHaveBeenCalledWith('test-session-id');
    });

    it('should return 404 for non-existent session', async () => {
      mockResultsManager.deleteSession.mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/results/non-existent-session')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('session_not_found');
    });
  });

  describe('GET /api/results/:sessionId/cache-info', () => {
    it('should return cache information for valid session', async () => {
      const mockCacheInfo = {
        sessionId: 'test-session-id',
        createdAt: '2023-01-01T00:00:00.000Z',
        lastAccessed: '2023-01-01T01:00:00.000Z',
        expiresAt: '2023-01-02T00:00:00.000Z',
        size: 1024,
        itemCount: 1
      };

      mockResultsManager.getCacheInfo.mockResolvedValue(mockCacheInfo);

      const response = await request(app)
        .get('/api/results/test-session-id/cache-info')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockCacheInfo);
      expect(mockResultsManager.getCacheInfo).toHaveBeenCalledWith('test-session-id');
    });

    it('should return 404 for non-existent session cache', async () => {
      mockResultsManager.getCacheInfo.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/results/non-existent-session/cache-info')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('session_not_found');
    });
  });
});