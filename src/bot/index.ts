import { Telegraf } from 'telegraf';
import { config } from '../shared/config';
import { logger } from '../shared/logger';
import { CALLBACK_ACTIONS, BOT_COMMANDS } from '../shared/constants';

// Import handlers
import { handleStart, handleSupport } from './handlers/start.handler';
import {
    handleCanvaSelect,
    handleCanvaPlanSelect,
    handleCanvaQuantitySelect,
    handleCanvaQuantityCustom,
    handleCanvaEmailInput,
} from './handlers/canva.handler';
import {
    handleNetflixSelect,
    handleNetflixPlanSelect,
    handleNetflixQuantitySelect,
    handleNetflixQuantityCustom,
    handleNetflixQuantityInput,
} from './handlers/netflix.handler';
import {
    handleCancelOrder,
    handleViewQR,
    handleConfirmPayment,
    handleAdminInProgress,
    handleAdminFulfilled,
    handleAdminFailed,
} from './handlers/order.handler';

export function createBot(): Telegraf {
    const bot = new Telegraf(config.bot.token);

    // Commands
    bot.command(BOT_COMMANDS.START, handleStart);
    bot.command(BOT_COMMANDS.HELP, handleSupport);

    // Main menu callbacks
    bot.action(CALLBACK_ACTIONS.SELECT_CANVA, handleCanvaSelect);
    bot.action(CALLBACK_ACTIONS.SELECT_NETFLIX, handleNetflixSelect);
    bot.action(CALLBACK_ACTIONS.SUPPORT, handleSupport);

    // Canva flow callbacks
    bot.action(new RegExp(`^${CALLBACK_ACTIONS.CANVA_PLAN_PREFIX}(.+)$`), (ctx) => {
        const variantCode = ctx.match[1];
        return handleCanvaPlanSelect(ctx, variantCode);
    });

    bot.action(new RegExp(`^${CALLBACK_ACTIONS.CANVA_QTY_PREFIX}(\\d+)$`), (ctx) => {
        const quantity = parseInt(ctx.match[1], 10);
        return handleCanvaQuantitySelect(ctx, quantity);
    });

    bot.action(CALLBACK_ACTIONS.CANVA_QTY_CUSTOM, handleCanvaQuantityCustom);

    // Netflix flow callbacks
    bot.action(new RegExp(`^${CALLBACK_ACTIONS.NETFLIX_PLAN_PREFIX}(.+)$`), (ctx) => {
        const variantCode = ctx.match[1];
        return handleNetflixPlanSelect(ctx, variantCode);
    });

    bot.action(new RegExp(`^${CALLBACK_ACTIONS.NETFLIX_QTY_PREFIX}(\\d+)$`), (ctx) => {
        const quantity = parseInt(ctx.match[1], 10);
        return handleNetflixQuantitySelect(ctx, quantity);
    });

    bot.action(CALLBACK_ACTIONS.NETFLIX_QTY_CUSTOM, handleNetflixQuantityCustom);

    // Order actions
    bot.action(CALLBACK_ACTIONS.VIEW_QR, handleViewQR);
    bot.action(CALLBACK_ACTIONS.CANCEL_ORDER, handleCancelOrder);
    bot.action(CALLBACK_ACTIONS.CONFIRM_PAYMENT, handleConfirmPayment);

    // Admin callbacks
    bot.action(new RegExp(`^${CALLBACK_ACTIONS.ADMIN_IN_PROGRESS}(.+)$`), (ctx) => {
        const orderId = ctx.match[1];
        return handleAdminInProgress(ctx, orderId);
    });

    bot.action(new RegExp(`^${CALLBACK_ACTIONS.ADMIN_FULFILLED}(.+)$`), (ctx) => {
        const orderId = ctx.match[1];
        return handleAdminFulfilled(ctx, bot, orderId);
    });

    bot.action(new RegExp(`^${CALLBACK_ACTIONS.ADMIN_FAILED}(.+)$`), (ctx) => {
        const orderId = ctx.match[1];
        return handleAdminFailed(ctx, bot, orderId);
    });

    // Text message handler (for email input and custom quantity)
    bot.on('text', async (ctx) => {
        const text = ctx.message.text;

        // Try Canva email input
        await handleCanvaEmailInput(ctx, text);

        // Try Netflix quantity input
        await handleNetflixQuantityInput(ctx, text);
    });

    // Error handling
    bot.catch((err, ctx) => {
        logger.error({ error: err, update: ctx.update }, 'Bot error');
        ctx.reply('❌ Đã xảy ra lỗi. Vui lòng thử lại sau hoặc liên hệ admin @ducngg411');
    });

    return bot;
}

export async function startBot(bot: Telegraf) {
    await bot.launch();
    logger.info('🤖 Telegram bot started');

    // Graceful shutdown
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
