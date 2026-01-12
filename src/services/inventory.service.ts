import { InventoryItem } from '@prisma/client';
import { inventoryRepository } from '../db/repositories/inventory.repository';

export interface InventoryItemPayload {
    username: string;
    password: string;
    expiryDate: string;
    [key: string]: unknown;
}

export class InventoryService {
    async checkAvailability(productId: string, quantity: number): Promise<boolean> {
        const count = await inventoryRepository.countAvailable(productId);
        return count >= quantity;
    }

    // ⭐ NEW: Get exact available count for stock display
    async getAvailableCount(productId: string): Promise<number> {
        return inventoryRepository.countAvailable(productId);
    }

    async getOrderItems(orderId: string): Promise<InventoryItem[]> {
        return inventoryRepository.findByOrder(orderId);
    }

    parseItemPayload(item: InventoryItem): InventoryItemPayload {
        return item.payload as InventoryItemPayload;
    }
}

export const inventoryService = new InventoryService();