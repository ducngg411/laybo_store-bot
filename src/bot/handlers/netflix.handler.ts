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
} from '../../shared/constants';
import { formatCurrency } from '../../shared/utils';

interface NetflixSession {
    step: 'select_plan' | 'input_quantity';
    variantCode?: string;
    variantName?: string;
    unitPrice?: number;
}

const userSessions = new Map<number, NetflixSession>();

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

    const keyboard = Markup.inlineKeyboard(buttons, { columns: 1 });

    userSessions.set(userId, { step: 'select_plan' });

    await ctx.reply('🎬 *Netflix Premium*\n\nVui lòng chọn gói:', {
        parse_mode: 'Markdown',
        ...keyboard,
    });
}

export async function handleNetflixPlanSelect(ctx: Context, variantCode: string) {
    const userId = ctx.from?.id;
    if (!userId) return;

    const variant = await variantRepository.findByCode(variantCode);
    if (!variant) {
        await ctx.reply('❌ Gói không hợp lệ.');
        return;
    }

    // Update session
    userSessions.set(userId, {
        step: 'input_quantity',
        variantCode: variant.code,
        variantName: variant.name,
        unitPrice: variant.priceVnd,
    });

    // Show quantity selection
    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('1', `${CALLBACK_ACTIONS.NETFLIX_QTY_PREFIX}1`),
            Markup.button.callback('2', `${CALLBACK_ACTIONS.NETFLIX_QTY_PREFIX}2`),
            Markup.button.callback('3', `${CALLBACK_ACTIONS.NETFLIX_QTY_PREFIX}3`),
        ],
        [
            Markup.button.callback('4', `${CALLBACK_ACTIONS.NETFLIX_QTY_PREFIX}4`),
            Markup.button.callback('5', `${CALLBACK_ACTIONS.NETFLIX_QTY_PREFIX}5`),
        ],
        [Markup.button.callback('✏️ Nhập số khác', CALLBACK_ACTIONS.NETFLIX_QTY_CUSTOM)],
    ]);

    await ctx.editMessageText(
        `✅ Đã chọn: *${variant.name}* - ${formatCurrency(variant.priceVnd)}/tài khoản\n\n` +
        `💬 Bạn cần mua bao nhiêu tài khoản?`,
        {
            parse_mode: 'Markdown',
            ...keyboard,
        }
    );
}

export async function handleNetflixQuantitySelect(ctx: Context, quantity: number) {
    const userId = ctx.from?.id;
    if (!userId) return;

    const session = userSessions.get(userId);
    if (!session || session.step !== 'input_quantity') {
        await ctx.reply('❌ Phiên làm việc không hợp lệ. Vui lòng bắt đầu lại từ /start');
        return;
    }

    // Check inventory
    const product = await productRepository.findByCode(PRODUCT_CODES.NETFLIX);
    if (!product) {
        await ctx.reply('❌ Sản phẩm không khả dụng.');
        return;
    }

    const isAvailable = await inventoryService.checkAvailability(product.id, quantity);
    if (!isAvailable) {
        await ctx.editMessageText(
            `❌ *Hết hàng*\n\nHiện tại không đủ ${quantity} tài khoản Netflix.\n\n` +
            `Vui lòng liên hệ admin @ducngg411 hoặc chọn số lượng ít hơn.`,
            { parse_mode: 'Markdown' }
        );
        userSessions.delete(userId);
        return;
    }

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

        await ctx.editMessageText(
            `🧾 *Đơn hàng #${order.id}*\n\n` +
            `📦 Sản phẩm: ${order.productName} - ${order.variantName}\n` +
            `🎬 Số tài khoản: ${order.quantity}\n` +
            `💰 Tổng tiền: *${formatCurrency(order.totalVnd)}*\n` +
            `🔖 Mã đơn: \`${order.paymentRef}\`\n` +
            `⏰ Hết hạn sau: ${expiryMinutes} phút\n\n` +
            `Đang gửi QR thanh toán...`,
            { parse_mode: 'Markdown' }
        );

        await ctx.replyWithPhoto(
            { url: qrUrl },
            {
                caption: `📱 Quét mã QR để thanh toán\n💰 Số tiền: *${formatCurrency(order.totalVnd)}*\n🔖 Nội dung: \`${order.paymentRef}\``,
                parse_mode: 'Markdown',
                ...keyboard,
            }
        );

        logger.info({ orderId: order.id, userId }, 'Netflix order created, QR sent');
    } catch (error) {
        logger.error({ error }, 'Failed to create Netflix order');

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

                await ctx.editMessageText(
                    `⚠️ *Bạn đang có đơn hàng chưa hoàn tất*\n\n` +
                    `📦 Sản phẩm: ${activeOrder.productName}${activeOrder.variantName ? ' - ' + activeOrder.variantName : ''}\n` +
                    `🔢 Số lượng: ${activeOrder.quantity}\n` +
                    `💰 Tổng tiền: *${formatCurrency(activeOrder.totalVnd)}*\n` +
                    `⏳ Hết hạn sau: ${expiryMinutes} phút\n\n` +
                    `Bạn muốn làm gì?`,
                    { parse_mode: 'Markdown', ...keyboard }
                );
            }
        } else if (error instanceof Error && error.message === 'INSUFFICIENT_INVENTORY') {
            await ctx.editMessageText('❌ Không đủ hàng. Vui lòng thử lại sau.', {
                parse_mode: 'Markdown',
            });
        } else {
            await ctx.editMessageText('❌ Đã xảy ra lỗi. Vui lòng thử lại sau.', {
                parse_mode: 'Markdown',
            });
        }
    }
}

export async function handleNetflixQuantityCustom(ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) return;

    const session = userSessions.get(userId);
    if (!session || session.step !== 'input_quantity') {
        await ctx.reply('❌ Phiên làm việc không hợp lệ. Vui lòng bắt đầu lại từ /start');
        return;
    }

    await ctx.editMessageText(
        `📝 Vui lòng nhập số lượng tài khoản (${LIMITS.NETFLIX_QTY_MIN}-${LIMITS.NETFLIX_QTY_MAX}):`,
        { parse_mode: 'Markdown' }
    );
}

export async function handleNetflixQuantityInput(ctx: Context, text: string) {
    const userId = ctx.from?.id;
    if (!userId) return;

    const session = userSessions.get(userId);
    if (!session || session.step !== 'input_quantity') {
        return;
    }

    const qty = parseInt(text, 10);
    if (isNaN(qty) || qty < LIMITS.NETFLIX_QTY_MIN || qty > LIMITS.NETFLIX_QTY_MAX) {
        await ctx.reply(
            `❌ Số lượng không hợp lệ. Vui lòng nhập số từ ${LIMITS.NETFLIX_QTY_MIN} đến ${LIMITS.NETFLIX_QTY_MAX}.`
        );
        return;
    }

    await handleNetflixQuantitySelect(ctx, qty);
}
