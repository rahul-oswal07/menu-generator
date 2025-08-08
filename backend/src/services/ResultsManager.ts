import fs from 'fs/promises';
import path from 'path';
import { menuItemRepository } from '../menuItemRepositoryInstance';
import { MenuItemModel } from '../models/MenuItemModel';
import { ProcessingResult, ProcessingStatusResponse } from '../types';

interface CacheEntry {
  results: ProcessingResult;
  status: ProcessingStatusResponse;
  createdAt: Date;
  lastAccessed: Date;
  expiresAt: Date;
}

interface CacheInfo {
  sessionId: string;
  createdAt: string;
  lastAccessed: string;
  expiresAt: string;
  size: number;
  itemCount: number;
}

interface ShareLink {
  id: string;
  sessionId: string;
  menuItemId: string;
  url: string | undefined;
  createdAt: Date;
  expiresAt: Date;
}

export class ResultsManager {
  private cache: Map<string, CacheEntry> = new Map();
  private shareLinks: Map<string, ShareLink> = new Map();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_CACHE_SIZE = 100; // Maximum number of sessions to cache
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Save processing results for a session
   */
  async saveResults(sessionId: string, results: ProcessingResult): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.CACHE_TTL);

    const status: ProcessingStatusResponse = {
      sessionId,
      status: results.processingStatus,
      progress: results.processingStatus === 'completed' ? 100 : 0,
      currentStage: this.getStageFromStatus(results.processingStatus)
    };

    const cacheEntry: CacheEntry = {
      results,
      status,
      createdAt: now,
      lastAccessed: now,
      expiresAt
    };

    // Ensure cache doesn't exceed maximum size
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldestEntry();
    }

    this.cache.set(sessionId, cacheEntry);

    // Persist to disk for durability
    await this.persistToDisk(sessionId, cacheEntry);
  }

  /**
   * Retrieve processing results for a session
   */
  async getResults(sessionId: string): Promise<MenuItemModel[] | null> {
    const result = await menuItemRepository.findBySessionId(sessionId);
    return result;
  }

  /**
   * Get processing status for a session
   */
  async getProcessingStatus(sessionId: string): Promise<ProcessingStatusResponse | null> {
    let cacheEntry = this.cache.get(sessionId);

    if (!cacheEntry) {
      const diskEntry = await this.loadFromDisk(sessionId);
      if (diskEntry) {
        cacheEntry = diskEntry;
        this.cache.set(sessionId, cacheEntry);
      } else {
        return null;
      }
    }

    if (this.isExpired(cacheEntry)) {
      return null;
    }

    cacheEntry.lastAccessed = new Date();
    return cacheEntry.status;
  }

  /**
   * Update processing status for a session
   */
  async updateProcessingStatus(
    sessionId: string, 
    status: Partial<ProcessingStatusResponse>
  ): Promise<boolean> {
    const cacheEntry = this.cache.get(sessionId);
    
    if (!cacheEntry) {
      return false;
    }

    // Update status
    Object.assign(cacheEntry.status, status);
    cacheEntry.lastAccessed = new Date();

    // Persist updated status
    await this.persistToDisk(sessionId, cacheEntry);
    
    return true;
  }

  /**
   * Generate a download URL for a specific dish image
   */
  async generateDownloadUrl(sessionId: string): Promise<string | null> {
    const results = await this.getResults(sessionId);
    
    if (!results) {
      return null;
    }

   return null;

    // if (!generatedImage) {
    //   return null;
    // }

    // // In a real implementation, this might generate a signed URL for cloud storage
    // // For now, return the direct URL with a download parameter
    // return `${generatedImage.url}?download=true&sessionId=${sessionId}`;
  }

  /**
   * Generate a shareable link for a dish image
   */
  async generateShareUrl(sessionId: string): Promise<string | null> {
    const results = await this.getResults(sessionId);
    
    if (!results) {
      return null;
    }

   return null;

    // // Create a share link
    // const shareId = uuidv4();
    // const now = new Date();
    // const expiresAt = new Date(now.getTime() + this.SHARE_LINK_TTL);

    // const shareLink: ShareLink = {
    //   id: shareId,
    //   sessionId,
    //   menuItemId,
    //   createdAt: now,
    //   expiresAt
    // };

    // this.shareLinks.set(shareId, shareLink);

    // // Return the shareable URL
    // return `/api/share/${shareId}`;
  }

  /**
   * Get share link information
   */
  getShareLink(shareId: string): ShareLink | null {
    const shareLink = this.shareLinks.get(shareId);
    
    if (!shareLink || shareLink.expiresAt < new Date()) {
      if (shareLink) {
        this.shareLinks.delete(shareId);
      }
      return null;
    }

    return shareLink;
  }

  /**
   * Delete a session and cleanup associated files
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const cacheEntry = this.cache.get(sessionId);
    
    if (!cacheEntry) {
      // Try to load from disk to ensure it exists
      const diskEntry = await this.loadFromDisk(sessionId);
      if (!diskEntry) {
        return false;
      }
    }

    // Remove from memory cache
    this.cache.delete(sessionId);

    // Remove from disk
    await this.removeFromDisk(sessionId);

    // Remove associated share links
    for (const [shareId, shareLink] of this.shareLinks.entries()) {
      if (shareLink.sessionId === sessionId) {
        this.shareLinks.delete(shareId);
      }
    }

    // Cleanup uploaded files
    await this.cleanupSessionFiles(sessionId);

    return true;
  }

  /**
   * Get cache information for a session
   */
  async getCacheInfo(sessionId: string): Promise<CacheInfo | null> {
    let cacheEntry = this.cache.get(sessionId);

    if (!cacheEntry) {
      const diskEntry = await this.loadFromDisk(sessionId);
      if (diskEntry) {
        cacheEntry = diskEntry;
      } else {
        return null;
      }
    }

    if (this.isExpired(cacheEntry)) {
      return null;
    }

    return {
      sessionId,
      createdAt: cacheEntry.createdAt.toISOString(),
      lastAccessed: cacheEntry.lastAccessed.toISOString(),
      expiresAt: cacheEntry.expiresAt.toISOString(),
      size: JSON.stringify(cacheEntry.results).length,
      itemCount: cacheEntry.results.extractedItems.length
    };
  }

  /**
   * Clear expired entries from cache
   */
  private cleanupExpiredEntries(): void {
    const now = new Date();
    
    // Cleanup cache entries
    for (const [sessionId, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(sessionId);
        this.removeFromDisk(sessionId).catch(console.error);
      }
    }

    // Cleanup share links
    for (const [shareId, shareLink] of this.shareLinks.entries()) {
      if (shareLink.expiresAt < now) {
        this.shareLinks.delete(shareId);
      }
    }
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanupInterval(): void {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60 * 60 * 1000);
  }

  /**
   * Stop the cleanup interval (for testing)
   */
  public stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  /**
   * Check if a cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return entry.expiresAt < new Date();
  }

  /**
   * Evict the oldest cache entry to make room for new ones
   */
  private evictOldestEntry(): void {
    let oldestSessionId: string | null = null;
    let oldestTime = new Date();

    for (const [sessionId, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestSessionId = sessionId;
      }
    }

    if (oldestSessionId) {
      this.cache.delete(oldestSessionId);
      this.removeFromDisk(oldestSessionId).catch(console.error);
    }
  }

  /**
   * Get stage description from processing status
   */
  private getStageFromStatus(status: string): string {
    switch (status) {
      case 'uploading':
        return 'Uploading image...';
      case 'processing':
        return 'Processing menu...';
      case 'completed':
        return 'Processing complete';
      case 'failed':
        return 'Processing failed';
      default:
        return 'Unknown stage';
    }
  }

  /**
   * Persist cache entry to disk
   */
  private async persistToDisk(sessionId: string, entry: CacheEntry): Promise<void> {
    try {
      const cacheDir = path.join(process.cwd(), 'cache');
      await fs.mkdir(cacheDir, { recursive: true });
      
      const filePath = path.join(cacheDir, `${sessionId}.json`);
      await fs.writeFile(filePath, JSON.stringify({
        ...entry,
        createdAt: entry.createdAt.toISOString(),
        lastAccessed: entry.lastAccessed.toISOString(),
        expiresAt: entry.expiresAt.toISOString()
      }));
    } catch (error) {
      console.error(`Failed to persist cache entry for session ${sessionId}:`, error);
    }
  }

   private async loadFromDisk(sessionId: string): Promise<CacheEntry | null> {
    try {
      const filePath = path.join(process.cwd(), 'cache', `${sessionId}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      
      return {
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        lastAccessed: new Date(parsed.lastAccessed),
        expiresAt: new Date(parsed.expiresAt)
      };
    } catch (error) {
      // File doesn't exist or is corrupted
      return null;
    }
  }

  /**
   * Remove cache entry from disk
   */
  private async removeFromDisk(sessionId: string): Promise<void> {
    try {
      const filePath = path.join(process.cwd(), 'cache', `${sessionId}.json`);
      await fs.unlink(filePath);
    } catch (error) {
      // File might not exist, which is fine
    }
  }

  /**
   * Cleanup session files (uploaded images, generated images)
   */
  private async cleanupSessionFiles(sessionId: string): Promise<void> {
    try {
      const sessionDir = path.join(process.cwd(), 'uploads', sessionId);
      await fs.rm(sessionDir, { recursive: true, force: true });
    } catch (error) {
      console.error(`Failed to cleanup files for session ${sessionId}:`, error);
    }
  }
}