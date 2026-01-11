import { prisma } from '../client';
import { InventoryItem, InventoryStatus, Prisma } from '@prisma/client';

export class InventoryRepository {
    async findAvailable(productId: string, quantity: number): Promise<InventoryItem[]> {
        return prisma.inventoryItem.findMany({
            where: {
                productId,
                status: InventoryStatus.AVAILABLE,
            },
            take: quantity,
        });
    }

    async reserve(
        itemIds: string[],
        reservedUntil: Date
    ): Promise<Prisma.BatchPayload> {
        return prisma.inventoryItem.updateMany({
            where: {
                id: { in: itemIds },
                status: InventoryStatus.AVAILABLE,
            },
            data: {
                status: InventoryStatus.RESERVED,
                reservedUntil,
            },
        });
    }

    async markAsSold(itemIds: string[], orderId: string): Promise<Prisma.BatchPayload> {
        return prisma.inventoryItem.updateMany({
            where: {
                id: { in: itemIds },
                status: InventoryStatus.RESERVED,
            },
            data: {
                status: InventoryStatus.SOLD,
                orderId,
            },
        });
    }

    async release(itemIds: string[]): Promise<Prisma.BatchPayload> {
        return prisma.inventoryItem.updateMany({
            where: {
                id: { in: itemIds },
            },
            data: {
                status: InventoryStatus.AVAILABLE,
                reservedUntil: null,
                orderId: null,
            },
        });
    }

    async updateOrderId(itemIds: string[], orderId: string): Promise<Prisma.BatchPayload> {
        return prisma.inventoryItem.updateMany({
            where: {
                id: { in: itemIds },
                status: InventoryStatus.RESERVED,
            },
            data: {
                orderId,
            },
        });
    }

    async findByOrder(orderId: string): Promise<InventoryItem[]> {
        return prisma.inventoryItem.findMany({
            where: { orderId },
        });
    }

    async findReservedByProduct(productId: string, reservedUntil: Date): Promise<InventoryItem[]> {
        return prisma.inventoryItem.findMany({
            where: {
                productId,
                status: InventoryStatus.RESERVED,
                reservedUntil,
            },
        });
    }

    async countAvailable(productId: string): Promise<number> {
        return prisma.inventoryItem.count({
            where: {
                productId,
                status: InventoryStatus.AVAILABLE,
            },
        });
    }
}

export const inventoryRepository = new InventoryRepository();
