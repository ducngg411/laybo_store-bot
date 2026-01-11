import { prisma } from '../client';
import { Order, OrderStatus, Prisma } from '@prisma/client';
import { ACTIVE_ORDER_STATUSES } from '../../shared/constants';

export class OrderRepository {
    async create(data: Prisma.OrderCreateInput): Promise<Order> {
        return prisma.order.create({ data });
    }

    async findById(id: string): Promise<Order | null> {
        return prisma.order.findUnique({
            where: { id },
            include: {
                product: true,
                variant: true,
            },
        });
    }

    async findByPaymentRef(paymentRef: string): Promise<Order | null> {
        return prisma.order.findUnique({
            where: { paymentRef },
            include: {
                product: true,
                variant: true,
            },
        });
    }

    async findActiveByUser(userId: bigint): Promise<Order | null> {
        return prisma.order.findFirst({
            where: {
                userId,
                status: {
                    in: [...ACTIVE_ORDER_STATUSES],
                },
            },
            include: {
                product: true,
                variant: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async hasActiveOrder(userId: bigint): Promise<boolean> {
        const count = await prisma.order.count({
            where: {
                userId,
                status: {
                    in: [...ACTIVE_ORDER_STATUSES],
                },
            },
        });
        return count > 0;
    }

    async updateStatus(id: string, status: OrderStatus): Promise<Order> {
        return prisma.order.update({
            where: { id },
            data: { status },
        });
    }

    async update(id: string, data: Prisma.OrderUpdateInput): Promise<Order> {
        return prisma.order.update({
            where: { id },
            data,
        });
    }

    async findExpired(): Promise<Order[]> {
        return prisma.order.findMany({
            where: {
                status: OrderStatus.PENDING_PAYMENT,
                expiresAt: {
                    lt: new Date(),
                },
            },
            include: {
                product: true,
                inventoryItems: true,
            },
        });
    }
}

export const orderRepository = new OrderRepository();
