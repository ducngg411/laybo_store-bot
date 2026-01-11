import { connectDatabase } from './db/client';
import { createBot, startBot } from './bot';
import { createServer, startServer } from './server';
import { OrderExpiryJob } from './jobs/order-expiry.job';
import { logger } from './shared/logger';

async function main() {
    try {
        logger.info('🚀 Starting LayBo Store Bot...');

        // Connect to database
        await connectDatabase();

        // Create and start bot
        logger.info('Creating bot...');
        const bot = createBot();

        logger.info('Starting bot...');
        await startBot(bot);

        // Create and start server
        logger.info('Creating server...');
        const server = createServer(bot);

        logger.info('Starting server...');
        await startServer(server);

        // Start background jobs
        logger.info('Starting background jobs...');
        const expiryJob = new OrderExpiryJob(bot);
        expiryJob.start();

        logger.info('✅ Application started successfully');

        // Graceful shutdown
        const shutdown = async () => {
            logger.info('🛑 Shutting down...');
            expiryJob.stop();
            await server.close();
            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    } catch (error) {
        logger.error({ error }, '❌ Failed to start application');
        process.exit(1);
    }
}

main();
