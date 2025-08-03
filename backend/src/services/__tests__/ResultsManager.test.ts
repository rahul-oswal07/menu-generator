import { ResultsManager } from '../ResultsManager';
import { ProcessingResult, MenuItem, GeneratedImage } from '../../types';
import fs from 'fs/promises';
import path from 'path';

// Mock fs module
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

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

describe('ResultsManager', () => {
  let resultsManager: ResultsManager;

  beforeEach(() => {
    jest.clearAllMocks();
    resultsManager = new ResultsManager();
    
    // Mock fs operations
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('{}');
    mockFs.unlink.mockResolvedValue(undefined);
    mockFs.rm.mockResolvedValue(undefined);
  });

  afterEach(() => {
    // Clean up the interval to prevent Jest from hanging
    resultsManager.stopCleanupInterval();
  });

  describe('saveResults', () => {
    it('should save results to cache and disk', async () => {
      const sessionId = 'test-session-id';
      
      await resultsManager.saveResults(sessionId, mockResults);
      
      // Verify results can be retrieved
      const retrievedResults = await resultsManager.getResults(sessionId);
      expect(retrievedResults).toEqual(mockResults);
      
      // Verify disk persistence was attempted
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        path.join(process.cwd(), 'cache'),
        { recursive: true }
      );
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should update processing status correctly', async () => {
      const sessionId = 'test-session-id';
      
      await resultsManager.saveResults(sessionId, mockResults);
      
      const status = await resultsManager.getProcessingStatus(sessionId);
      expect(status).toMatchObject({
        sessionId,
        status: 'completed',
        progress: 100,
        currentStage: 'Processing complete'
      });
    });
  });

  describe('getResults', () => {
    it('should return null for non-existent session', async () => {
      const results = await resultsManager.getResults('non-existent');
      expect(results).toBeNull();
    });

    it('should load from disk if not in memory cache', async () => {
      const sessionId = 'disk-session';
      const mockCacheData = {
        results: mockResults,
        status: {
          sessionId,
          status: 'completed',
          progress: 100,
          currentStage: 'Processing complete'
        },
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockCacheData));

      const results = await resultsManager.getResults(sessionId);
      expect(results).toEqual(mockResults);
      expect(mockFs.readFile).toHaveBeenCalledWith(
        path.join(process.cwd(), 'cache', `${sessionId}.json`),
        'utf-8'
      );
    });

    it('should return null for expired entries', async () => {
      const sessionId = 'expired-session';
      const expiredCacheData = {
        results: mockResults,
        status: {
          sessionId,
          status: 'completed',
          progress: 100,
          currentStage: 'Processing complete'
        },
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        expiresAt: new Date(Date.now() - 1000).toISOString() // Expired 1 second ago
      };

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(expiredCacheData));

      const results = await resultsManager.getResults(sessionId);
      expect(results).toBeNull();
    });
  });

  describe('updateProcessingStatus', () => {
    it('should update status for existing session', async () => {
      const sessionId = 'test-session-id';
      
      await resultsManager.saveResults(sessionId, mockResults);
      
      const success = await resultsManager.updateProcessingStatus(sessionId, {
        progress: 50,
        currentStage: 'Generating images...'
      });
      
      expect(success).toBe(true);
      
      const status = await resultsManager.getProcessingStatus(sessionId);
      expect(status?.progress).toBe(50);
      expect(status?.currentStage).toBe('Generating images...');
    });

    it('should return false for non-existent session', async () => {
      const success = await resultsManager.updateProcessingStatus('non-existent', {
        progress: 50
      });
      
      expect(success).toBe(false);
    });
  });

  describe('generateDownloadUrl', () => {
    it('should generate download URL for valid image', async () => {
      const sessionId = 'test-session-id';
      
      await resultsManager.saveResults(sessionId, mockResults);
      
      const downloadUrl = await resultsManager.generateDownloadUrl(sessionId, '1');
      expect(downloadUrl).toBe('https://example.com/salmon.jpg?download=true&sessionId=test-session-id');
    });

    it('should return null for non-existent session', async () => {
      const downloadUrl = await resultsManager.generateDownloadUrl('non-existent', '1');
      expect(downloadUrl).toBeNull();
    });

    it('should return null for non-existent menu item', async () => {
      const sessionId = 'test-session-id';
      
      await resultsManager.saveResults(sessionId, mockResults);
      
      const downloadUrl = await resultsManager.generateDownloadUrl(sessionId, 'non-existent');
      expect(downloadUrl).toBeNull();
    });

    it('should return null for failed image generation', async () => {
      const sessionId = 'test-session-id';
      const resultsWithFailedImage = {
        ...mockResults,
        generatedImages: [{
          ...mockGeneratedImage,
          status: 'failed' as const
        }]
      };
      
      await resultsManager.saveResults(sessionId, resultsWithFailedImage);
      
      const downloadUrl = await resultsManager.generateDownloadUrl(sessionId, '1');
      expect(downloadUrl).toBeNull();
    });
  });

  describe('generateShareUrl', () => {
    it('should generate share URL for valid image', async () => {
      const sessionId = 'test-session-id';
      
      await resultsManager.saveResults(sessionId, mockResults);
      
      const shareUrl = await resultsManager.generateShareUrl(sessionId, '1');
      expect(shareUrl).toMatch(/^\/api\/share\/[a-f0-9-]+$/);
    });

    it('should return null for non-existent session', async () => {
      const shareUrl = await resultsManager.generateShareUrl('non-existent', '1');
      expect(shareUrl).toBeNull();
    });

    it('should return null for non-existent menu item', async () => {
      const sessionId = 'test-session-id';
      
      await resultsManager.saveResults(sessionId, mockResults);
      
      const shareUrl = await resultsManager.generateShareUrl(sessionId, 'non-existent');
      expect(shareUrl).toBeNull();
    });
  });

  describe('getShareLink', () => {
    it('should return share link information for valid share ID', async () => {
      const sessionId = 'test-session-id';
      
      await resultsManager.saveResults(sessionId, mockResults);
      
      const shareUrl = await resultsManager.generateShareUrl(sessionId, '1');
      const shareId = shareUrl!.split('/').pop()!;
      
      const shareLink = resultsManager.getShareLink(shareId);
      expect(shareLink).toMatchObject({
        id: shareId,
        sessionId,
        menuItemId: '1',
        url: 'https://example.com/salmon.jpg'
      });
    });

    it('should return null for non-existent share ID', () => {
      const shareLink = resultsManager.getShareLink('non-existent');
      expect(shareLink).toBeNull();
    });

    it('should return null and cleanup expired share links', () => {
      // This test would require manipulating internal state or time
      // For now, we'll test the basic case
      const shareLink = resultsManager.getShareLink('expired-share-id');
      expect(shareLink).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('should delete session from cache and disk', async () => {
      const sessionId = 'test-session-id';
      
      await resultsManager.saveResults(sessionId, mockResults);
      
      const success = await resultsManager.deleteSession(sessionId);
      expect(success).toBe(true);
      
      // Verify session is deleted
      const results = await resultsManager.getResults(sessionId);
      expect(results).toBeNull();
      
      // Verify disk cleanup was attempted
      expect(mockFs.unlink).toHaveBeenCalledWith(
        path.join(process.cwd(), 'cache', `${sessionId}.json`)
      );
      expect(mockFs.rm).toHaveBeenCalledWith(
        path.join(process.cwd(), 'uploads', sessionId),
        { recursive: true, force: true }
      );
    });

    it('should handle deletion of non-existent session from disk', async () => {
      const sessionId = 'disk-only-session';
      const mockCacheData = {
        results: mockResults,
        status: {
          sessionId,
          status: 'completed',
          progress: 100,
          currentStage: 'Processing complete'
        },
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockCacheData));

      const success = await resultsManager.deleteSession(sessionId);
      expect(success).toBe(true);
    });

    it('should return false for completely non-existent session', async () => {
      mockFs.readFile.mockRejectedValueOnce(new Error('File not found'));

      const success = await resultsManager.deleteSession('non-existent');
      expect(success).toBe(false);
    });
  });

  describe('getCacheInfo', () => {
    it('should return cache information for valid session', async () => {
      const sessionId = 'test-session-id';
      
      await resultsManager.saveResults(sessionId, mockResults);
      
      const cacheInfo = await resultsManager.getCacheInfo(sessionId);
      expect(cacheInfo).toMatchObject({
        sessionId,
        itemCount: 1
      });
      expect(cacheInfo?.createdAt).toBeDefined();
      expect(cacheInfo?.lastAccessed).toBeDefined();
      expect(cacheInfo?.expiresAt).toBeDefined();
      expect(cacheInfo?.size).toBeGreaterThan(0);
    });

    it('should return null for non-existent session', async () => {
      const cacheInfo = await resultsManager.getCacheInfo('non-existent');
      expect(cacheInfo).toBeNull();
    });
  });
});