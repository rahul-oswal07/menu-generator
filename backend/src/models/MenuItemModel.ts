import { MenuItem } from '../types';

export interface MenuItemModel extends MenuItem {
  sessionId: string;
  generatedImageUrl?: string;
  generationStatus: 'pending' | 'generating' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export class MenuItemRepository {
  private menuItems: Map<string, MenuItemModel> = new Map();
  private sessionIndex: Map<string, Set<string>> = new Map(); // sessionId -> item IDs
  private statusIndex: Map<MenuItemModel['generationStatus'], Set<string>> = new Map();
  private categoryIndex: Map<string, Set<string>> = new Map(); // category -> item IDs

  /**
   * Create menu items for a session
   */
  async createMany(
    sessionId: string,
    items: MenuItem[]
  ): Promise<MenuItemModel[]> {
    const menuItemModels: MenuItemModel[] = items.map(item => ({
      ...item,
      sessionId,
      generationStatus: 'pending' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    for (const item of menuItemModels) {
      this.menuItems.set(item.id, item);
      this.updateIndexes(item);
    }

    return menuItemModels;
  }

  /**
   * Find menu items by session ID (optimized with index)
   */
  async findBySessionId(sessionId: string): Promise<MenuItemModel[]> {
    const itemIds = this.sessionIndex.get(sessionId) || new Set();
    const items: MenuItemModel[] = [];
    
    for (const id of itemIds) {
      const item = this.menuItems.get(id);
      if (item) {
        items.push(item);
      }
    }

    return items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Find menu item by ID
   */
  async findById(id: string): Promise<MenuItemModel | null> {
    return this.menuItems.get(id) || null;
  }

  /**
   * Update menu item
   */
  async update(
    id: string,
    updates: Partial<Omit<MenuItemModel, 'id' | 'sessionId' | 'createdAt'>>
  ): Promise<MenuItemModel | null> {
    const item = this.menuItems.get(id);
    if (!item) {
      return null;
    }

    // Remove from old indexes
    this.removeFromIndexes(item);

    const updatedItem: MenuItemModel = {
      ...item,
      ...updates,
      updatedAt: new Date()
    };

    this.menuItems.set(id, updatedItem);
    
    // Update indexes
    this.updateIndexes(updatedItem);
    
    return updatedItem;
  }

  /**
   * Update generation status
   */
  async updateGenerationStatus(
    id: string,
    status: MenuItemModel['generationStatus'],
    imageUrl?: string
  ): Promise<MenuItemModel | null> {
    const updates: Partial<MenuItemModel> = {
      generationStatus: status
    };

    if (imageUrl) {
      updates.generatedImageUrl = imageUrl;
    }

    return this.update(id, updates);
  }

  /**
   * Delete menu items by session ID (optimized with index)
   */
  async deleteBySessionId(sessionId: string): Promise<number> {
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

    // Remove session from index
    this.sessionIndex.delete(sessionId);
    
    return deletedCount;
  }

  /**
   * Get items pending image generation (optimized with index)
   */
  async findPendingGeneration(): Promise<MenuItemModel[]> {
    const itemIds = this.statusIndex.get('pending') || new Set();
    const items: MenuItemModel[] = [];
    
    for (const id of itemIds) {
      const item = this.menuItems.get(id);
      if (item) {
        items.push(item);
      }
    }

    return items;
  }

  /**
   * Find items by generation status (optimized with index)
   */
  async findByGenerationStatus(status: MenuItemModel['generationStatus']): Promise<MenuItemModel[]> {
    const itemIds = this.statusIndex.get(status) || new Set();
    const items: MenuItemModel[] = [];
    
    for (const id of itemIds) {
      const item = this.menuItems.get(id);
      if (item) {
        items.push(item);
      }
    }

    return items;
  }

  /**
   * Find items by category (optimized with index)
   */
  async findByCategory(category: string): Promise<MenuItemModel[]> {
    const itemIds = this.categoryIndex.get(category) || new Set();
    const items: MenuItemModel[] = [];
    
    for (const id of itemIds) {
      const item = this.menuItems.get(id);
      if (item) {
        items.push(item);
      }
    }

    return items;
  }

  /**
   * Clean up old menu items (older than 24 hours)
   */
  async cleanup(): Promise<number> {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    let deletedCount = 0;

    const itemsToDelete: string[] = [];
    
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

  /**
   * Update indexes when creating or updating an item
   */
  private updateIndexes(item: MenuItemModel): void {
    // Update session index
    if (!this.sessionIndex.has(item.sessionId)) {
      this.sessionIndex.set(item.sessionId, new Set());
    }
    this.sessionIndex.get(item.sessionId)!.add(item.id);
    
    // Update status index
    if (!this.statusIndex.has(item.generationStatus)) {
      this.statusIndex.set(item.generationStatus, new Set());
    }
    this.statusIndex.get(item.generationStatus)!.add(item.id);
    
    // Update category index
    if (item.category) {
      if (!this.categoryIndex.has(item.category)) {
        this.categoryIndex.set(item.category, new Set());
      }
      this.categoryIndex.get(item.category)!.add(item.id);
    }
  }

  /**
   * Remove item from all indexes
   */
  private removeFromIndexes(item: MenuItemModel): void {
    // Remove from session index
    const sessionSet = this.sessionIndex.get(item.sessionId);
    if (sessionSet) {
      sessionSet.delete(item.id);
      if (sessionSet.size === 0) {
        this.sessionIndex.delete(item.sessionId);
      }
    }
    
    // Remove from status index
    const statusSet = this.statusIndex.get(item.generationStatus);
    if (statusSet) {
      statusSet.delete(item.id);
      if (statusSet.size === 0) {
        this.statusIndex.delete(item.generationStatus);
      }
    }
    
    // Remove from category index
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