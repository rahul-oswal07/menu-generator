import { MenuItemRepository } from './models/MenuItemModel';

// Singleton instance of MenuItemRepository
export const menuItemRepository = new MenuItemRepository();

import { SessionRepository } from './models/Session';

// Singleton instance of SessionRepository
export const sessionRepositoryInstance = new SessionRepository();
