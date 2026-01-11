import { OrderStatus, ProductType } from '@prisma/client';
import { orderRepository } from '../db/repositories/order.repository';
import { productRepository, variantRepository } from '../db/repositories/product.repository';
import { inventoryRepository } from '../db/repositories/inventory.repository';
import { config } from '../shared/config';
import { logger } from '../shared/logger';
import { generatePaymentRef, calculateExpiryDate } from '../shared/utils';
import { nanoid } from 'nanoid';

export interface CreateOrderParams {
    userId: bigint;
    username?: string;
    productCode: string;
    variantCode?: string;
    quantity: number;
    metadata?: Record<string, unknown>;
}

export interface OrderWithDetails {
    id: string;
    userId: bigint;
    username: string | null;
    productName: string;
    variantName?: string;
    quantity: number;
    unitPriceVnd: number;
    totalVnd: number;
    status: OrderStatus;
    paymentRef: string;
    expiresAt: Date | null;
    metadata?: Record<string, unknown>;
    createdAt: Date;
}

export class OrderService {
    async createOrder(params: CreateOrderParams): Promise<OrderWithDetails> {
        const { userId, username, productCode, variantCode, quantity, metadata } = params;

        // Check if user has active order
        const hasActive = await orderRepository.hasActiveOrder(userId);
        if (hasActive) {
            throw new Error('USER_HAS_ACTIVE_ORDER');
        }

        // Get product
        const product = await productRepository.findByCode(productCode);
        if (!product) {
            throw new Error('PRODUCT_NOT_FOUND');
        }

        let variant = null;
        let unitPrice = 0;

        if (variantCode) {
            variant = await variantRepository.findByCode(variantCode);
            if (!variant || variant.productId !== product.id) {
                throw new Error('VARIANT_NOT_FOUND');
            }
            unitPrice = variant.priceVnd;
        }

        const totalVnd = unitPrice * quantity;
        const orderId = nanoid();
        const paymentRef = generatePaymentRef(orderId);
        const expiresAt = calculateExpiryDate(config.app.orderExpireMinutes);

        // For DIGITAL_GOOD, reserve inventory
        let reservedItemIds: string[] = [];
        if (product.type === ProductType.DIGITAL_GOOD) {
            const availableItems = await inventoryRepository.findAvailable(product.id, quantity);

            if (availableItems.length < quantity) {
                throw new Error('INSUFFICIENT_INVENTORY');
            }

            reservedItemIds = availableItems.map((item) => item.id);
            await inventoryRepository.reserve(reservedItemIds, expiresAt);
        }

        try {
            const order = await orderRepository.create({
                id: orderId,
                userId,
                username: username || null,
                product: { connect: { id: product.id } },
                variant: variant ? { connect: { id: variant.id } } : undefined,
                quantity,
                unitPriceVnd: unitPrice,
                totalVnd,
                metadata: (metadata || {}) as any,
                status: OrderStatus.PENDING_PAYMENT,
                paymentRef,
                expiresAt,
            });

            logger.info({ orderId: order.id, userId, productCode }, 'Order created');

            return {
                id: order.id,
                userId: order.userId,
                username: order.username,
                productName: product.name,
                variantName: variant?.name,
                quantity: order.quantity,
                unitPriceVnd: order.unitPriceVnd,
                totalVnd: order.totalVnd,
                status: order.status,
                paymentRef: order.paymentRef,
                expiresAt: order.expiresAt,
                metadata: metadata,
                createdAt: order.createdAt,
            };
        } catch (error) {
            // Rollback inventory reservation on error
            if (reservedItemIds.length > 0) {
                await inventoryRepository.release(reservedItemIds);
            }
            throw error;
        }
    }

    async getOrder(orderId: string): Promise<OrderWithDetails | null> {
        const order = await orderRepository.findById(orderId);
        if (!order) return null;

        // Type assertion: findById includes product and variant
        type OrderWithRelations = typeof order & {
            product: { name: string };
            variant?: { name: string } | null;
        };
        const typedOrder = order as OrderWithRelations;

        return {
            id: typedOrder.id,
            userId: typedOrder.userId,
            username: typedOrder.username,
            productName: typedOrder.product.name,
            variantName: typedOrder.variant?.name,
            quantity: typedOrder.quantity,
            unitPriceVnd: typedOrder.unitPriceVnd,
            totalVnd: typedOrder.totalVnd,
            status: typedOrder.status,
            paymentRef: typedOrder.paymentRef,
            expiresAt: typedOrder.expiresAt,
            metadata: typedOrder.metadata as Record<string, unknown>,
            createdAt: typedOrder.createdAt,
        };
    }

    async getActiveOrder(userId: bigint): Promise<OrderWithDetails | null> {
        const order = await orderRepository.findActiveByUser(userId);
        if (!order) return null;

        // Type assertion: findActiveByUser includes product and variant
        type OrderWithRelations = typeof order & {
            product: { name: string };
            variant?: { name: string } | null;
        };
        const typedOrder = order as OrderWithRelations;

        return {
            id: typedOrder.id,
            userId: typedOrder.userId,
            username: typedOrder.username,
            productName: typedOrder.product.name,
            variantName: typedOrder.variant?.name,
            quantity: typedOrder.quantity,
            unitPriceVnd: typedOrder.unitPriceVnd,
            totalVnd: typedOrder.totalVnd,
            status: typedOrder.status,
            paymentRef: typedOrder.paymentRef,
            expiresAt: typedOrder.expiresAt,
            metadata: typedOrder.metadata as Record<string, unknown>,
            createdAt: typedOrder.createdAt,
        };
    }

    async cancelOrder(orderId: string): Promise<void> {
        const order = await orderRepository.findById(orderId);
        if (!order) {
            throw new Error('ORDER_NOT_FOUND');
        }

        if (order.status !== OrderStatus.PENDING_PAYMENT && order.status !== OrderStatus.DRAFT) {
            logger.warn({ orderId, currentStatus: order.status }, 'Cannot cancel order - invalid status');
            throw new Error(`ORDER_CANNOT_BE_CANCELLED:${order.status}`);
        }

        // Release inventory if reserved
        if (order.product.type === ProductType.DIGITAL_GOOD) {
            const items = await inventoryRepository.findByOrder(orderId);
            if (items.length > 0) {
                await inventoryRepository.release(items.map((i) => i.id));
            }
        }

        await orderRepository.updateStatus(orderId, OrderStatus.CANCELLED);
        logger.info({ orderId }, 'Order cancelled');
    }

    async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
        await orderRepository.updateStatus(orderId, status);
        logger.info({ orderId, status }, 'Order status updated');
    }

    async processExpiredOrders(): Promise<number> {
        const expiredOrders = await orderRepository.findExpired();

        // Type assertion: findExpired includes product and inventoryItems
        type ExpiredOrderWithRelations = typeof expiredOrders[0] & {
            product: { type: ProductType };
            inventoryItems: Array<{ id: string }>;
        };

        for (const order of expiredOrders) {
            try {
                const typedOrder = order as ExpiredOrderWithRelations;
                // Release inventory if needed
                if (typedOrder.product.type === ProductType.DIGITAL_GOOD && typedOrder.inventoryItems.length > 0) {
                    await inventoryRepository.release(typedOrder.inventoryItems.map((i) => i.id));
                }

                await orderRepository.updateStatus(order.id, OrderStatus.EXPIRED);
                logger.info({ orderId: order.id }, 'Order expired');
            } catch (error) {
                logger.error({ orderId: order.id, error }, 'Failed to expire order');
            }
        }

        return expiredOrders.length;
    }
}

export const orderService = new OrderService();
