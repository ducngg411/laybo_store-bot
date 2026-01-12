import { Context, Markup } from 'telegraf';
import { orderService } from '../../services/order.service';
import { productRepository, variantRepository } from '../../db/repositories/product.repository';
import { paymentService } from '../../services/payment.service';
import { logger } from '../../shared/logger';
import {
    CALLBACK_ACTIONS,
    PRODUCT_CODES,
    LIMITS,
} from '../../shared/constants';
import { validateEmailList } from '../../shared/validators';
import { formatCurrency } from '../../shared/utils';

// Session state for Canva flow
interface CanvaSession {
    step: 'select_plan' | 'input_quantity' | 'input_emails';
    variantCode?: string;
    variantName?: string;
    unitPrice?: number;
    quantity?: number;
}

const userSessions = new Map<number, CanvaSession>();

export async function handleCanvaSelect(ctx: Context) {
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
    const product = await productRepository.findByCode(PRODUCT_CODES.CANVA);
    if (!product) {
        await ctx.reply('❌ Sản phẩm không khả dụng.');
        return;
    }

    const variants = await variantRepository.findByProduct(product.id);
    const buttons = variants.map((v) =>
        Markup.button.callback(
            `${v.name} - ${formatCurrency(v.priceVnd)}`,
            `${CALLBACK_ACTIONS.CANVA_PLAN_PREFIX}${v.code}`
        )
    );

    // Add back button
    buttons.push(Markup.button.callback('↩️ Quay lại', CALLBACK_ACTIONS.CANVA_GO_BACK_TO_MAIN));

    const keyboard = Markup.inlineKeyboard(buttons, { columns: 1 });

    userSessions.set(userId, { step: 'select_plan' });

    await ctx.reply(
        `📦 *Canva Pro Teams – Bảo hành full*
            • Gói Pro Teams cao cấp (*không phải Edu*)
            • Mở khóa toàn bộ template & tài nguyên
            • Canva AI: 3 lượt / tuần
            • Resize, xóa phông, chỉnh sửa nâng cao

        👉 Vui lòng chọn gói bên dưới`,
        {
            parse_mode: 'Markdown',
            ...keyboard,
        }
    );
}

export async function handleCanvaPlanSelect(ctx: Context, variantCode: string) {
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
            Markup.button.callback('1', `${CALLBACK_ACTIONS.CANVA_QTY_PREFIX}1`),
            Markup.button.callback('2', `${CALLBACK_ACTIONS.CANVA_QTY_PREFIX}2`),
            Markup.button.callback('3', `${CALLBACK_ACTIONS.CANVA_QTY_PREFIX}3`),
        ],
        [
            Markup.button.callback('4', `${CALLBACK_ACTIONS.CANVA_QTY_PREFIX}4`),
            Markup.button.callback('5', `${CALLBACK_ACTIONS.CANVA_QTY_PREFIX}5`),
        ],
        [Markup.button.callback('✏️ Nhập số khác', CALLBACK_ACTIONS.CANVA_QTY_CUSTOM)],
        [Markup.button.callback('↩️ Quay lại', CALLBACK_ACTIONS.CANVA_GO_BACK_TO_PLANS)],
    ]);

    await ctx.editMessageText(
        `✅ Đã chọn: *${variant.name}* - ${formatCurrency(variant.priceVnd)}/email\n\n` +
        `💬 Bạn cần nâng cấp bao nhiêu email?`,
        {
            parse_mode: 'Markdown',
            ...keyboard,
        }
    );
}

export async function handleCanvaQuantitySelect(ctx: Context, quantity: number) {
    const userId = ctx.from?.id;
    if (!userId) return;

    const session = userSessions.get(userId);
    if (!session || session.step !== 'input_quantity') {
        await ctx.reply('❌ Phiên làm việc không hợp lệ. Vui lòng bắt đầu lại từ /start');
        return;
    }

    // Update session
    session.quantity = quantity;
    session.step = 'input_emails';
    userSessions.set(userId, session);

    const totalPrice = (session.unitPrice || 0) * quantity;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('↩️ Quay lại', CALLBACK_ACTIONS.CANVA_GO_BACK_TO_QUANTITY)],
    ]);

    await ctx.editMessageText(
        `✅ Gói: *${session.variantName}*\n` +
        `✅ Số lượng: *${quantity} email*\n` +
        `💰 Tổng: *${formatCurrency(totalPrice)}*\n\n` +
        `📧 Vui lòng gửi danh sách email (mỗi email 1 dòng):\n\n` +
        `*Ví dụ:*\n` +
        `\`\`\`\n` +
        `email1@gmail.com\n` +
        `email2@gmail.com\n` +
        `\`\`\``,
        { parse_mode: 'Markdown', ...keyboard }
    );
}

export async function handleCanvaQuantityCustom(ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) return;

    const session = userSessions.get(userId);
    if (!session || session.step !== 'input_quantity') {
        await ctx.reply('❌ Phiên làm việc không hợp lệ. Vui lòng bắt đầu lại từ /start');
        return;
    }

    await ctx.editMessageText(
        `📝 Vui lòng nhập số lượng email cần nâng cấp (${LIMITS.EMAIL_MIN}-${LIMITS.EMAIL_MAX}):`,
        { parse_mode: 'Markdown' }
    );
}

export async function handleCanvaEmailInput(ctx: Context, text: string) {
    const userId = ctx.from?.id;
    if (!userId) return;

    const session = userSessions.get(userId);
    if (!session || session.step !== 'input_emails') {
        // Check if user is inputting custom quantity
        if (session?.step === 'input_quantity') {
            const qty = parseInt(text, 10);
            if (isNaN(qty) || qty < LIMITS.EMAIL_MIN || qty > LIMITS.EMAIL_MAX) {
                await ctx.reply(
                    `❌ Số lượng không hợp lệ. Vui lòng nhập số từ ${LIMITS.EMAIL_MIN} đến ${LIMITS.EMAIL_MAX}.`
                );
                return;
            }
            await handleCanvaQuantitySelect(ctx, qty);
        }
        return;
    }

    const quantity = session.quantity!;

    // Validate emails
    try {
        const emails = validateEmailList(text, quantity);

        // Create order
        const order = await orderService.createOrder({
            userId: BigInt(userId),
            username: ctx.from?.username,
            productCode: PRODUCT_CODES.CANVA,
            variantCode: session.variantCode,
            quantity,
            metadata: { emails },
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

        // Send QR and save messageId
        const sentMessage = await ctx.replyWithPhoto(
            { url: qrUrl },
            {
                caption:
                    `🧾 *Đơn hàng #${order.id}*\n\n` +
                    `📦 Sản phẩm: ${order.productName} - ${order.variantName}\n` +
                    `📧 Số email: ${order.quantity}\n` +
                    `💰 Tổng tiền: *${formatCurrency(order.totalVnd)}*\n` +
                    `🔖 Mã đơn: \`${order.paymentRef}\`\n` +
                    `⏰ Hết hạn sau: ${expiryMinutes} phút\n\n` +
                    `📱 Quét mã QR để thanh toán\n\n` +
                    `ℹ️ Vui lòng chuyển khoản đúng nội dung & số tiền để hệ thống tự động xử lý.\n` +
                    `⏱️ Đơn được giữ trong ${expiryMinutes} phút.`,
                parse_mode: 'Markdown',
                ...keyboard,
            }
        );

        // Save QR messageId to order metadata for expiry notification
        if (sentMessage.message_id) {
            await orderService.updateOrderMetadata(order.id, {
                ...order.metadata,
                qrMessageId: sentMessage.message_id,
            });
        }

        logger.info({
            orderId: order.id,
            userId,
            qrMessageId: sentMessage.message_id
        }, 'Canva order created, QR sent with messageId saved');
    } catch (error) {
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

                await ctx.reply(
                    `⚠️ *Bạn đang có đơn hàng chưa hoàn tất*\n\n` +
                    `📦 Sản phẩm: ${activeOrder.productName}${activeOrder.variantName ? ' - ' + activeOrder.variantName : ''}\n` +
                    `🔢 Số lượng: ${activeOrder.quantity}\n` +
                    `💰 Tổng tiền: *${formatCurrency(activeOrder.totalVnd)}*\n` +
                    `⏳ Hết hạn sau: ${expiryMinutes} phút\n\n` +
                    `Bạn muốn làm gì?`,
                    { parse_mode: 'Markdown', ...keyboard }
                );
            }
        } else if (error instanceof Error) {
            await ctx.reply(`❌ ${error.message}\n\nVui lòng gửi lại danh sách email.`);
        } else {
            logger.error({ error }, 'Failed to process email input');
            await ctx.reply('❌ Đã xảy ra lỗi. Vui lòng thử lại sau.');
        }
    }
}

/**
 * Handle "Quay lại" to main menu
 */
export async function handleCanvaGoBackToMain(ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) return;

    // Clear session
    userSessions.delete(userId);

    await ctx.answerCbQuery('↩️ Quay lại');

    // Import handleStart from start.handler
    const { handleStart } = await import('./start.handler');
    await handleStart(ctx);
}

/**
 * Handle "Quay lại" to plan selection
 */
export async function handleCanvaGoBackToPlans(ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) return;

    await ctx.answerCbQuery('↩️ Quay lại');
    await handleCanvaSelect(ctx);
}

/**
 * Handle "Quay lại" to quantity selection
 */
export async function handleCanvaGoBackToQuantity(ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) return;

    const session = userSessions.get(userId);
    if (!session || !session.variantCode) {
        await ctx.reply('❌ Phiên làm việc không hợp lệ. Vui lòng bắt đầu lại từ /start');
        return;
    }

    await ctx.answerCbQuery('↩️ Quay lại');
    await handleCanvaPlanSelect(ctx, session.variantCode);
}