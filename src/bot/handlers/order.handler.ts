import { Context, Markup, Telegraf } from 'telegraf';
import { OrderStatus } from '@prisma/client';
import { orderService } from '../../services/order.service';
import { inventoryService } from '../../services/inventory.service';
import { paymentService } from '../../services/payment.service';
import { logger } from '../../shared/logger';
import { config } from '../../shared/config';
import { BOT_MESSAGES, CALLBACK_ACTIONS } from '../../shared/constants';
import { formatCurrency } from '../../shared/utils';

export async function handleCancelOrder(ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) return;

    try {
        const activeOrder = await orderService.getActiveOrder(BigInt(userId));
        if (!activeOrder) {
            await ctx.answerCbQuery('Không tìm thấy đơn hàng.');
            return;
        }

        // Cancel order (update status + release inventory)
        await orderService.cancelOrder(activeOrder.id);

        // Answer callback query
        await ctx.answerCbQuery('Đã huỷ đơn hàng');

        // Step 1: Edit old message to show cancelled status and remove keyboard
        try {
            // Try editing message caption (for photo messages with QR)
            await ctx.editMessageCaption(BOT_MESSAGES.ORDER_CANCELLED_MESSAGE, {
                parse_mode: 'Markdown',
            });
        } catch (error) {
            // If that fails, try editing message text (for text-only messages)
            try {
                await ctx.editMessageText(BOT_MESSAGES.ORDER_CANCELLED_MESSAGE, {
                    parse_mode: 'Markdown',
                });
            } catch (error2) {
                // If both fail, just log it - message editing is not critical
                logger.debug({ error: error2 }, 'Could not edit message (caption or text)');
            }
        }

        // Step 2: Send new confirmation message
        await ctx.reply(BOT_MESSAGES.ORDER_CANCELLED_CONFIRMATION, {
            parse_mode: 'Markdown',
        });

        logger.info({ orderId: activeOrder.id, userId }, 'Order cancelled by user');
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error({
            error,
            errorMessage: errorMsg,
            errorStack: error instanceof Error ? error.stack : undefined,
            userId
        }, 'Failed to cancel order');

        let userMessage = 'Không thể huỷ đơn hàng.';
        if (errorMsg.includes('ORDER_CANNOT_BE_CANCELLED')) {
            if (errorMsg.includes('PAID')) {
                userMessage = 'Đơn hàng đã được thanh toán, không thể huỷ. Vui lòng liên hệ admin nếu cần hỗ trợ.';
            } else if (errorMsg.includes('COMPLETED') || errorMsg.includes('PROCESSING')) {
                userMessage = 'Đơn hàng đã được xử lý, không thể huỷ.';
            } else if (errorMsg.includes('EXPIRED')) {
                userMessage = 'Đơn hàng đã hết hạn.';
            } else if (errorMsg.includes('CANCELLED')) {
                userMessage = 'Đơn hàng đã được huỷ trước đó.';
            }
        }
        await ctx.answerCbQuery(userMessage);
    }
}

export async function handleViewQR(ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) return;

    try {
        const activeOrder = await orderService.getActiveOrder(BigInt(userId));
        if (!activeOrder) {
            await ctx.answerCbQuery('Không tìm thấy đơn hàng.');
            return;
        }

        if (activeOrder.status !== OrderStatus.PENDING_PAYMENT) {
            await ctx.answerCbQuery('Đơn hàng không ở trạng thái chờ thanh toán.');
            return;
        }

        const qrUrl = await paymentService.generateQRCode(
            activeOrder.paymentRef,
            activeOrder.totalVnd
        );

        const expiryMinutes = Math.floor(
            (activeOrder.expiresAt!.getTime() - Date.now()) / 1000 / 60
        );

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('❌ Huỷ đơn', CALLBACK_ACTIONS.CANCEL_ORDER)],
            [Markup.button.callback('✅ Tôi đã thanh toán', CALLBACK_ACTIONS.CONFIRM_PAYMENT)],
        ]);

        await ctx.replyWithPhoto(
            { url: qrUrl },
            {
                caption:
                    `🧾 *Đơn hàng #${activeOrder.id}*\n\n` +
                    `📦 Sản phẩm: ${activeOrder.productName} - ${activeOrder.variantName}\n` +
                    `💰 Tổng tiền: *${formatCurrency(activeOrder.totalVnd)}*\n` +
                    `🔖 Mã đơn: \`${activeOrder.paymentRef}\`\n` +
                    `⏰ Hết hạn sau: ${expiryMinutes} phút\n\n` +
                    `📱 Quét mã QR để thanh toán\n\n` +
                    `ℹ️ Vui lòng chuyển khoản đúng nội dung & số tiền để hệ thống tự động xử lý.\n` +
                    `⏱️ Đơn được giữ trong ${expiryMinutes} phút.`,
                parse_mode: 'Markdown',
                ...keyboard,
            }
        );

        await ctx.answerCbQuery();
    } catch (error) {
        logger.error({ error }, 'Failed to show QR');
        await ctx.answerCbQuery('Đã xảy ra lỗi.');
    }
}

export async function handleConfirmPayment(ctx: Context) {
    await ctx.answerCbQuery(
        '⏳ Vui lòng đợi hệ thống xác nhận thanh toán tự động. Thường mất 1-2 phút.'
    );
}

/**
 * Notify user when order expires
 * - Edits QR message to show "Order Expired"
 * - Sends notification message
 */
export async function notifyUserOrderExpired(bot: Telegraf, userId: bigint, orderId: string, qrMessageId?: number) {
    try {
        // Step 1: Edit QR message if we have messageId
        if (qrMessageId) {
            try {
                // Try editing caption first (for photo messages)
                await bot.telegram.editMessageCaption(
                    userId.toString(),
                    qrMessageId,
                    undefined,
                    BOT_MESSAGES.ORDER_EXPIRED_MESSAGE,
                    {
                        parse_mode: 'Markdown',
                    }
                );
                logger.debug({ userId, orderId, qrMessageId }, 'Edited QR message caption on expiry');
            } catch (error) {
                // If caption edit fails, try text edit (for text messages)
                try {
                    await bot.telegram.editMessageText(
                        userId.toString(),
                        qrMessageId,
                        undefined,
                        BOT_MESSAGES.ORDER_EXPIRED_MESSAGE,
                        {
                            parse_mode: 'Markdown',
                        }
                    );
                    logger.debug({ userId, orderId, qrMessageId }, 'Edited QR message text on expiry');
                } catch (error2) {
                    // Message might be too old or deleted - not critical
                    logger.debug(
                        { error: error2, userId, orderId, qrMessageId },
                        'Could not edit QR message on expiry (not critical)'
                    );
                }
            }
        } else {
            logger.debug({ userId, orderId }, 'No QR messageId found to edit');
        }

        // Step 2: Send notification message
        await bot.telegram.sendMessage(
            userId.toString(),
            BOT_MESSAGES.ORDER_EXPIRED_NOTIFICATION,
            { parse_mode: 'Markdown' }
        );

        logger.info({ userId, orderId }, 'Order expiry notification sent');
    } catch (error) {
        logger.error({ error, userId, orderId }, 'Failed to notify user about expired order');
    }
}

export async function notifyUserPaymentSuccess(bot: Telegraf, userId: bigint, orderId: string) {
    try {
        await bot.telegram.sendMessage(userId.toString(), BOT_MESSAGES.PAYMENT_SUCCESS, {
            parse_mode: 'Markdown',
        });
        logger.info({ userId, orderId }, 'Payment success notification sent');
    } catch (error) {
        logger.error({ error, userId, orderId }, 'Failed to send payment success notification');
    }
}

export async function notifyAdminNewOrder(bot: Telegraf, order: any) {
    try {
        const metadata = order.metadata as any;
        let message = `🆕 *Đơn hàng mới #${order.id}*\n\n`;
        message += `👤 User: ${order.username ? '@' + order.username : order.userId}\n`;
        message += `📦 Sản phẩm: ${order.productName}`;
        if (order.variantName) message += ` - ${order.variantName}`;
        message += `\n`;
        message += `🔢 Số lượng: ${order.quantity}\n`;
        message += `💰 Tổng tiền: *${formatCurrency(order.totalVnd)}*\n`;
        message += `🔖 Mã đơn: \`${order.paymentRef}\`\n`;
        message += `📅 Thời gian: ${order.createdAt.toLocaleString('vi-VN')}\n`;

        if (metadata?.emails) {
            message += `\n📧 *Danh sách email:*\n`;
            metadata.emails.forEach((email: string, idx: number) => {
                message += `${idx + 1}. \`${email}\`\n`;
            });
        }

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback(
                    '🔄 Đang xử lý',
                    `${CALLBACK_ACTIONS.ADMIN_IN_PROGRESS}${order.id}`
                ),
            ],
            [
                Markup.button.callback(
                    '✅ Hoàn thành',
                    `${CALLBACK_ACTIONS.ADMIN_FULFILLED}${order.id}`
                ),
                Markup.button.callback('❌ Thất bại', `${CALLBACK_ACTIONS.ADMIN_FAILED}${order.id}`),
            ],
        ]);

        await bot.telegram.sendMessage(config.bot.adminChatId, message, {
            parse_mode: 'Markdown',
            ...keyboard,
        });

        logger.info({ orderId: order.id }, 'Admin notification sent');
    } catch (error) {
        logger.error({ error, orderId: order.id }, 'Failed to send admin notification');
    }
}

export async function deliverNetflixAccounts(bot: Telegraf, userId: bigint, orderId: string) {
    try {
        const items = await inventoryService.getOrderItems(orderId);

        if (items.length === 0) {
            logger.error({ orderId }, 'No inventory items found for Netflix order');
            return;
        }

        const accounts = items.map((item) => inventoryService.parseItemPayload(item));

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('🛒 Mua thêm', CALLBACK_ACTIONS.BUY_MORE),
                Markup.button.callback('🏠 Menu chính', CALLBACK_ACTIONS.BACK_TO_MAIN),
            ],
            [Markup.button.callback('☎️ Hỗ trợ', CALLBACK_ACTIONS.SUPPORT)],
        ]);

        await bot.telegram.sendMessage(
            userId.toString(),
            BOT_MESSAGES.NETFLIX_DELIVERED(accounts),
            { parse_mode: 'Markdown', ...keyboard }
        );

        // Update order status to FULFILLED
        await orderService.updateOrderStatus(orderId, OrderStatus.FULFILLED);

        logger.info({ userId, orderId, count: accounts.length }, 'Netflix accounts delivered and order fulfilled');
    } catch (error) {
        logger.error({ error, userId, orderId }, 'Failed to deliver Netflix accounts');
    }
}

export async function deliverCapcutAccounts(bot: Telegraf, userId: bigint, orderId: string) {
    try {
        const items = await inventoryService.getOrderItems(orderId);

        if (items.length === 0) {
            logger.error({ orderId }, 'No inventory items found for Capcut order');
            return;
        }

        const accounts = items.map((item) => inventoryService.parseItemPayload(item));

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('🛒 Mua thêm', CALLBACK_ACTIONS.BUY_MORE),
                Markup.button.callback('🏠 Menu chính', CALLBACK_ACTIONS.BACK_TO_MAIN),
            ],
            [Markup.button.callback('☎️ Hỗ trợ', CALLBACK_ACTIONS.SUPPORT)],
        ]);

        await bot.telegram.sendMessage(
            userId.toString(),
            BOT_MESSAGES.CAPCUT_DELIVERED(accounts),
            { parse_mode: 'Markdown', ...keyboard }
        );

        // Update order status to FULFILLED
        await orderService.updateOrderStatus(orderId, OrderStatus.FULFILLED);

        logger.info({ userId, orderId, count: accounts.length }, 'Capcut accounts delivered and order fulfilled');
    } catch (error) {
        logger.error({ error, userId, orderId }, 'Failed to deliver Capcut accounts');
    }
}

export async function deliverCapcut14DaysAccounts(bot: Telegraf, userId: bigint, orderId: string) {
    try {
        const items = await inventoryService.getOrderItems(orderId);

        if (items.length === 0) {
            logger.error({ orderId }, 'No inventory items found for Capcut 14 days order');
            return;
        }

        const accounts = items.map((item) => inventoryService.parseItemPayload(item));

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('🛒 Mua thêm', CALLBACK_ACTIONS.BUY_MORE),
                Markup.button.callback('🏠 Menu chính', CALLBACK_ACTIONS.BACK_TO_MAIN),
            ],
            [Markup.button.callback('☎️ Hỗ trợ', CALLBACK_ACTIONS.SUPPORT)],
        ]);

        await bot.telegram.sendMessage(
            userId.toString(),
            BOT_MESSAGES.CAPCUT14DAYS_DELIVERED(accounts),
            { parse_mode: 'Markdown', ...keyboard }
        );

        // Update order status to FULFILLED
        await orderService.updateOrderStatus(orderId, OrderStatus.FULFILLED);

        logger.info({ userId, orderId, count: accounts.length }, 'Capcut 14 days accounts delivered and order fulfilled');
    } catch (error) {
        logger.error({ error, userId, orderId }, 'Failed to deliver Capcut 14 days accounts');
    }
}

export async function deliverCapcutTeamAccounts(bot: Telegraf, userId: bigint, orderId: string) {
    try {
        const items = await inventoryService.getOrderItems(orderId);

        if (items.length === 0) {
            logger.error({ orderId }, 'No inventory items found for Capcut Team order');
            return;
        }

        const accounts = items.map((item) => inventoryService.parseItemPayload(item));

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('🛒 Mua thêm', CALLBACK_ACTIONS.BUY_MORE),
                Markup.button.callback('🏠 Menu chính', CALLBACK_ACTIONS.BACK_TO_MAIN),
            ],
            [Markup.button.callback('☎️ Hỗ trợ', CALLBACK_ACTIONS.SUPPORT)],
        ]);

        await bot.telegram.sendMessage(
            userId.toString(),
            BOT_MESSAGES.CAPCUTTEAM_DELIVERED(accounts),
            { parse_mode: 'Markdown', ...keyboard }
        );

        // Update order status to FULFILLED
        await orderService.updateOrderStatus(orderId, OrderStatus.FULFILLED);

        logger.info({ userId, orderId, count: accounts.length }, 'Capcut Team accounts delivered and order fulfilled');
    } catch (error) {
        logger.error({ error, userId, orderId }, 'Failed to deliver Capcut Team accounts');
    }
}


export async function handleAdminInProgress(ctx: Context, orderId: string) {
    try {
        await orderService.updateOrderStatus(orderId, OrderStatus.IN_PROGRESS);
        await ctx.answerCbQuery('✅ Đã cập nhật trạng thái: Đang xử lý');
        await ctx.editMessageReplyMarkup(undefined);
        logger.info({ orderId }, 'Order marked as IN_PROGRESS by admin');
    } catch (error) {
        logger.error({ error, orderId }, 'Failed to update order status');
        await ctx.answerCbQuery('❌ Không thể cập nhật trạng thái');
    }
}

export async function handleAdminFulfilled(ctx: Context, bot: Telegraf, orderId: string) {
    try {
        const order = await orderService.getOrder(orderId);
        if (!order) {
            await ctx.answerCbQuery('Không tìm thấy đơn hàng');
            return;
        }

        await orderService.updateOrderStatus(orderId, OrderStatus.FULFILLED);

        // Send notification to user based on product type
        const metadata = order.metadata as any;

        if (metadata?.emails) {
            // Canva order
            const keyboard = Markup.inlineKeyboard([
                [
                    Markup.button.callback('🛒 Mua thêm', CALLBACK_ACTIONS.BUY_MORE),
                    Markup.button.callback('🏠 Menu chính', CALLBACK_ACTIONS.BACK_TO_MAIN),
                ],
                [Markup.button.callback('☎️ Hỗ trợ', CALLBACK_ACTIONS.SUPPORT)],
            ]);

            await bot.telegram.sendMessage(
                order.userId.toString(),
                BOT_MESSAGES.ORDER_FULFILLED(metadata.emails),
                { parse_mode: 'Markdown', ...keyboard }
            );
        } else {
            // Netflix order - deliver accounts
            await deliverNetflixAccounts(bot, order.userId, orderId);
            await deliverCapcutAccounts(bot, order.userId, orderId);
            await deliverCapcut14DaysAccounts(bot, order.userId, orderId);
            await deliverCapcutTeamAccounts(bot, order.userId, orderId);
        }

        await ctx.answerCbQuery('✅ Đã hoàn thành đơn hàng');
        await ctx.editMessageReplyMarkup(undefined);

        logger.info({ orderId }, 'Order marked as FULFILLED by admin');
    } catch (error) {
        logger.error({ error, orderId }, 'Failed to fulfill order');
        await ctx.answerCbQuery('❌ Không thể hoàn thành đơn hàng');
    }
}

export async function handleAdminFailed(ctx: Context, bot: Telegraf, orderId: string) {
    try {
        const order = await orderService.getOrder(orderId);
        if (!order) {
            await ctx.answerCbQuery('Không tìm thấy đơn hàng');
            return;
        }

        await orderService.updateOrderStatus(orderId, OrderStatus.FAILED);

        await bot.telegram.sendMessage(order.userId.toString(), BOT_MESSAGES.ORDER_FAILED, {
            parse_mode: 'Markdown',
        });

        await ctx.answerCbQuery('✅ Đã đánh dấu thất bại');
        await ctx.editMessageReplyMarkup(undefined);

        logger.info({ orderId }, 'Order marked as FAILED by admin');
    } catch (error) {
        logger.error({ error, orderId }, 'Failed to mark order as failed');
        await ctx.answerCbQuery('❌ Không thể cập nhật trạng thái');
    }
}

/**
 * Handle "Mua thêm" button - show main menu
 */
export async function handleBuyMore(ctx: Context) {
    await ctx.answerCbQuery('🛒 Mua thêm');
    const { handleStart } = await import('./start.handler');
    await handleStart(ctx);
}

/**
 * Handle "Menu chính" button - show main menu
 */
export async function handleBackToMain(ctx: Context) {
    await ctx.answerCbQuery('🏠 Menu chính');
    const { handleStart } = await import('./start.handler');
    await handleStart(ctx);
}