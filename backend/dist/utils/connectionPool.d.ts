import { EventEmitter } from 'events';
export interface ConnectionPoolOptions {
    maxConnections: number;
    minConnections: number;
    acquireTimeoutMs: number;
    idleTimeoutMs: number;
    maxRetries: number;
}
export interface PooledConnection<T> {
    connection: T;
    id: string;
    createdAt: Date;
    lastUsed: Date;
    inUse: boolean;
}
export declare class ConnectionPool<T> extends EventEmitter {
    private connections;
    private waitingQueue;
    private options;
    private createConnection;
    private destroyConnection;
    private validateConnection;
    private cleanupInterval?;
    constructor(createConnection: () => Promise<T>, destroyConnection: (connection: T) => Promise<void>, validateConnection: (connection: T) => Promise<boolean>, options?: Partial<ConnectionPoolOptions>);
    acquire(): Promise<T>;
    release(connection: T): Promise<void>;
    execute<R>(fn: (connection: T) => Promise<R>): Promise<R>;
    getStats(): {
        totalConnections: number;
        inUseConnections: number;
        availableConnections: number;
        waitingRequests: number;
        maxConnections: number;
        minConnections: number;
    };
    close(): Promise<void>;
    private initializePool;
    private findAvailableConnection;
    private findPooledConnection;
    private createNewConnection;
    private startCleanup;
    private cleanupIdleConnections;
    private generateConnectionId;
}
export default ConnectionPool;
//# sourceMappingURL=connectionPool.d.ts.map