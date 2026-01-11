import Fastify, { FastifyInstance } from 'fastify';
import { config } from '../shared/config';
import { logger } from '../shared/logger';
import { paymentService, SepayWebhookPayload } from '../services/payment.service';
import { orderRepository } from '../db/repositories/order.repository';
import { Telegraf } from 'telegraf';
import { notifyUserPaymentSuccess, notifyAdminNewOrder, deliverNetflixAccounts } from '../bot/handlers/order.handler';
import { ProductType } from '@prisma/client';

export function createServer(bot: Telegraf): FastifyInstance {
    const server = Fastify({
        logger: logger as any,
    });

    // Health check
    server.get('/health', async () => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // SePay webhook endpoint
    server.post('/webhooks/sepay', async (request, reply) => {
        try {
            const payload = request.body as SepayWebhookPayload;

            logger.info({ payload }, 'Received SePay webhook');

            // TODO: Validate signature/secret if SePay provides one
            if (config.sepay.webhookSecret) {
                // Example validation (adjust based on SePay docs):
                // const signature = request.headers['x-sepay-signature'];
                // if (!validateSignature(payload, signature, config.sepay.webhookSecret)) {
                //   logger.warn('Invalid webhook signature');
                //   return reply.code(401).send({ error: 'Invalid signature' });
                // }
            }

            // Validate required fields
            if (!payload.transferAmount) {
                logger.warn({ payload }, 'Missing transferAmount in webhook payload');
                return reply.code(400).send({ error: 'Missing transferAmount' });
            }

            // Validate transferType (must be 'in' for incoming payments)
            if (payload.transferType && payload.transferType !== 'in') {
                logger.warn({ transferType: payload.transferType }, 'Invalid transfer type');
                return reply.code(400).send({ error: 'Only incoming transfers are accepted' });
            }

            // Process payment
            const processed = await paymentService.processWebhook(payload);

            if (processed) {
                // Extract payment reference using same logic as payment service
                let paymentRef = payload.code?.trim() || null;

                if (!paymentRef && payload.content) {
                    const match = payload.content.match(/ORD[_]?[A-Z0-9]{7,}/);
                    paymentRef = match ? match[0] : null;
                }

                if (!paymentRef && payload.description) {
                    const match = payload.description.match(/ORD[_]?[A-Z0-9]{7,}/);
                    paymentRef = match ? match[0] : null;
                }

                if (paymentRef) {
                    const order = await orderRepository.findByPaymentRef(paymentRef);

                    if (order) {
                        logger.info({ orderId: order.id, paymentRef }, 'Order found for notification');

                        // Auto-deliver for DIGITAL_GOOD (Netflix accounts)
                        if (order.product.type === ProductType.DIGITAL_GOOD) {
                            logger.info({ orderId: order.id, productType: order.product.type }, 'Auto-delivering digital goods');
                            await deliverNetflixAccounts(bot, order.userId, order.id);
                        } else {
                            // For other types (SERVICE_SUBSCRIPTION), notify user to wait and admin for manual processing
                            await notifyUserPaymentSuccess(bot, order.userId, order.id);
                            const orderForAdmin = {
                                id: order.id,
                                userId: order.userId,
                                username: order.username,
                                productName: order.product?.name || 'Unknown',
                                variantName: order.variant?.name || undefined,
                                quantity: order.quantity,
                                totalVnd: order.totalVnd,
                                paymentRef: order.paymentRef,
                                metadata: order.metadata,
                                createdAt: order.createdAt,
                            };

                            await notifyAdminNewOrder(bot, orderForAdmin);
                        }
                    } else {
                        logger.warn({ paymentRef }, 'Order not found for notification');
                    }
                }
            }

            return reply.code(200).send({ success: processed });
        } catch (error) {
            logger.error({ error }, 'Error processing SePay webhook');
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });

    return server;
}

export async function startServer(server: FastifyInstance): Promise<void> {
    try {
        const port = config.app.port || 3000;
        await server.listen({ port, host: '0.0.0.0' });
        logger.info(`🚀 Server listening on port ${port}`);
    } catch (error) {
        logger.error({ error }, 'Failed to start server');
        throw error;
    }
}