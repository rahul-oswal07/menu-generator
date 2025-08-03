import { ProcessingResult, ProcessingStatusResponse } from '../types';
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
    url: string;
    createdAt: Date;
    expiresAt: Date;
}
export declare class ResultsManager {
    private cache;
    private shareLinks;
    private readonly CACHE_TTL;
    private readonly SHARE_LINK_TTL;
    private readonly MAX_CACHE_SIZE;
    private cleanupInterval?;
    constructor();
    saveResults(sessionId: string, results: ProcessingResult): Promise<void>;
    getResults(sessionId: string): Promise<ProcessingResult | null>;
    getProcessingStatus(sessionId: string): Promise<ProcessingStatusResponse | null>;
    updateProcessingStatus(sessionId: string, status: Partial<ProcessingStatusResponse>): Promise<boolean>;
    generateDownloadUrl(sessionId: string, menuItemId: string): Promise<string | null>;
    generateShareUrl(sessionId: string, menuItemId: string): Promise<string | null>;
    getShareLink(shareId: string): ShareLink | null;
    deleteSession(sessionId: string): Promise<boolean>;
    getCacheInfo(sessionId: string): Promise<CacheInfo | null>;
    private cleanupExpiredEntries;
    private startCleanupInterval;
    stopCleanupInterval(): void;
    private isExpired;
    private evictOldestEntry;
    private getStageFromStatus;
    private persistToDisk;
    private loadFromDisk;
    private removeFromDisk;
    private cleanupSessionFiles;
}
export {};
//# sourceMappingURL=ResultsManager.d.ts.map