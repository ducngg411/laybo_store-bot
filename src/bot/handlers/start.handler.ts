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

    const chatGPTProduct = await productRepository.findByCode(PRODUCT_CODES.CHATGPT);
    let chatGPTCount = 0;
    if (chatGPTProduct && chatGPTProduct.type === ProductType.DIGITAL_GOOD) {
        chatGPTCount = await inventoryRepository.countAvailable(chatGPTProduct.id);
    }

    const gmailProduct = await productRepository.findByCode(PRODUCT_CODES.GMAIL);
    let gmailCount = 0;
    if (gmailProduct && gmailProduct.type === ProductType.DIGITAL_GOOD) {
        gmailCount = await inventoryRepository.countAvailable(gmailProduct.id);
    }

    const veo3Product = await productRepository.findByCode(PRODUCT_CODES.VEO3);
    let veo3Count = 0;
    if (veo3Product && veo3Product.type === ProductType.DIGITAL_GOOD) {
        veo3Count = await inventoryRepository.countAvailable(veo3Product.id);
    }

    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback(
                '🎨 NÂNG CẤP CANVA PRO TEAMS CHÍNH CHỦ • 10K/1',
                CALLBACK_ACTIONS.SELECT_CANVA
            ),
        ],
        [
            Markup.button.callback(
                `🎬 NETFLIX EXTRAL 4K • 55K/1${netflixCount > 0 ? ` (Còn ${netflixCount})` : ' (Hết hàng)'}`,
                CALLBACK_ACTIONS.SELECT_NETFLIX
            ),
        ],
        [
            Markup.button.callback(
                `✂️ CAPCUT PRO 1 TUẦN • 5K/1${capcutCount > 0 ? ` (Còn ${capcutCount})` : ' (Hết hàng)'}`,
                CALLBACK_ACTIONS.SELECT_CAPCUT
            ),
        ],
        [
            Markup.button.callback(
                `🤖 CHATGPT PLUS 1 THÁNG • 20K/1${chatGPTCount > 0 ? ` (Còn ${chatGPTCount})` : ' (Hết hàng)'}`,
                CALLBACK_ACTIONS.SELECT_CHATGPT
            ),
        ],
        [
            Markup.button.callback(
                `📧 GMAIL INAP CHPLAY LIVE 15 PHÚT • 1K/1${gmailCount > 0 ? ` (Còn ${gmailCount})` : ' (Hết hàng)'}`,
                CALLBACK_ACTIONS.SELECT_GMAIL
            ),
        ],
        [
            Markup.button.callback(
                `📹 VEO3 UTRAL 45K CREDITS • 35K/1${veo3Count > 0 ? ` (Còn ${veo3Count})` : ' (Hết hàng)'}`,
                CALLBACK_ACTIONS.SELECT_VEO3
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

    // Get chatGPT product to check inventory
    const chatGPTProduct = await productRepository.findByCode(PRODUCT_CODES.CHATGPT);
    let chatGPTCount = 0;
    if (chatGPTProduct && chatGPTProduct.type === ProductType.DIGITAL_GOOD) {
        chatGPTCount = await inventoryRepository.countAvailable(chatGPTProduct.id);
    }

    const gmailProduct = await productRepository.findByCode(PRODUCT_CODES.GMAIL);
    let gmailCount = 0;
    if (gmailProduct && gmailProduct.type === ProductType.DIGITAL_GOOD) {
        gmailCount = await inventoryRepository.countAvailable(gmailProduct.id);
    }

    const veo3Product = await productRepository.findByCode(PRODUCT_CODES.VEO3);
    let veo3Count = 0;
    if (veo3Product && veo3Product.type === ProductType.DIGITAL_GOOD) {
        veo3Count = await inventoryRepository.countAvailable(veo3Product.id);
    }

    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback(
                '🎨 NÂNG CẤP CANVA PRO TEAMS CHÍNH CHỦ • 10K/1',
                CALLBACK_ACTIONS.SELECT_CANVA
            ),
        ],
        [
            Markup.button.callback(
                `🎬 NETFLIX EXTRAL 4K • 55K/1${netflixCount > 0 ? ` (Còn ${netflixCount})` : ' (Hết hàng)'}`,
                CALLBACK_ACTIONS.SELECT_NETFLIX
            ),
        ],
        [
            Markup.button.callback(
                `✂️ CAPCUT PRO 1 TUẦN • 5K/1${capcutCount > 0 ? ` (Còn ${capcutCount})` : ' (Hết hàng)'}`,
                CALLBACK_ACTIONS.SELECT_CAPCUT
            ),
        ],
        [
            Markup.button.callback(
                `🤖 CHATGPT PLUS 1 THÁNG • 20K/1${chatGPTCount > 0 ? ` (Còn ${chatGPTCount})` : ' (Hết hàng)'}`,
                CALLBACK_ACTIONS.SELECT_CHATGPT
            ),
        ],
        [
            Markup.button.callback(
                `📧 GMAIL INAP CHPLAY LIVE 15 PHÚT • 1K/1${gmailCount > 0 ? ` (Còn ${gmailCount})` : ' (Hết hàng)'}`,
                CALLBACK_ACTIONS.SELECT_GMAIL
            ),
        ],
        [
            Markup.button.callback(
                `📹 VEO3 UTRAL 45K CREDITS • 35K/1${veo3Count > 0 ? ` (Còn ${veo3Count})` : ' (Hết hàng)'}`,
                CALLBACK_ACTIONS.SELECT_VEO3
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
        `Chọn dịch vụ bạn muốn mua:`,
        { parse_mode: 'Markdown', ...keyboard }
    );
}
