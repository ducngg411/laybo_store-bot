import { Context, Markup } from 'telegraf';
import { orderService } from '../../services/order.service';
import { productRepository, variantRepository } from '../../db/repositories/product.repository';
import { inventoryService } from '../../services/inventory.service';
import { paymentService } from '../../services/payment.service';
import { logger } from '../../shared/logger';
import {
    CALLBACK_ACTIONS,
    PRODUCT_CODES,
    LIMITS,
    BOT_MESSAGES,
} from '../../shared/constants';
import { formatCurrency } from '../../shared/utils';

interface NetflixSession {
    step: 'select_plan' | 'input_quantity';
    variantCode?: string;
    variantName?: string;
    unitPrice?: number;
    currentStock?: number; // ⭐ NEW: Track current stock
}

const userSessions = new Map<number, NetflixSession>();

/**
 * Generate quantity selection keyboard based on stock availability
 * 
 * Rules:
 * - Stock ≤ 5: [1..stock] + [Quay lại]
 * - Stock > 5: [1..5] + [Nhập số khác] + [Mua tối đa] + [Quay lại]
 */
function generateQuantityKeyboard(stock: number, showMaxButton: boolean = false) {
    const buttons = [];

    if (stock <= 0) {
        // No stock - only show back button
        buttons.push([Markup.button.callback('↩️ Quay lại', CALLBACK_ACTIONS.NETFLIX_GO_BACK_TO_PLANS)]);
    } else if (stock <= 5) {
        // Stock ≤ 5: show all quantities + back
        const qtyButtons = [];
        for (let i = 1; i <= stock; i++) {
            qtyButtons.push(Markup.button.callback(
                i.toString(),
                `${CALLBACK_ACTIONS.NETFLIX_QTY_PREFIX}${i}`
            ));
        }

        // Show in rows of 3
        for (let i = 0; i < qtyButtons.length; i += 3) {
            buttons.push(qtyButtons.slice(i, i + 3));
        }

        buttons.push([Markup.button.callback('↩️ Quay lại', CALLBACK_ACTIONS.NETFLIX_GO_BACK_TO_PLANS)]);
    } else {
        // Stock > 5
        if (showMaxButton) {
            // After user requested > stock: show [Mua X (tối đa)] + [1, 2] + [Quay lại]
            buttons.push([
                Markup.button.callback(
                    `✅ Mua ${stock} (tối đa)`,
                    CALLBACK_ACTIONS.NETFLIX_QTY_MAX
                ),
            ]);

            // Show only 1 and 2 for quick selection
            const quickButtons = [];
            if (stock >= 1) quickButtons.push(Markup.button.callback('1', `${CALLBACK_ACTIONS.NETFLIX_QTY_PREFIX}1`));
            if (stock >= 2) quickButtons.push(Markup.button.callback('2', `${CALLBACK_ACTIONS.NETFLIX_QTY_PREFIX}2`));
            if (quickButtons.length > 0) {
                buttons.push(quickButtons);
            }

            buttons.push([Markup.button.callback('↩️ Quay lại', CALLBACK_ACTIONS.NETFLIX_GO_BACK_TO_PLANS)]);
        } else {
            // Normal flow: show [1..5] + [Nhập số khác] + [Mua tối đa] + [Quay lại]
            buttons.push([
                Markup.button.callback('1', `${CALLBACK_ACTIONS.NETFLIX_QTY_PREFIX}1`),
                Markup.button.callback('2', `${CALLBACK_ACTIONS.NETFLIX_QTY_PREFIX}2`),
                Markup.button.callback('3', `${CALLBACK_ACTIONS.NETFLIX_QTY_PREFIX}3`),
            ]);
            buttons.push([
                Markup.button.callback('4', `${CALLBACK_ACTIONS.NETFLIX_QTY_PREFIX}4`),
                Markup.button.callback('5', `${CALLBACK_ACTIONS.NETFLIX_QTY_PREFIX}5`),
            ]);
            buttons.push([
                Markup.button.callback('✏️ Nhập số khác', CALLBACK_ACTIONS.NETFLIX_QTY_CUSTOM),
                Markup.button.callback(`✅ Mua ${stock} (tối đa)`, CALLBACK_ACTIONS.NETFLIX_QTY_MAX),
            ]);
            buttons.push([Markup.button.callback('↩️ Quay lại', CALLBACK_ACTIONS.NETFLIX_GO_BACK_TO_PLANS)]);
        }
    }

    return Markup.inlineKeyboard(buttons);
}

export async function handleNetflixSelect(ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) return;

    // Check for active order
    const activeOrder = await orderService.getActiveOrder(BigInt(userId));
    if (activeOrder) {
        const expiryMinutes = Math.floor(
            (activeOrder.expiresAt!.getTime() - Date.now()) / 1000 / 60
        );

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('📋 Xem QR thanh toán', CALLBACK_ACTIONS.VIEW_QR)],
            [Markup.button.callback('❌ Hủy đơn và tạo mới', CALLBACK_ACTIONS.CANCEL_ORDER)],
        ]);

        await ctx.reply(
            `⚠️ *Bạn đang có đơn hàng chưa hoàn tất*\n\n` +
            `📦 Sản phẩm: ${activeOrder.productName}${activeOrder.variantName ? ' - ' + activeOrder.variantName : ''}\n` +
            `🔢 Số lượng: ${activeOrder.quantity}\n` +
            `💰 Tổng tiền: *${formatCurrency(activeOrder.totalVnd)}*\n` +
            `⏳ Hết hạn sau: ${expiryMinutes} phút\n\n` +
            `Bạn muốn làm gì?`,
            { parse_mode: 'Markdown', ...keyboard }
        );
        return;
    }

    // Show plan selection
    const product = await productRepository.findByCode(PRODUCT_CODES.NETFLIX);
    if (!product) {
        await ctx.reply('❌ Sản phẩm không khả dụng.');
        return;
    }

    const variants = await variantRepository.findByProduct(product.id);
    const buttons = variants.map((v) =>
        Markup.button.callback(
            `${v.name} - ${formatCurrency(v.priceVnd)}`,
            `${CALLBACK_ACTIONS.NETFLIX_PLAN_PREFIX}${v.code}`
        )
    );

    // Add back button
    buttons.push(Markup.button.callback('↩️ Quay lại', CALLBACK_ACTIONS.NETFLIX_GO_BACK_TO_MAIN));

    const keyboard = Markup.inlineKeyboard(buttons, { columns: 1 });

    userSessions.set(userId, { step: 'select_plan' });

    await ctx.reply(
        `🎬 *Netflix Premium – Bảo hành full*
        • Định dạng tài khoản: *Mail | Pass*
        • Tài khoản *Private* – dùng riêng, không chung
        • Trong quá trình sử dụng *lỗi 1 đổi 1*

        👉 Vui lòng chọn gói bên dưới`,
        {
            parse_mode: 'Markdown',
            ...keyboard,
        }
    );
}

export async function handleNetflixPlanSelect(ctx: Context, variantCode: string) {
    const userId = ctx.from?.id;
    if (!userId) return;

    const variant = await variantRepository.findByCode(variantCode);
    if (!variant) {
        await ctx.reply('❌ Gói không hợp lệ.');
        return;
    }

    // ⭐ Check stock availability
    const product = await productRepository.findByCode(PRODUCT_CODES.NETFLIX);
    if (!product) {
        await ctx.reply('❌ Sản phẩm không khả dụng.');
        return;
    }

    const currentStock = await inventoryService.getAvailableCount(product.id);

    // Update session with stock info
    userSessions.set(userId, {
        step: 'input_quantity',
        variantCode: variant.code,
        variantName: variant.name,
        unitPrice: variant.priceVnd,
        currentStock,
    });

    // ⭐ Generate keyboard based on stock
    const keyboard = generateQuantityKeyboard(currentStock);

    let message = `✅ Đã chọn: *${variant.name}* - ${formatCurrency(variant.priceVnd)}/tài khoản\n\n`;

    if (currentStock === 0) {
        message += `⚠️ *Hiện tại chưa có hàng.*\n\nVui lòng liên hệ admin @ducngg411`;
    } else {
        message += `🎬 Còn *${currentStock} tài khoản* trong kho\n\n💬 Bạn cần mua bao nhiêu tài khoản?`;
    }

    await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...keyboard,
    });
}

export async function handleNetflixQuantitySelect(ctx: Context, quantity: number, isFromTextInput: boolean = false) {
    const userId = ctx.from?.id;
    if (!userId) return;

    const session = userSessions.get(userId);
    if (!session || session.step !== 'input_quantity') {
        await ctx.reply('❌ Phiên làm việc không hợp lệ. Vui lòng bắt đầu lại từ /start');
        return;
    }

    const currentStock = session.currentStock || 0;

    // ⭐ Validate quantity against stock
    if (quantity > currentStock) {
        // Show insufficient stock message
        const keyboard = generateQuantityKeyboard(currentStock, true); // true = show max button prominently

        const message = BOT_MESSAGES.NETFLIX_INSUFFICIENT_STOCK(quantity, currentStock);

        if (isFromTextInput) {
            await ctx.reply(message, {
                parse_mode: 'Markdown',
                ...keyboard,
            });
        } else {
            await ctx.editMessageText(message, {
                parse_mode: 'Markdown',
                ...keyboard,
            });
        }
        return;
    }

    // Continue with order creation
    await createNetflixOrder(ctx, quantity, session, isFromTextInput);
}

/**
 * Handle "Mua tối đa" button - buy max available stock
 */
export async function handleNetflixQuantityMax(ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) return;

    const session = userSessions.get(userId);
    if (!session || session.step !== 'input_quantity') {
        await ctx.reply('❌ Phiên làm việc không hợp lệ. Vui lòng bắt đầu lại từ /start');
        return;
    }

    const maxStock = session.currentStock || 0;

    if (maxStock === 0) {
        await ctx.answerCbQuery('⚠️ Hiện tại chưa có hàng');
        return;
    }

    await ctx.answerCbQuery(`✅ Mua ${maxStock} tài khoản`);
    await createNetflixOrder(ctx, maxStock, session);
}

/**
 * Handle custom quantity input from text message
 */
export async function handleNetflixQuantityCustom(ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) return;

    const session = userSessions.get(userId);
    if (!session || session.step !== 'input_quantity') {
        await ctx.reply('❌ Phiên làm việc không hợp lệ. Vui lòng bắt đầu lại từ /start');
        return;
    }

    const currentStock = session.currentStock || 0;
    const maxAllowed = Math.min(currentStock, LIMITS.NETFLIX_QTY_MAX);

    await ctx.editMessageText(
        `📝 Vui lòng nhập số lượng tài khoản (${LIMITS.NETFLIX_QTY_MIN}-${maxAllowed}):`,
        { parse_mode: 'Markdown' }
    );
}

/**
 * Handle text input for custom quantity
 */
export async function handleNetflixQuantityInput(ctx: Context, text: string) {
    const userId = ctx.from?.id;
    if (!userId) return;

    const session = userSessions.get(userId);
    if (!session || session.step !== 'input_quantity') {
        return;
    }

    const currentStock = session.currentStock || 0;
    const maxAllowed = Math.min(currentStock, LIMITS.NETFLIX_QTY_MAX);

    // ⭐ Validate input
    const qty = parseInt(text, 10);

    if (isNaN(qty)) {
        // Not a number - use reply instead of edit
        const keyboard = generateQuantityKeyboard(currentStock, false);
        await ctx.reply(
            BOT_MESSAGES.NETFLIX_INVALID_QUANTITY(LIMITS.NETFLIX_QTY_MIN, maxAllowed),
            {
                parse_mode: 'Markdown',
                ...keyboard,
            }
        );
        return;
    }

    if (qty < LIMITS.NETFLIX_QTY_MIN || qty > LIMITS.NETFLIX_QTY_MAX) {
        // Out of general bounds - use reply instead of edit
        const keyboard = generateQuantityKeyboard(currentStock, false);
        await ctx.reply(
            BOT_MESSAGES.NETFLIX_INVALID_QUANTITY(LIMITS.NETFLIX_QTY_MIN, LIMITS.NETFLIX_QTY_MAX),
            {
                parse_mode: 'Markdown',
                ...keyboard,
            }
        );
        return;
    }

    if (qty > currentStock) {
        // Exceeds current stock - use reply instead of edit
        const keyboard = generateQuantityKeyboard(currentStock, true); // Show max button
        await ctx.reply(
            BOT_MESSAGES.NETFLIX_INSUFFICIENT_STOCK(qty, currentStock),
            {
                parse_mode: 'Markdown',
                ...keyboard,
            }
        );
        return;
    }

    // Valid quantity - create order
    await handleNetflixQuantitySelect(ctx, qty, true); // true = from text input
}

/**
 * Handle "Quay lại" button - go back to main menu
 */
export async function handleNetflixGoBackToMain(ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) return;

    // Clear session
    userSessions.delete(userId);

    await ctx.answerCbQuery('↩️ Quay lại');

    // Go back to main menu
    const { handleStart } = await import('./start.handler');
    await handleStart(ctx);
}

/**
 * Handle "Quay lại" button - go back to plan selection
 */
export async function handleNetflixGoBackToPlans(ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) return;

    await ctx.answerCbQuery('↩️ Quay lại');
    await handleNetflixSelect(ctx);
}

/**
 * Create Netflix order after validation
 */
async function createNetflixOrder(ctx: Context, quantity: number, session: NetflixSession, isFromTextInput: boolean = false) {
    const userId = ctx.from?.id;
    if (!userId) return;

    try {
        // Create order
        const order = await orderService.createOrder({
            userId: BigInt(userId),
            username: ctx.from?.username,
            productCode: PRODUCT_CODES.NETFLIX,
            variantCode: session.variantCode,
            quantity,
        });

        // Clear session
        userSessions.delete(userId);

        // Generate QR
        const qrUrl = await paymentService.generateQRCode(order.paymentRef, order.totalVnd);

        const expiryMinutes = Math.floor(
            (order.expiresAt!.getTime() - Date.now()) / 1000 / 60
        );

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('❌ Huỷ đơn', CALLBACK_ACTIONS.CANCEL_ORDER)],
            [Markup.button.callback('✅ Tôi đã thanh toán', CALLBACK_ACTIONS.CONFIRM_PAYMENT)],
        ]);

        const orderMessage =
            `🧾 *Đơn hàng #${order.id}*\n\n` +
            `📦 Sản phẩm: ${order.productName} - ${order.variantName}\n` +
            `🎬 Số tài khoản: ${order.quantity}\n` +
            `💰 Tổng tiền: *${formatCurrency(order.totalVnd)}*\n` +
            `🔖 Mã đơn: \`${order.paymentRef}\`\n` +
            `⏰ Hết hạn sau: ${expiryMinutes} phút\n\n` +
            `Đang gửi QR thanh toán...`;

        if (isFromTextInput) {
            await ctx.reply(orderMessage, { parse_mode: 'Markdown' });
        } else {
            await ctx.editMessageText(orderMessage, { parse_mode: 'Markdown' });
        }

        // Send QR and save messageId
        const sentMessage = await ctx.replyWithPhoto(
            { url: qrUrl },
            {
                caption: `📱 Quét mã QR để thanh toán\n💰 Số tiền: *${formatCurrency(order.totalVnd)}*\n🔖 Nội dung: \`${order.paymentRef}\`\n\nℹ️ Vui lòng chuyển khoản đúng nội dung & số tiền để hệ thống tự động xử lý.\n⏱️ Đơn được giữ trong ${expiryMinutes} phút.`,
                parse_mode: 'Markdown',
                ...keyboard,
            }
        );

        // Save QR messageId to order metadata for expiry notification
        if (sentMessage.message_id) {
            await orderService.updateOrderMetadata(order.id, {
                qrMessageId: sentMessage.message_id,
            });
        }

        logger.info({
            orderId: order.id,
            userId,
            quantity,
            qrMessageId: sentMessage.message_id
        }, 'Netflix order created, QR sent with messageId saved');
    } catch (error) {
        logger.error({ error, userId, quantity }, 'Failed to create Netflix order');

        if (error instanceof Error && error.message === 'USER_HAS_ACTIVE_ORDER') {
            // Get active order details
            const activeOrder = await orderService.getActiveOrder(BigInt(userId));
            if (activeOrder) {
                const expiryMinutes = Math.floor(
                    (activeOrder.expiresAt!.getTime() - Date.now()) / 1000 / 60
                );

                const keyboard = Markup.inlineKeyboard([
                    [Markup.button.callback('📋 Xem QR thanh toán', CALLBACK_ACTIONS.VIEW_QR)],
                    [Markup.button.callback('❌ Hủy đơn và tạo mới', CALLBACK_ACTIONS.CANCEL_ORDER)],
                ]);

                const errorMessage =
                    `⚠️ *Bạn đang có đơn hàng chưa hoàn tất*\n\n` +
                    `📦 Sản phẩm: ${activeOrder.productName}${activeOrder.variantName ? ' - ' + activeOrder.variantName : ''}\n` +
                    `🔢 Số lượng: ${activeOrder.quantity}\n` +
                    `💰 Tổng tiền: *${formatCurrency(activeOrder.totalVnd)}*\n` +
                    `⏳ Hết hạn sau: ${expiryMinutes} phút\n\n` +
                    `Bạn muốn làm gì?`;

                if (isFromTextInput) {
                    await ctx.reply(errorMessage, { parse_mode: 'Markdown', ...keyboard });
                } else {
                    await ctx.editMessageText(errorMessage, { parse_mode: 'Markdown', ...keyboard });
                }
            }
        } else if (error instanceof Error && error.message === 'INSUFFICIENT_INVENTORY') {
            // This shouldn't happen as we already checked, but handle it anyway
            const errorMessage = '⚠️ Không đủ hàng. Vui lòng chọn lại số lượng.';

            if (isFromTextInput) {
                await ctx.reply(errorMessage, { parse_mode: 'Markdown' });
            } else {
                await ctx.editMessageText(errorMessage, { parse_mode: 'Markdown' });
            }

            // Refresh and show quantity selection again
            await handleNetflixPlanSelect(ctx, session.variantCode!);
        } else {
            const errorMessage = '❌ Đã xảy ra lỗi. Vui lòng thử lại sau.';

            if (isFromTextInput) {
                await ctx.reply(errorMessage, { parse_mode: 'Markdown' });
            } else {
                await ctx.editMessageText(errorMessage, { parse_mode: 'Markdown' });
            }
        }
    }
}