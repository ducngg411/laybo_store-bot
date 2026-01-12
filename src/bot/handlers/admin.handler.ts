import { Context, Markup } from 'telegraf';
import { config } from '../../shared/config';
import { CALLBACK_ACTIONS } from '../../shared/constants';
import { productRepository } from '../../db/repositories/product.repository';
import { inventoryRepository } from '../../db/repositories/inventory.repository';
import { ProductType } from '@prisma/client';
import { logger } from '../../shared/logger';

interface AdminUploadSession {
    step: 'select_product' | 'waiting_for_data';
    productId?: string;
    productCode?: string;
    productName?: string;
}

const adminSessions = new Map<number, AdminUploadSession>();

/**
 * Check if user is admin
 */
function isAdmin(userId: number): boolean {
    return userId.toString() === config.bot.adminUserId;
}

/**
 * Main admin menu
 */
export async function handleAdminCommand(ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
        await ctx.reply('⛔ Bạn không có quyền truy cập.');
        return;
    }

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📦 Upload Inventory', CALLBACK_ACTIONS.ADMIN_UPLOAD_INVENTORY)],
        [Markup.button.callback('📊 Xem thống kê', CALLBACK_ACTIONS.ADMIN_VIEW_STATS)],
    ]);

    await ctx.reply(
        '🔧 *Admin Panel*\n\nChọn chức năng:',
        { parse_mode: 'Markdown', ...keyboard }
    );
}

/**
 * Handle upload inventory flow - show product selection
 */
export async function handleAdminUploadInventory(ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
        await ctx.answerCbQuery('⛔ Không có quyền');
        return;
    }

    // Get all DIGITAL_GOOD products
    const products = await productRepository.findAll();
    const digitalProducts = products.filter(p => p.type === ProductType.DIGITAL_GOOD && p.isActive);

    if (digitalProducts.length === 0) {
        await ctx.answerCbQuery('⚠️ Không có sản phẩm Digital Good');
        return;
    }

    // Get current stock for each product
    const productsWithStock = await Promise.all(
        digitalProducts.map(async (p) => {
            const available = await inventoryRepository.countAvailable(p.id);
            return { ...p, available };
        })
    );

    const buttons = productsWithStock.map((p) =>
        Markup.button.callback(
            `${p.name} (${p.available} có sẵn)`,
            `${CALLBACK_ACTIONS.ADMIN_SELECT_PRODUCT}${p.code}`
        )
    );

    buttons.push(Markup.button.callback('❌ Hủy', CALLBACK_ACTIONS.ADMIN_UPLOAD_CANCEL));

    const keyboard = Markup.inlineKeyboard(buttons, { columns: 1 });

    // Initialize session
    adminSessions.set(userId, { step: 'select_product' });

    await ctx.editMessageText(
        '📦 *Upload Inventory*\n\nChọn sản phẩm cần upload:',
        { parse_mode: 'Markdown', ...keyboard }
    );
}

/**
 * Handle product selection for upload
 */
export async function handleAdminSelectProduct(ctx: Context, productCode: string) {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
        await ctx.answerCbQuery('⛔ Không có quyền');
        return;
    }

    const session = adminSessions.get(userId);
    if (!session || session.step !== 'select_product') {
        await ctx.answerCbQuery('⚠️ Session không hợp lệ');
        return;
    }

    const product = await productRepository.findByCode(productCode);
    if (!product) {
        await ctx.answerCbQuery('❌ Sản phẩm không tồn tại');
        return;
    }

    // Update session
    adminSessions.set(userId, {
        step: 'waiting_for_data',
        productId: product.id,
        productCode: product.code,
        productName: product.name,
    });

    await ctx.answerCbQuery(`✅ Đã chọn ${product.name}`);

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('❌ Hủy', CALLBACK_ACTIONS.ADMIN_UPLOAD_CANCEL)],
    ]);

    await ctx.editMessageText(
        `📝 *Upload Inventory cho ${product.name}*\n\n` +
        `Vui lòng gửi danh sách tài khoản theo format:\n\n` +
        `\`\`\`\n` +
        `username1|password1|expiryDate1\n` +
        `username2|password2|expiryDate2\n` +
        `username3|password3|expiryDate3\n` +
        `\`\`\`\n\n` +
        `*Ví dụ:*\n` +
        `\`\`\`\n` +
        `acc1@gmail.com|Pass123|1 tháng\n` +
        `acc2@gmail.com|Pass456|1 tháng\n` +
        `acc3@gmail.com|Pass789|1 tháng\n` +
        `\`\`\`\n\n` +
        `⚠️ *Lưu ý:*\n` +
        `• Mỗi dòng là 1 tài khoản\n` +
        `• Phân cách bằng dấu |\n` +
        `• Không có khoảng trắng thừa`,
        { parse_mode: 'Markdown', ...keyboard }
    );
}

/**
 * Handle text input for inventory upload
 */
export async function handleAdminInventoryInput(ctx: Context, text: string) {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
        return;
    }

    const session = adminSessions.get(userId);
    if (!session || session.step !== 'waiting_for_data') {
        return; // Not in upload mode
    }

    try {
        // Parse input
        const lines = text.trim().split('\n').filter(line => line.trim().length > 0);

        if (lines.length === 0) {
            await ctx.reply('⚠️ Không tìm thấy dữ liệu. Vui lòng thử lại.');
            return;
        }

        const accounts: Array<{ username: string; password: string; expiryDate: string }> = [];
        const errors: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const parts = line.split('|');

            if (parts.length !== 3) {
                errors.push(`Dòng ${i + 1}: Format không đúng (cần 3 phần: username|password|expiryDate)`);
                continue;
            }

            const [username, password, expiryDate] = parts.map(p => p.trim());

            if (!username || !password || !expiryDate) {
                errors.push(`Dòng ${i + 1}: Thiếu thông tin`);
                continue;
            }

            accounts.push({ username, password, expiryDate });
        }

        if (accounts.length === 0) {
            await ctx.reply(
                `❌ *Không có tài khoản hợp lệ*\n\n` +
                `Lỗi:\n${errors.join('\n')}`,
                { parse_mode: 'Markdown' }
            );
            return;
        }

        // Show preview and confirm
        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Xác nhận upload', `confirm_upload_${session.productCode}`),
                Markup.button.callback('❌ Hủy', CALLBACK_ACTIONS.ADMIN_UPLOAD_CANCEL),
            ],
        ]);

        let previewMessage = `📊 *Preview Upload*\n\n`;
        previewMessage += `🎯 Sản phẩm: *${session.productName}*\n`;
        previewMessage += `📦 Tổng số tài khoản: *${accounts.length}*\n\n`;

        if (errors.length > 0) {
            previewMessage += `⚠️ *Có ${errors.length} dòng bị lỗi (đã bỏ qua)*\n\n`;
        }

        // Show first 5 accounts as preview
        previewMessage += `*Preview 5 tài khoản đầu:*\n`;
        accounts.slice(0, 5).forEach((acc, idx) => {
            previewMessage += `${idx + 1}. ${acc.username} | ${acc.password} | ${acc.expiryDate}\n`;
        });

        if (accounts.length > 5) {
            previewMessage += `... và ${accounts.length - 5} tài khoản khác\n`;
        }

        previewMessage += `\n*Xác nhận upload?*`;

        // Store accounts in session temporarily
        adminSessions.set(userId, {
            ...session,
            accounts,
        } as any);

        await ctx.reply(previewMessage, { parse_mode: 'Markdown', ...keyboard });

    } catch (error) {
        logger.error({ error, userId }, 'Failed to parse admin inventory input');
        await ctx.reply('❌ Lỗi khi xử lý dữ liệu. Vui lòng kiểm tra lại format.');
    }
}

/**
 * Handle confirm upload
 */
export async function handleAdminConfirmUpload(ctx: Context, productCode: string) {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
        await ctx.answerCbQuery('⛔ Không có quyền');
        return;
    }

    const session = adminSessions.get(userId) as any;
    if (!session || !session.accounts || session.productCode !== productCode) {
        await ctx.answerCbQuery('⚠️ Session không hợp lệ');
        return;
    }

    try {
        await ctx.answerCbQuery('⏳ Đang upload...');

        const accounts = session.accounts;
        let successCount = 0;
        let failCount = 0;

        // Insert to database
        for (const acc of accounts) {
            try {
                await inventoryRepository.create({
                    product: { connect: { id: session.productId } },
                    payload: acc,
                    status: 'AVAILABLE',
                });
                successCount++;
            } catch (error) {
                logger.error({ error, account: acc.username }, 'Failed to insert inventory item');
                failCount++;
            }
        }

        // Clear session
        adminSessions.delete(userId);

        // Send result
        let resultMessage = `✅ *Upload hoàn tất!*\n\n`;
        resultMessage += `🎯 Sản phẩm: *${session.productName}*\n`;
        resultMessage += `✅ Thành công: *${successCount}*\n`;
        if (failCount > 0) {
            resultMessage += `❌ Thất bại: *${failCount}*\n`;
        }

        const currentStock = await inventoryRepository.countAvailable(session.productId);
        resultMessage += `\n📦 Tổng kho hiện tại: *${currentStock}* tài khoản`;

        await ctx.editMessageText(resultMessage, { parse_mode: 'Markdown' });

        logger.info({
            userId,
            productCode,
            successCount,
            failCount,
            totalStock: currentStock,
        }, 'Admin uploaded inventory');

    } catch (error) {
        logger.error({ error, userId }, 'Failed to upload inventory');
        await ctx.editMessageText('❌ Lỗi khi upload. Vui lòng thử lại.', { parse_mode: 'Markdown' });
    }
}

/**
 * Handle cancel upload
 */
export async function handleAdminUploadCancel(ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
        await ctx.answerCbQuery('⛔ Không có quyền');
        return;
    }

    adminSessions.delete(userId);
    await ctx.answerCbQuery('❌ Đã hủy');
    await ctx.editMessageText('❌ Đã hủy upload inventory.');
}

/**
 * Handle view stats
 */
export async function handleAdminViewStats(ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) {
        await ctx.answerCbQuery('⛔ Không có quyền');
        return;
    }

    try {
        const products = await productRepository.findAll();
        const digitalProducts = products.filter(p => p.type === ProductType.DIGITAL_GOOD && p.isActive);

        let statsMessage = `📊 *Thống kê kho hàng*\n\n`;

        for (const product of digitalProducts) {
            const available = await inventoryRepository.countAvailable(product.id);
            const reserved = await inventoryRepository.countReserved(product.id);
            const sold = await inventoryRepository.countSold(product.id);

            statsMessage += `🎯 *${product.name}*\n`;
            statsMessage += `  • Có sẵn: ${available}\n`;
            statsMessage += `  • Đang giữ: ${reserved}\n`;
            statsMessage += `  • Đã bán: ${sold}\n`;
            statsMessage += `  • Tổng: ${available + reserved + sold}\n\n`;
        }

        await ctx.editMessageText(statsMessage, { parse_mode: 'Markdown' });

    } catch (error) {
        logger.error({ error, userId }, 'Failed to get stats');
        await ctx.answerCbQuery('❌ Lỗi khi lấy thống kê');
    }
}
