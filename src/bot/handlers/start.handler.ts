import { Context, Markup } from 'telegraf';
import { CALLBACK_ACTIONS, BOT_MESSAGES, PRODUCT_CODES } from '../../shared/constants';
import { productRepository } from '../../db/repositories/product.repository';
import { inventoryRepository } from '../../db/repositories/inventory.repository';
import { ProductType } from '@prisma/client';

export async function handleStart(ctx: Context) {
    // Get Netflix product to check inventory
    const netflixProduct = await productRepository.findByCode(PRODUCT_CODES.NETFLIX);
    let netflixCount = 0;
    if (netflixProduct && netflixProduct.type === ProductType.DIGITAL_GOOD) {
        netflixCount = await inventoryRepository.countAvailable(netflixProduct.id);
    }

    const capcutProduct = await productRepository.findByCode(PRODUCT_CODES.CAPCUT);
    let capcutCount = 0;
    if (capcutProduct && capcutProduct.type === ProductType.DIGITAL_GOOD) {
        capcutCount = await inventoryRepository.countAvailable(capcutProduct.id);
    }

    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback(
                '🎨 NÂNG CẤP CANVA PRO TEAMS CHÍNH CHỦ',
                CALLBACK_ACTIONS.SELECT_CANVA
            ),
        ],
        [
            Markup.button.callback(
                `🎬 TÀI KHOẢN NETFLIX PREMIUM 4K${netflixCount > 0 ? ` (Còn ${netflixCount})` : ' (Hết hàng)'}`,
                CALLBACK_ACTIONS.SELECT_NETFLIX
            ),
        ],
        [
            Markup.button.callback(
                `✂️ TÀI KHOẢN CAPCUT PRO 1 TUẦN${capcutCount > 0 ? ` (Còn ${capcutCount})` : ' (Hết hàng)'}`,
                CALLBACK_ACTIONS.SELECT_CAPCUT
            ),
        ],
        [
            Markup.button.callback('🔄 Cập nhật kho hàng', CALLBACK_ACTIONS.REFRESH_INVENTORY),
            Markup.button.callback('☎️ Hỗ trợ', CALLBACK_ACTIONS.SUPPORT),
        ],
    ]);

    await ctx.reply(BOT_MESSAGES.WELCOME, {
        parse_mode: 'Markdown',
        ...keyboard,
    });
}

export async function handleSupport(ctx: Context) {
    await ctx.reply(BOT_MESSAGES.SUPPORT, { parse_mode: 'Markdown' });
}

export async function handleRefreshInventory(ctx: Context) {
    // Get Netflix product to check inventory
    const netflixProduct = await productRepository.findByCode(PRODUCT_CODES.NETFLIX);
    let netflixCount = 0;
    if (netflixProduct && netflixProduct.type === ProductType.DIGITAL_GOOD) {
        netflixCount = await inventoryRepository.countAvailable(netflixProduct.id);
    }

    // Get capcut product to check inventory
    const capcutProduct = await productRepository.findByCode(PRODUCT_CODES.CAPCUT);
    let capcutCount = 0;
    if (capcutProduct && capcutProduct.type === ProductType.DIGITAL_GOOD) {
        capcutCount = await inventoryRepository.countAvailable(capcutProduct.id);
    }
    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback(
                '🔵 NÂNG CẤP CANVA PRO TEAMS CHÍNH CHỦ',
                CALLBACK_ACTIONS.SELECT_CANVA
            ),
        ],
        [
            Markup.button.callback(
                `🎬 TÀI KHOẢN NETFLIX PREMIUM 4K${netflixCount > 0 ? ` (Còn ${netflixCount})` : ' (Hết hàng)'}`,
                CALLBACK_ACTIONS.SELECT_NETFLIX
            ),
        ],
        [
            Markup.button.callback(
                `✂️ TÀI KHOẢN CAPCUT PRO 1 TUẦN${capcutCount > 0 ? ` (Còn ${capcutCount})` : ' (Hết hàng)'}`,
                CALLBACK_ACTIONS.SELECT_CAPCUT
            ),
        ],
        [
            Markup.button.callback('🔄 Cập nhật kho hàng', CALLBACK_ACTIONS.REFRESH_INVENTORY),
            Markup.button.callback('☎️ Hỗ trợ', CALLBACK_ACTIONS.SUPPORT),
        ],
    ]);

    await ctx.answerCbQuery('✅ Đã cập nhật!');
    await ctx.editMessageText(
        `🏪 *LayBo Store - Kho hàng*\n\n` +
        `🎬 Netflix: ${netflixCount > 0 ? `*${netflixCount} tài khoản*` : '*Hết hàng*'}\n\n` +
        `Chọn dịch vụ bạn muốn mua:`,
        { parse_mode: 'Markdown', ...keyboard }
    );
}
