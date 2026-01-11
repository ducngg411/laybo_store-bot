import { prisma } from '../client';
import { PaymentEvent, Prisma } from '@prisma/client';

export class PaymentEventRepository {
    async create(data: Prisma.PaymentEventCreateInput): Promise<PaymentEvent> {
        return prisma.paymentEvent.create({ data });
    }

    async findByEventKey(eventKey: string): Promise<PaymentEvent | null> {
        return prisma.paymentEvent.findUnique({
            where: { eventKey },
        });
    }

    async createIfNotExists(
        data: Prisma.PaymentEventCreateInput
    ): Promise<{ created: boolean; event: PaymentEvent | null }> {
        try {
            const event = await this.create(data);
            return { created: true, event };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                // Unique constraint violation - event already exists
                const existing = await this.findByEventKey(data.eventKey as string);
                return { created: false, event: existing };
            }
            throw error;
        }
    }
}

export const paymentEventRepository = new PaymentEventRepository();
