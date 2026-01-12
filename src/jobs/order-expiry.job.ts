import { orderService } from '../services/order.service';
import { logger } from '../shared/logger';
import { Telegraf } from 'telegraf';
import { notifyUserOrderExpired } from '../bot/handlers/order.handler';

export class OrderExpiryJob {
    private intervalId?: NodeJS.Timeout;
    private bot: Telegraf;

    constructor(bot: Telegraf) {
        this.bot = bot;
    }

    start() {
        // Run every minute
        this.intervalId = setInterval(() => this.checkExpiredOrders(), 60 * 1000);
        logger.info('⏰ Order expiry job started (checking every 1 minute)');
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            logger.info('Order expiry job stopped');
        }
    }

    private async checkExpiredOrders() {
        try {
            logger.debug('Checking for expired orders...');

            // Get expired orders before updating them
            const expiredOrders = await orderService.getExpiredOrders();

            if (expiredOrders.length > 0) {
                logger.info({ count: expiredOrders.length }, 'Found expired orders to process');

                // Process each expired order
                for (const order of expiredOrders) {
                    try {
                        // Extract QR messageId from metadata
                        const metadata = order.metadata as any;
                        const qrMessageId = metadata?.qrMessageId;

                        logger.debug({
                            orderId: order.id,
                            userId: order.userId,
                            qrMessageId
                        }, 'Processing expired order notification');

                        // Notify user (edit message + send notification)
                        await notifyUserOrderExpired(
                            this.bot,
                            order.userId,
                            order.id,
                            qrMessageId
                        );
                    } catch (error) {
                        logger.error({
                            error,
                            orderId: order.id,
                            userId: order.userId
                        }, 'Failed to notify user about expired order');
                        // Continue with next order even if notification fails
                    }
                }
            }

            // Now mark all expired orders (this will update their status)
            const expiredCount = await orderService.processExpiredOrders();

            if (expiredCount > 0) {
                logger.info({ count: expiredCount }, 'Expired orders marked as EXPIRED');
            }
        } catch (error) {
            logger.error({ error }, 'Error in order expiry job');
        }
    }
}