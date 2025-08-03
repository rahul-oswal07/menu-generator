"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionPool = void 0;
const events_1 = require("events");
class ConnectionPool extends events_1.EventEmitter {
    constructor(createConnection, destroyConnection, validateConnection, options = {}) {
        super();
        this.connections = new Map();
        this.waitingQueue = [];
        this.createConnection = createConnection;
        this.destroyConnection = destroyConnection;
        this.validateConnection = validateConnection;
        this.options = {
            maxConnections: 10,
            minConnections: 2,
            acquireTimeoutMs: 30000,
            idleTimeoutMs: 300000,
            maxRetries: 3,
            ...options
        };
        this.initializePool();
        this.startCleanup();
    }
    async acquire() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                const index = this.waitingQueue.findIndex(item => item.resolve === resolve);
                if (index !== -1) {
                    this.waitingQueue.splice(index, 1);
                }
                reject(new Error('Connection acquire timeout'));
            }, this.options.acquireTimeoutMs);
            const attemptAcquire = async () => {
                try {
                    const availableConnection = this.findAvailableConnection();
                    if (availableConnection) {
                        clearTimeout(timeout);
                        availableConnection.inUse = true;
                        availableConnection.lastUsed = new Date();
                        resolve(availableConnection.connection);
                        return;
                    }
                    if (this.connections.size < this.options.maxConnections) {
                        const connection = await this.createNewConnection();
                        if (connection) {
                            clearTimeout(timeout);
                            resolve(connection.connection);
                            return;
                        }
                    }
                    this.waitingQueue.push({
                        resolve,
                        reject,
                        timestamp: Date.now()
                    });
                }
                catch (error) {
                    clearTimeout(timeout);
                    reject(error);
                }
            };
            attemptAcquire();
        });
    }
    async release(connection) {
        const pooledConnection = this.findPooledConnection(connection);
        if (!pooledConnection) {
            try {
                await this.destroyConnection(connection);
            }
            catch (error) {
                console.error('Error destroying unknown connection:', error);
            }
            return;
        }
        pooledConnection.inUse = false;
        pooledConnection.lastUsed = new Date();
        if (this.waitingQueue.length > 0) {
            const waiter = this.waitingQueue.shift();
            if (waiter) {
                pooledConnection.inUse = true;
                waiter.resolve(connection);
            }
        }
        this.emit('connectionReleased', { connectionId: pooledConnection.id });
    }
    async execute(fn) {
        const connection = await this.acquire();
        try {
            return await fn(connection);
        }
        finally {
            await this.release(connection);
        }
    }
    getStats() {
        const totalConnections = this.connections.size;
        const inUseConnections = Array.from(this.connections.values())
            .filter(conn => conn.inUse).length;
        const availableConnections = totalConnections - inUseConnections;
        const waitingRequests = this.waitingQueue.length;
        return {
            totalConnections,
            inUseConnections,
            availableConnections,
            waitingRequests,
            maxConnections: this.options.maxConnections,
            minConnections: this.options.minConnections
        };
    }
    async close() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        for (const waiter of this.waitingQueue) {
            waiter.reject(new Error('Connection pool is closing'));
        }
        this.waitingQueue.length = 0;
        const closePromises = Array.from(this.connections.values()).map(async (pooledConnection) => {
            try {
                await this.destroyConnection(pooledConnection.connection);
            }
            catch (error) {
                console.error('Error closing connection:', error);
            }
        });
        await Promise.all(closePromises);
        this.connections.clear();
        this.emit('poolClosed');
    }
    async initializePool() {
        const initPromises = Array(this.options.minConnections).fill(null).map(() => this.createNewConnection());
        try {
            await Promise.all(initPromises);
        }
        catch (error) {
            console.error('Error initializing connection pool:', error);
        }
    }
    findAvailableConnection() {
        for (const connection of this.connections.values()) {
            if (!connection.inUse) {
                return connection;
            }
        }
        return null;
    }
    findPooledConnection(connection) {
        for (const pooledConnection of this.connections.values()) {
            if (pooledConnection.connection === connection) {
                return pooledConnection;
            }
        }
        return null;
    }
    async createNewConnection() {
        try {
            const connection = await this.createConnection();
            const pooledConnection = {
                connection,
                id: this.generateConnectionId(),
                createdAt: new Date(),
                lastUsed: new Date(),
                inUse: true
            };
            this.connections.set(pooledConnection.id, pooledConnection);
            this.emit('connectionCreated', { connectionId: pooledConnection.id });
            return pooledConnection;
        }
        catch (error) {
            console.error('Error creating new connection:', error);
            return null;
        }
    }
    startCleanup() {
        this.cleanupInterval = setInterval(() => {
            this.cleanupIdleConnections();
        }, 60000);
    }
    async cleanupIdleConnections() {
        const now = new Date();
        const connectionsToRemove = [];
        for (const [id, connection] of this.connections.entries()) {
            if (connection.inUse) {
                continue;
            }
            if (this.connections.size <= this.options.minConnections) {
                break;
            }
            const idleTime = now.getTime() - connection.lastUsed.getTime();
            const isIdle = idleTime > this.options.idleTimeoutMs;
            let isValid = true;
            if (isIdle) {
                try {
                    isValid = await this.validateConnection(connection.connection);
                }
                catch (error) {
                    isValid = false;
                }
            }
            if (isIdle || !isValid) {
                connectionsToRemove.push(id);
            }
        }
        for (const id of connectionsToRemove) {
            const connection = this.connections.get(id);
            if (connection) {
                try {
                    await this.destroyConnection(connection.connection);
                    this.connections.delete(id);
                    this.emit('connectionDestroyed', { connectionId: id, reason: 'idle' });
                }
                catch (error) {
                    console.error('Error destroying idle connection:', error);
                }
            }
        }
    }
    generateConnectionId() {
        return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.ConnectionPool = ConnectionPool;
exports.default = ConnectionPool;
//# sourceMappingURL=connectionPool.js.map