"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuItemRepository = void 0;
class MenuItemRepository {
    constructor() {
        this.menuItems = new Map();
        this.sessionIndex = new Map();
        this.statusIndex = new Map();
        this.categoryIndex = new Map();
    }
    async createMany(sessionId, items) {
        const menuItemModels = items.map(item => ({
            ...item,
            sessionId,
            generationStatus: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
        }));
        for (const item of menuItemModels) {
            this.menuItems.set(item.id, item);
            this.updateIndexes(item);
        }
        return menuItemModels;
    }
    async findBySessionId(sessionId) {
        const itemIds = this.sessionIndex.get(sessionId) || new Set();
        const items = [];
        for (const id of itemIds) {
            const item = this.menuItems.get(id);
            if (item) {
                items.push(item);
            }
        }
        return items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }
    async findById(id) {
        return this.menuItems.get(id) || null;
    }
    async update(id, updates) {
        const item = this.menuItems.get(id);
        if (!item) {
            return null;
        }
        this.removeFromIndexes(item);
        const updatedItem = {
            ...item,
            ...updates,
            updatedAt: new Date()
        };
        this.menuItems.set(id, updatedItem);
        this.updateIndexes(updatedItem);
        return updatedItem;
    }
    async updateGenerationStatus(id, status, imageUrl) {
        const updates = {
            generationStatus: status
        };
        if (imageUrl) {
            updates.generatedImageUrl = imageUrl;
        }
        return this.update(id, updates);
    }
    async deleteBySessionId(sessionId) {
        const itemIds = this.sessionIndex.get(sessionId) || new Set();
        let deletedCount = 0;
        for (const id of itemIds) {
            const item = this.menuItems.get(id);
            if (item) {
                this.removeFromIndexes(item);
                this.menuItems.delete(id);
                deletedCount++;
            }
        }
        this.sessionIndex.delete(sessionId);
        return deletedCount;
    }
    async findPendingGeneration() {
        const itemIds = this.statusIndex.get('pending') || new Set();
        const items = [];
        for (const id of itemIds) {
            const item = this.menuItems.get(id);
            if (item) {
                items.push(item);
            }
        }
        return items;
    }
    async findByGenerationStatus(status) {
        const itemIds = this.statusIndex.get(status) || new Set();
        const items = [];
        for (const id of itemIds) {
            const item = this.menuItems.get(id);
            if (item) {
                items.push(item);
            }
        }
        return items;
    }
    async findByCategory(category) {
        const itemIds = this.categoryIndex.get(category) || new Set();
        const items = [];
        for (const id of itemIds) {
            const item = this.menuItems.get(id);
            if (item) {
                items.push(item);
            }
        }
        return items;
    }
    async cleanup() {
        const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
        let deletedCount = 0;
        const itemsToDelete = [];
        for (const [id, item] of this.menuItems.entries()) {
            if (item.createdAt < cutoffTime) {
                itemsToDelete.push(id);
            }
        }
        for (const id of itemsToDelete) {
            const item = this.menuItems.get(id);
            if (item) {
                this.removeFromIndexes(item);
                this.menuItems.delete(id);
                deletedCount++;
            }
        }
        return deletedCount;
    }
    updateIndexes(item) {
        if (!this.sessionIndex.has(item.sessionId)) {
            this.sessionIndex.set(item.sessionId, new Set());
        }
        this.sessionIndex.get(item.sessionId).add(item.id);
        if (!this.statusIndex.has(item.generationStatus)) {
            this.statusIndex.set(item.generationStatus, new Set());
        }
        this.statusIndex.get(item.generationStatus).add(item.id);
        if (item.category) {
            if (!this.categoryIndex.has(item.category)) {
                this.categoryIndex.set(item.category, new Set());
            }
            this.categoryIndex.get(item.category).add(item.id);
        }
    }
    removeFromIndexes(item) {
        const sessionSet = this.sessionIndex.get(item.sessionId);
        if (sessionSet) {
            sessionSet.delete(item.id);
            if (sessionSet.size === 0) {
                this.sessionIndex.delete(item.sessionId);
            }
        }
        const statusSet = this.statusIndex.get(item.generationStatus);
        if (statusSet) {
            statusSet.delete(item.id);
            if (statusSet.size === 0) {
                this.statusIndex.delete(item.generationStatus);
            }
        }
        if (item.category) {
            const categorySet = this.categoryIndex.get(item.category);
            if (categorySet) {
                categorySet.delete(item.id);
                if (categorySet.size === 0) {
                    this.categoryIndex.delete(item.category);
                }
            }
        }
    }
}
exports.MenuItemRepository = MenuItemRepository;
//# sourceMappingURL=MenuItemModel.js.map