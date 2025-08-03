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

export class ConnectionPool<T> extends EventEmitter {
  private connections: Map<string, PooledConnection<T>> = new Map();
  private waitingQueue: Array<{
    resolve: (connection: T) => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];
  private options: ConnectionPoolOptions;
  private createConnection: () => Promise<T>;
  private destroyConnection: (connection: T) => Promise<void>;
  private validateConnection: (connection: T) => Promise<boolean>;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    createConnection: () => Promise<T>,
    destroyConnection: (connection: T) => Promise<void>,
    validateConnection: (connection: T) => Promise<boolean>,
    options: Partial<ConnectionPoolOptions> = {}
  ) {
    super();
    
    this.createConnection = createConnection;
    this.destroyConnection = destroyConnection;
    this.validateConnection = validateConnection;
    
    this.options = {
      maxConnections: 10,
      minConnections: 2,
      acquireTimeoutMs: 30000,
      idleTimeoutMs: 300000, // 5 minutes
      maxRetries: 3,
      ...options
    };

    // Initialize minimum connections
    this.initializePool();
    
    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire(): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        // Remove from waiting queue
        const index = this.waitingQueue.findIndex(item => item.resolve === resolve);
        if (index !== -1) {
          this.waitingQueue.splice(index, 1);
        }
        reject(new Error('Connection acquire timeout'));
      }, this.options.acquireTimeoutMs);

      const attemptAcquire = async () => {
        try {
          // Try to find an available connection
          const availableConnection = this.findAvailableConnection();
          if (availableConnection) {
            clearTimeout(timeout);
            availableConnection.inUse = true;
            availableConnection.lastUsed = new Date();
            resolve(availableConnection.connection);
            return;
          }

          // Try to create a new connection if under limit
          if (this.connections.size < this.options.maxConnections) {
            const connection = await this.createNewConnection();
            if (connection) {
              clearTimeout(timeout);
              resolve(connection.connection);
              return;
            }
          }

          // Add to waiting queue
          this.waitingQueue.push({
            resolve,
            reject,
            timestamp: Date.now()
          });
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      };

      attemptAcquire();
    });
  }

  /**
   * Release a connection back to the pool
   */
  async release(connection: T): Promise<void> {
    const pooledConnection = this.findPooledConnection(connection);
    if (!pooledConnection) {
      // Connection not from this pool, destroy it
      try {
        await this.destroyConnection(connection);
      } catch (error) {
        console.error('Error destroying unknown connection:', error);
      }
      return;
    }

    pooledConnection.inUse = false;
    pooledConnection.lastUsed = new Date();

    // Process waiting queue
    if (this.waitingQueue.length > 0) {
      const waiter = this.waitingQueue.shift();
      if (waiter) {
        pooledConnection.inUse = true;
        waiter.resolve(connection);
      }
    }

    this.emit('connectionReleased', { connectionId: pooledConnection.id });
  }

  /**
   * Execute a function with a pooled connection
   */
  async execute<R>(fn: (connection: T) => Promise<R>): Promise<R> {
    const connection = await this.acquire();
    try {
      return await fn(connection);
    } finally {
      await this.release(connection);
    }
  }

  /**
   * Get pool statistics
   */
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

  /**
   * Close all connections and clean up
   */
  async close(): Promise<void> {
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Reject all waiting requests
    for (const waiter of this.waitingQueue) {
      waiter.reject(new Error('Connection pool is closing'));
    }
    this.waitingQueue.length = 0;

    // Close all connections
    const closePromises = Array.from(this.connections.values()).map(async (pooledConnection) => {
      try {
        await this.destroyConnection(pooledConnection.connection);
      } catch (error) {
        console.error('Error closing connection:', error);
      }
    });

    await Promise.all(closePromises);
    this.connections.clear();

    this.emit('poolClosed');
  }

  /**
   * Initialize the pool with minimum connections
   */
  private async initializePool(): Promise<void> {
    const initPromises = Array(this.options.minConnections).fill(null).map(() => 
      this.createNewConnection()
    );

    try {
      await Promise.all(initPromises);
    } catch (error) {
      console.error('Error initializing connection pool:', error);
    }
  }

  /**
   * Find an available connection
   */
  private findAvailableConnection(): PooledConnection<T> | null {
    for (const connection of this.connections.values()) {
      if (!connection.inUse) {
        return connection;
      }
    }
    return null;
  }

  /**
   * Find a pooled connection by its actual connection object
   */
  private findPooledConnection(connection: T): PooledConnection<T> | null {
    for (const pooledConnection of this.connections.values()) {
      if (pooledConnection.connection === connection) {
        return pooledConnection;
      }
    }
    return null;
  }

  /**
   * Create a new connection and add it to the pool
   */
  private async createNewConnection(): Promise<PooledConnection<T> | null> {
    try {
      const connection = await this.createConnection();
      const pooledConnection: PooledConnection<T> = {
        connection,
        id: this.generateConnectionId(),
        createdAt: new Date(),
        lastUsed: new Date(),
        inUse: true
      };

      this.connections.set(pooledConnection.id, pooledConnection);
      this.emit('connectionCreated', { connectionId: pooledConnection.id });
      
      return pooledConnection;
    } catch (error) {
      console.error('Error creating new connection:', error);
      return null;
    }
  }

  /**
   * Start the cleanup interval
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
    }, 60000); // Run cleanup every minute
  }

  /**
   * Clean up idle connections
   */
  private async cleanupIdleConnections(): Promise<void> {
    const now = new Date();
    const connectionsToRemove: string[] = [];

    for (const [id, connection] of this.connections.entries()) {
      // Don't remove connections that are in use
      if (connection.inUse) {
        continue;
      }

      // Don't go below minimum connections
      if (this.connections.size <= this.options.minConnections) {
        break;
      }

      // Check if connection is idle for too long or invalid
      const idleTime = now.getTime() - connection.lastUsed.getTime();
      const isIdle = idleTime > this.options.idleTimeoutMs;
      
      // Validate connection if it's been idle for a while
      let isValid = true;
      if (isIdle) {
        try {
          isValid = await this.validateConnection(connection.connection);
        } catch (error) {
          isValid = false;
        }
      }
      
      if (isIdle || !isValid) {
        connectionsToRemove.push(id);
      }
    }

    // Remove idle or invalid connections
    for (const id of connectionsToRemove) {
      const connection = this.connections.get(id);
      if (connection) {
        try {
          await this.destroyConnection(connection.connection);
          this.connections.delete(id);
          this.emit('connectionDestroyed', { connectionId: id, reason: 'idle' });
        } catch (error) {
          console.error('Error destroying idle connection:', error);
        }
      }
    }
  }

  /**
   * Generate a unique connection ID
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default ConnectionPool;