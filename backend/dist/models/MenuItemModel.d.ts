import { MenuItem } from '../types';
export interface MenuItemModel extends MenuItem {
    sessionId: string;
    generatedImageUrl?: string;
    generationStatus: 'pending' | 'generating' | 'completed' | 'failed';
    createdAt: Date;
    updatedAt: Date;
}
export declare class MenuItemRepository {
    private menuItems;
    private sessionIndex;
    private statusIndex;
    private categoryIndex;
    createMany(sessionId: string, items: MenuItem[]): Promise<MenuItemModel[]>;
    findBySessionId(sessionId: string): Promise<MenuItemModel[]>;
    findById(id: string): Promise<MenuItemModel | null>;
    update(id: string, updates: Partial<Omit<MenuItemModel, 'id' | 'sessionId' | 'createdAt'>>): Promise<MenuItemModel | null>;
    updateGenerationStatus(id: string, status: MenuItemModel['generationStatus'], imageUrl?: string): Promise<MenuItemModel | null>;
    deleteBySessionId(sessionId: string): Promise<number>;
    findPendingGeneration(): Promise<MenuItemModel[]>;
    findByGenerationStatus(status: MenuItemModel['generationStatus']): Promise<MenuItemModel[]>;
    findByCategory(category: string): Promise<MenuItemModel[]>;
    cleanup(): Promise<number>;
    private updateIndexes;
    private removeFromIndexes;
}
//# sourceMappingURL=MenuItemModel.d.ts.map