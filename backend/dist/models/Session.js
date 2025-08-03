"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionRepository = void 0;
class SessionRepository {
    constructor() {
        this.sessions = new Map();
        this.statusIndex = new Map();
        this.createdAtIndex = new Map();
    }
    async create(sessionData) {
        const session = {
            ...sessionData,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.sessions.set(session.id, session);
        this.updateIndexes(session);
        return session;
    }
    async findById(id) {
        return this.sessions.get(id) || null;
    }
    async updateStatus(id, status) {
        const session = this.sessions.get(id);
        if (!session) {
            return null;
        }
        this.removeFromStatusIndex(session.status, id);
        session.status = status;
        session.updatedAt = new Date();
        this.sessions.set(id, session);
        this.addToStatusIndex(status, id);
        return session;
    }
    async delete(id) {
        const session = this.sessions.get(id);
        if (session) {
            this.removeFromIndexes(session);
        }
        return this.sessions.delete(id);
    }
    async findByStatus(status) {
        const sessionIds = this.statusIndex.get(status) || new Set();
        const sessions = [];
        for (const id of sessionIds) {
            const session = this.sessions.get(id);
            if (session) {
                sessions.push(session);
            }
        }
        return sessions;
    }
    async findByDateRange(startDate, endDate) {
        const sessions = [];
        const endTime = endDate || new Date();
        for (const session of this.sessions.values()) {
            if (session.createdAt >= startDate && session.createdAt <= endTime) {
                sessions.push(session);
            }
        }
        return sessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    async cleanup() {
        const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
        let deletedCount = 0;
        const sessionsToDelete = [];
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
    updateIndexes(session) {
        this.addToStatusIndex(session.status, session.id);
        const dateKey = session.createdAt.toISOString().split('T')[0];
        if (!this.createdAtIndex.has(dateKey)) {
            this.createdAtIndex.set(dateKey, new Set());
        }
        this.createdAtIndex.get(dateKey).add(session.id);
    }
    removeFromIndexes(session) {
        this.removeFromStatusIndex(session.status, session.id);
        const dateKey = session.createdAt.toISOString().split('T')[0];
        const dateSet = this.createdAtIndex.get(dateKey);
        if (dateSet) {
            dateSet.delete(session.id);
            if (dateSet.size === 0) {
                this.createdAtIndex.delete(dateKey);
            }
        }
    }
    addToStatusIndex(status, sessionId) {
        if (!this.statusIndex.has(status)) {
            this.statusIndex.set(status, new Set());
        }
        this.statusIndex.get(status).add(sessionId);
    }
    removeFromStatusIndex(status, sessionId) {
        const statusSet = this.statusIndex.get(status);
        if (statusSet) {
            statusSet.delete(sessionId);
            if (statusSet.size === 0) {
                this.statusIndex.delete(status);
            }
        }
    }
}
exports.SessionRepository = SessionRepository;
//# sourceMappingURL=Session.js.map