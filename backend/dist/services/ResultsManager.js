"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultsManager = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
class ResultsManager {
    constructor() {
        this.cache = new Map();
        this.shareLinks = new Map();
        this.CACHE_TTL = 24 * 60 * 60 * 1000;
        this.SHARE_LINK_TTL = 7 * 24 * 60 * 60 * 1000;
        this.MAX_CACHE_SIZE = 100;
        this.startCleanupInterval();
    }
    async saveResults(sessionId, results) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + this.CACHE_TTL);
        const status = {
            sessionId,
            status: results.processingStatus,
            progress: results.processingStatus === 'completed' ? 100 : 0,
            currentStage: this.getStageFromStatus(results.processingStatus)
        };
        const cacheEntry = {
            results,
            status,
            createdAt: now,
            lastAccessed: now,
            expiresAt
        };
        if (this.cache.size >= this.MAX_CACHE_SIZE) {
            this.evictOldestEntry();
        }
        this.cache.set(sessionId, cacheEntry);
        await this.persistToDisk(sessionId, cacheEntry);
    }
    async getResults(sessionId) {
        let cacheEntry = this.cache.get(sessionId);
        if (!cacheEntry) {
            const diskEntry = await this.loadFromDisk(sessionId);
            if (diskEntry) {
                cacheEntry = diskEntry;
                this.cache.set(sessionId, cacheEntry);
            }
            else {
                return null;
            }
        }
        if (this.isExpired(cacheEntry)) {
            return null;
        }
        cacheEntry.lastAccessed = new Date();
        return cacheEntry.results;
    }
    async getProcessingStatus(sessionId) {
        let cacheEntry = this.cache.get(sessionId);
        if (!cacheEntry) {
            const diskEntry = await this.loadFromDisk(sessionId);
            if (diskEntry) {
                cacheEntry = diskEntry;
                this.cache.set(sessionId, cacheEntry);
            }
            else {
                return null;
            }
        }
        if (this.isExpired(cacheEntry)) {
            return null;
        }
        cacheEntry.lastAccessed = new Date();
        return cacheEntry.status;
    }
    async updateProcessingStatus(sessionId, status) {
        const cacheEntry = this.cache.get(sessionId);
        if (!cacheEntry) {
            return false;
        }
        Object.assign(cacheEntry.status, status);
        cacheEntry.lastAccessed = new Date();
        await this.persistToDisk(sessionId, cacheEntry);
        return true;
    }
    async generateDownloadUrl(sessionId, menuItemId) {
        const results = await this.getResults(sessionId);
        if (!results) {
            return null;
        }
        const generatedImage = results.generatedImages.find(img => img.menuItemId === menuItemId && img.status === 'success');
        if (!generatedImage) {
            return null;
        }
        return `${generatedImage.url}?download=true&sessionId=${sessionId}`;
    }
    async generateShareUrl(sessionId, menuItemId) {
        const results = await this.getResults(sessionId);
        if (!results) {
            return null;
        }
        const generatedImage = results.generatedImages.find(img => img.menuItemId === menuItemId && img.status === 'success');
        if (!generatedImage) {
            return null;
        }
        const shareId = (0, uuid_1.v4)();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + this.SHARE_LINK_TTL);
        const shareLink = {
            id: shareId,
            sessionId,
            menuItemId,
            url: generatedImage.url,
            createdAt: now,
            expiresAt
        };
        this.shareLinks.set(shareId, shareLink);
        return `/api/share/${shareId}`;
    }
    getShareLink(shareId) {
        const shareLink = this.shareLinks.get(shareId);
        if (!shareLink || shareLink.expiresAt < new Date()) {
            if (shareLink) {
                this.shareLinks.delete(shareId);
            }
            return null;
        }
        return shareLink;
    }
    async deleteSession(sessionId) {
        const cacheEntry = this.cache.get(sessionId);
        if (!cacheEntry) {
            const diskEntry = await this.loadFromDisk(sessionId);
            if (!diskEntry) {
                return false;
            }
        }
        this.cache.delete(sessionId);
        await this.removeFromDisk(sessionId);
        for (const [shareId, shareLink] of this.shareLinks.entries()) {
            if (shareLink.sessionId === sessionId) {
                this.shareLinks.delete(shareId);
            }
        }
        await this.cleanupSessionFiles(sessionId);
        return true;
    }
    async getCacheInfo(sessionId) {
        let cacheEntry = this.cache.get(sessionId);
        if (!cacheEntry) {
            const diskEntry = await this.loadFromDisk(sessionId);
            if (diskEntry) {
                cacheEntry = diskEntry;
            }
            else {
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
    cleanupExpiredEntries() {
        const now = new Date();
        for (const [sessionId, entry] of this.cache.entries()) {
            if (this.isExpired(entry)) {
                this.cache.delete(sessionId);
                this.removeFromDisk(sessionId).catch(console.error);
            }
        }
        for (const [shareId, shareLink] of this.shareLinks.entries()) {
            if (shareLink.expiresAt < now) {
                this.shareLinks.delete(shareId);
            }
        }
    }
    startCleanupInterval() {
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredEntries();
        }, 60 * 60 * 1000);
    }
    stopCleanupInterval() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }
    }
    isExpired(entry) {
        return entry.expiresAt < new Date();
    }
    evictOldestEntry() {
        let oldestSessionId = null;
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
    getStageFromStatus(status) {
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
    async persistToDisk(sessionId, entry) {
        try {
            const cacheDir = path_1.default.join(process.cwd(), 'cache');
            await promises_1.default.mkdir(cacheDir, { recursive: true });
            const filePath = path_1.default.join(cacheDir, `${sessionId}.json`);
            await promises_1.default.writeFile(filePath, JSON.stringify({
                ...entry,
                createdAt: entry.createdAt.toISOString(),
                lastAccessed: entry.lastAccessed.toISOString(),
                expiresAt: entry.expiresAt.toISOString()
            }));
        }
        catch (error) {
            console.error(`Failed to persist cache entry for session ${sessionId}:`, error);
        }
    }
    async loadFromDisk(sessionId) {
        try {
            const filePath = path_1.default.join(process.cwd(), 'cache', `${sessionId}.json`);
            const data = await promises_1.default.readFile(filePath, 'utf-8');
            const parsed = JSON.parse(data);
            return {
                ...parsed,
                createdAt: new Date(parsed.createdAt),
                lastAccessed: new Date(parsed.lastAccessed),
                expiresAt: new Date(parsed.expiresAt)
            };
        }
        catch (error) {
            return null;
        }
    }
    async removeFromDisk(sessionId) {
        try {
            const filePath = path_1.default.join(process.cwd(), 'cache', `${sessionId}.json`);
            await promises_1.default.unlink(filePath);
        }
        catch (error) {
        }
    }
    async cleanupSessionFiles(sessionId) {
        try {
            const sessionDir = path_1.default.join(process.cwd(), 'uploads', sessionId);
            await promises_1.default.rm(sessionDir, { recursive: true, force: true });
        }
        catch (error) {
            console.error(`Failed to cleanup files for session ${sessionId}:`, error);
        }
    }
}
exports.ResultsManager = ResultsManager;
//# sourceMappingURL=ResultsManager.js.map