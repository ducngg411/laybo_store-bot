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

    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback(
                '🟦 NÂNG CẤP CANVA PRO TEAMS CHÍNH CHỦ',
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
                '☎️ Hỗ trợ',
                CALLBACK_ACTIONS.SUPPORT
            ),
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
