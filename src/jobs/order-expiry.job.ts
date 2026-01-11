import { orderService } from '../services/order.service';
import { logger } from '../shared/logger';
import { Telegraf } from 'telegraf';

export class OrderExpiryJob {
    private intervalId?: NodeJS.Timeout;

    constructor(_bot: Telegraf) {
        // Bot parameter kept for future use
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
            const expiredCount = await orderService.processExpiredOrders();

            if (expiredCount > 0) {
                logger.info({ count: expiredCount }, 'Expired orders processed');

                // Note: We could notify users here, but it requires accessing
                // the expired order details before they're updated.
                // For simplicity, we'll skip user notification on expiry.
                // If needed, modify processExpiredOrders to return the orders
                // and notify users here.
            }
        } catch (error) {
            logger.error({ error }, 'Error in order expiry job');
        }
    }
}
