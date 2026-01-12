import { Telegraf } from 'telegraf';
import { config } from '../shared/config';
import { logger } from '../shared/logger';
import { CALLBACK_ACTIONS, BOT_COMMANDS } from '../shared/constants';

// Import handlers
import { handleStart, handleSupport, handleRefreshInventory } from './handlers/start.handler';
import {
    handleCanvaSelect,
    handleCanvaPlanSelect,
    handleCanvaQuantitySelect,
    handleCanvaQuantityCustom,
    handleCanvaEmailInput,
    handleCanvaGoBackToMain,
    handleCanvaGoBackToPlans,
    handleCanvaGoBackToQuantity,
} from './handlers/canva.handler';
import {
    handleNetflixSelect,
    handleNetflixPlanSelect,
    handleNetflixQuantitySelect,
    handleNetflixQuantityCustom,
    handleNetflixQuantityInput,
    handleNetflixQuantityMax,
    handleNetflixGoBackToMain,
    handleNetflixGoBackToPlans,
} from './handlers/netflix.handler';

import {
    handleCapcutSelect,
    handleCapcutPlanSelect,
    handleCapcutQuantitySelect,
    handleCapcutQuantityCustom,
    handleCapcutQuantityInput,
    handleCapcutQuantityMax,
    handleCapcutGoBackToMain,
    handleCapcutGoBackToPlans,
} from './handlers/capcut.handler';

import {
    handleChatGPTSelect,
    handleChatGPTPlanSelect,
    handleChatGPTQuantitySelect,
    handleChatGPTQuantityCustom,
    handleChatGPTQuantityInput,
    handleChatGPTQuantityMax,
    handleChatGPTGoBackToMain,
    handleChatGPTGoBackToPlans,
} from './handlers/chatgpt.handler';

import {
    handleGmailSelect,
    handleGmailPlanSelect,
    handleGmailQuantitySelect,
    handleGmailQuantityCustom,
    handleGmailQuantityInput,
    handleGmailQuantityMax,
    handleGmailGoBackToMain,
    handleGmailGoBackToPlans,
} from './handlers/gmail.handler';

import {
    handleVeo3Select,
    handleVeo3PlanSelect,
    handleVeo3QuantitySelect,
    handleVeo3QuantityCustom,
    handleVeo3QuantityInput,
    handleVeo3QuantityMax,
    handleVeo3GoBackToMain,
    handleVeo3GoBackToPlans,
} from './handlers/veo3.handler';

import {
    handleCancelOrder,
    handleViewQR,
    handleConfirmPayment,
    handleAdminInProgress,
    handleAdminFulfilled,
    handleAdminFailed,
    handleBuyMore,
    handleBackToMain,
} from './handlers/order.handler';

export function createBot(): Telegraf {
    const bot = new Telegraf(config.bot.token);

    // Commands
    bot.command(BOT_COMMANDS.START, handleStart);
    bot.command(BOT_COMMANDS.HELP, handleSupport);

    // Main menu callbacks
    bot.action(CALLBACK_ACTIONS.SELECT_CANVA, handleCanvaSelect);
    bot.action(CALLBACK_ACTIONS.SELECT_NETFLIX, handleNetflixSelect);
    bot.action(CALLBACK_ACTIONS.SELECT_CAPCUT, handleCapcutSelect);
    bot.action(CALLBACK_ACTIONS.SELECT_CHATGPT, handleChatGPTSelect);
    bot.action(CALLBACK_ACTIONS.SELECT_GMAIL, handleGmailSelect);
    bot.action(CALLBACK_ACTIONS.SELECT_VEO3, handleVeo3Select);
    bot.action(CALLBACK_ACTIONS.SUPPORT, handleSupport);
    bot.action(CALLBACK_ACTIONS.REFRESH_INVENTORY, handleRefreshInventory);

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
    bot.action(CALLBACK_ACTIONS.CANVA_GO_BACK_TO_MAIN, handleCanvaGoBackToMain);
    bot.action(CALLBACK_ACTIONS.CANVA_GO_BACK_TO_PLANS, handleCanvaGoBackToPlans);
    bot.action(CALLBACK_ACTIONS.CANVA_GO_BACK_TO_QUANTITY, handleCanvaGoBackToQuantity);

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
    bot.action(CALLBACK_ACTIONS.NETFLIX_QTY_MAX, handleNetflixQuantityMax);
    bot.action(CALLBACK_ACTIONS.NETFLIX_GO_BACK_TO_MAIN, handleNetflixGoBackToMain);
    bot.action(CALLBACK_ACTIONS.NETFLIX_GO_BACK_TO_PLANS, handleNetflixGoBackToPlans);

    // Capcut flow callbacks
    bot.action(new RegExp(`^${CALLBACK_ACTIONS.CAPCUT_PLAN_PREFIX}(.+)$`), (ctx) => {
        const variantCode = ctx.match[1];
        return handleCapcutPlanSelect(ctx, variantCode);
    });

    bot.action(new RegExp(`^${CALLBACK_ACTIONS.CAPCUT_QTY_PREFIX}(\\d+)$`), (ctx) => {
        const quantity = parseInt(ctx.match[1], 10);
        return handleCapcutQuantitySelect(ctx, quantity);
    });

    bot.action(CALLBACK_ACTIONS.CAPCUT_QTY_CUSTOM, handleCapcutQuantityCustom);
    bot.action(CALLBACK_ACTIONS.CAPCUT_QTY_MAX, handleCapcutQuantityMax);
    bot.action(CALLBACK_ACTIONS.CAPCUT_GO_BACK_TO_MAIN, handleCapcutGoBackToMain);
    bot.action(CALLBACK_ACTIONS.CAPCUT_GO_BACK_TO_PLANS, handleCapcutGoBackToPlans);

    // ChatGPT flow callbacks
    bot.action(new RegExp(`^${CALLBACK_ACTIONS.CHATGPT_PLAN_PREFIX}(.+)$`), (ctx) => {
        const variantCode = ctx.match[1];
        return handleChatGPTPlanSelect(ctx, variantCode);
    });
    bot.action(new RegExp(`^${CALLBACK_ACTIONS.CHATGPT_QTY_PREFIX}(\\d+)$`), (ctx) => {
        const quantity = parseInt(ctx.match[1], 10);
        return handleChatGPTQuantitySelect(ctx, quantity);
    });

    bot.action(CALLBACK_ACTIONS.CHATGPT_QTY_CUSTOM, handleChatGPTQuantityCustom);
    bot.action(CALLBACK_ACTIONS.CHATGPT_QTY_MAX, handleChatGPTQuantityMax);
    bot.action(CALLBACK_ACTIONS.CHATGPT_GO_BACK_TO_MAIN, handleChatGPTGoBackToMain);
    bot.action(CALLBACK_ACTIONS.CHATGPT_GO_BACK_TO_PLANS, handleChatGPTGoBackToPlans);

    // Gmail flow callbacks
    bot.action(new RegExp(`^${CALLBACK_ACTIONS.GMAIL_PLAN_PREFIX}(.+)$`), (ctx) => {
        const variantCode = ctx.match[1];
        return handleGmailPlanSelect(ctx, variantCode);
    });

    bot.action(new RegExp(`^${CALLBACK_ACTIONS.GMAIL_QTY_PREFIX}(\\d+)$`), (ctx) => {
        const quantity = parseInt(ctx.match[1], 10);
        return handleGmailQuantitySelect(ctx, quantity);
    });

    // Veo3 flow callbacks
    bot.action(new RegExp(`^${CALLBACK_ACTIONS.VEO3_PLAN_PREFIX}(.+)$`), (ctx) => {
        const variantCode = ctx.match[1];
        return handleVeo3PlanSelect(ctx, variantCode);
    });

    bot.action(new RegExp(`^${CALLBACK_ACTIONS.VEO3_QTY_PREFIX}(\\d+)$`), (ctx) => {
        const quantity = parseInt(ctx.match[1], 10);
        return handleVeo3QuantitySelect(ctx, quantity);
    });

    bot.action(CALLBACK_ACTIONS.VEO3_QTY_CUSTOM, handleVeo3QuantityCustom);
    bot.action(CALLBACK_ACTIONS.VEO3_QTY_MAX, handleVeo3QuantityMax);
    bot.action(CALLBACK_ACTIONS.VEO3_GO_BACK_TO_MAIN, handleVeo3GoBackToMain);
    bot.action(CALLBACK_ACTIONS.VEO3_GO_BACK_TO_PLANS, handleVeo3GoBackToPlans);

    bot.action(CALLBACK_ACTIONS.GMAIL_QTY_CUSTOM, handleGmailQuantityCustom);
    bot.action(CALLBACK_ACTIONS.GMAIL_QTY_MAX, handleGmailQuantityMax);
    bot.action(CALLBACK_ACTIONS.GMAIL_GO_BACK_TO_MAIN, handleGmailGoBackToMain);
    bot.action(CALLBACK_ACTIONS.GMAIL_GO_BACK_TO_PLANS, handleGmailGoBackToPlans);

    // Order actions
    bot.action(CALLBACK_ACTIONS.VIEW_QR, handleViewQR);
    bot.action(CALLBACK_ACTIONS.CANCEL_ORDER, handleCancelOrder);
    bot.action(CALLBACK_ACTIONS.CONFIRM_PAYMENT, handleConfirmPayment);
    bot.action(CALLBACK_ACTIONS.BUY_MORE, handleBuyMore);
    bot.action(CALLBACK_ACTIONS.BACK_TO_MAIN, handleBackToMain);

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

        // Try Capcut quantity input
        await handleCapcutQuantityInput(ctx, text);

        // Try ChatGPT quantity input
        await handleChatGPTQuantityInput(ctx, text);

        // Try Gmail quantity input
        await handleGmailQuantityInput(ctx, text);

        // Try Veo3 quantity input
        await handleVeo3QuantityInput(ctx, text);
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