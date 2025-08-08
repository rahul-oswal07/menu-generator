import { ProcessingStatus } from '../types';
export interface SessionModel {
  id: string;
  originalImageUrl: string;
  status: ProcessingStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class SessionRepository {
  private sessions: Map<string, SessionModel> = new Map();
  private statusIndex: Map<ProcessingStatus, Set<string>> = new Map();
  private createdAtIndex: Map<string, Set<string>> = new Map(); // Date string -> session IDs

  /**
   * Create a new session
   */
  async create(sessionData: Omit<SessionModel, 'createdAt' | 'updatedAt'>): Promise<SessionModel> {
    const session: SessionModel = {
      ...sessionData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.sessions.set(session.id, session);
    this.updateIndexes(session);
    return session;
  }

  /**
   * Find session by ID
   */
  async findById(id: string): Promise<SessionModel | null> {
    return this.sessions.get(id) || null;
  }

  /**
   * Update session status
   */
  async updateStatus(id: string, status: ProcessingStatus): Promise<SessionModel | null> {
    const session = this.sessions.get(id);
    if (!session) {
      return null;
    }

    // Remove from old status index
    this.removeFromStatusIndex(session.status, id);

    session.status = status;
    session.updatedAt = new Date();
    this.sessions.set(id, session);
    
    // Add to new status index
    this.addToStatusIndex(status, id);
    
    return session;
  }

  /**
   * Delete session
   */
  async delete(id: string): Promise<boolean> {
    const session = this.sessions.get(id);
    if (session) {
      this.removeFromIndexes(session);
    }
    return this.sessions.delete(id);
  }

  /**
   * Find sessions by status (optimized with index)
   */
  async findByStatus(status: ProcessingStatus): Promise<SessionModel[]> {
    const sessionIds = this.statusIndex.get(status) || new Set();
    const sessions: SessionModel[] = [];
    
    for (const id of sessionIds) {
      const session = this.sessions.get(id);
      if (session) {
        sessions.push(session);
      }
    }
    
    return sessions;
  }

  /**
   * Find sessions created after a specific date (optimized with index)
   */
  async findByDateRange(startDate: Date, endDate?: Date): Promise<SessionModel[]> {
    const sessions: SessionModel[] = [];
    const endTime = endDate || new Date();
    
    for (const session of this.sessions.values()) {
      if (session.createdAt >= startDate && session.createdAt <= endTime) {
        sessions.push(session);
      }
    }
    
    return sessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Clean up old sessions (older than 24 hours)
   */
  async cleanup(): Promise<number> {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    let deletedCount = 0;

    // Use date index for efficient cleanup
    const sessionsToDelete: string[] = [];
    
    for (const [id, session] of this.sessions.entries()) {
      if (session.createdAt < cutoffTime) {
        sessionsToDelete.push(id);
      }
    }

    for (const id of sessionsToDelete) {
      const session = this.sessions.get(id);
      if (session) {
        this.removeFromIndexes(session);
        this.sessions.delete(id);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Update indexes when creating or updating a session
   */
  private updateIndexes(session: SessionModel): void {
    // Update status index
    this.addToStatusIndex(session.status, session.id);
    
    // Update date index
    const dateKey = session.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
    if (!this.createdAtIndex.has(dateKey)) {
      this.createdAtIndex.set(dateKey, new Set());
    }
    this.createdAtIndex.get(dateKey)!.add(session.id);
  }

  /**
   * Remove session from all indexes
   */
  private removeFromIndexes(session: SessionModel): void {
    // Remove from status index
    this.removeFromStatusIndex(session.status, session.id);
    
    // Remove from date index
    const dateKey = session.createdAt.toISOString().split('T')[0];
    const dateSet = this.createdAtIndex.get(dateKey);
    if (dateSet) {
      dateSet.delete(session.id);
      if (dateSet.size === 0) {
        this.createdAtIndex.delete(dateKey);
      }
    }
  }

  /**
   * Add session to status index
   */
  private addToStatusIndex(status: ProcessingStatus, sessionId: string): void {
    if (!this.statusIndex.has(status)) {
      this.statusIndex.set(status, new Set());
    }
    this.statusIndex.get(status)!.add(sessionId);
  }

  /**
   * Remove session from status index
   */
  private removeFromStatusIndex(status: ProcessingStatus, sessionId: string): void {
    const statusSet = this.statusIndex.get(status);
    if (statusSet) {
      statusSet.delete(sessionId);
      if (statusSet.size === 0) {
        this.statusIndex.delete(status);
      }
    }
  }
}