import Fastify, { FastifyInstance } from 'fastify';
import { config } from '../shared/config';
import { logger } from '../shared/logger';
import { paymentService, SepayWebhookPayload } from '../services/payment.service';
import { orderService } from '../services/order.service';
import { Telegraf } from 'telegraf';
import { notifyUserPaymentSuccess, notifyAdminNewOrder } from '../bot/handlers/order.handler';

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
                // Extract payment reference from webhook (same logic as payment service)
                const content = payload.content || payload.description || '';
                const match = content.match(/ORD[A-Z0-9]{8,}/); // No underscore
                const paymentRef = payload.code || (match ? match[0] : null);

                if (paymentRef) {
                    const order = await orderService.getOrder(paymentRef);
                    if (order) {
                        // Notify user
                        await notifyUserPaymentSuccess(bot, order.userId, order.id);

                        // Notify admin
                        await notifyAdminNewOrder(bot, order);
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

