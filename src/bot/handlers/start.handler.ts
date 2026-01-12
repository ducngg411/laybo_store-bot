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

    const capcutPro14Product = await productRepository.findByCode(PRODUCT_CODES.CAPCUT14DAYS);
    let capcutPro14Count = 0;
    if (capcutPro14Product && capcutPro14Product.type === ProductType.DIGITAL_GOOD) {
        capcutPro14Count = await inventoryRepository.countAvailable(capcutPro14Product.id);
    }

    const capcutTeamProduct = await productRepository.findByCode(PRODUCT_CODES.CAPCUTTEAM);
    let capcutTeamCount = 0;
    if (capcutTeamProduct && capcutTeamProduct.type === ProductType.DIGITAL_GOOD) {
        capcutTeamCount = await inventoryRepository.countAvailable(capcutTeamProduct.id);
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
                `🎬 NETFLIX EXTRA 4K • 55K/1 (Còn ${netflixCount})`,
                CALLBACK_ACTIONS.SELECT_NETFLIX
            ),
        ],
        [
            Markup.button.callback(
                `✂️ CAPCUT PRO 1 TUẦN • 5K/1 (Còn ${capcutCount})`,
                CALLBACK_ACTIONS.SELECT_CAPCUT
            ),
        ],
        [
            Markup.button.callback(
                `✂️ CAPCUT PRO 14 NGÀY • 10K/1 (Còn ${capcutPro14Count})`,
                CALLBACK_ACTIONS.SELECT_CAPCUT14DAYS
            ),
        ],
        [
            Markup.button.callback(
                `✂️ CAPCUT PRO TEAMS 1 THÁNG • 16K/1 (Còn ${capcutTeamCount})`,
                CALLBACK_ACTIONS.SELECT_CAPCUTTEAM
            ),
        ],
        [
            Markup.button.callback(
                `🤖 CHATGPT PLUS 1 THÁNG • 20K/1 (Còn ${chatGPTCount})`,
                CALLBACK_ACTIONS.SELECT_CHATGPT
            ),
        ],
        [
            Markup.button.callback(
                `📧 GMAIL INAP CHPLAY LIVE 15 PHÚT • 1K/1 (Còn ${gmailCount})`,
                CALLBACK_ACTIONS.SELECT_GMAIL
            ),
        ],
        [
            Markup.button.callback(
                `📹 VEO3 UTRAL 45K CREDITS • 35K/1 (Còn ${veo3Count})`,
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

    // Get capcut 14 days product to check inventory
    const capcut14Product = await productRepository.findByCode(PRODUCT_CODES.CAPCUT14DAYS);
    let capcut14Count = 0;
    if (capcut14Product && capcut14Product.type === ProductType.DIGITAL_GOOD) {
        capcut14Count = await inventoryRepository.countAvailable(capcut14Product.id);
    }

    // Get capcut team product to check inventory
    const capcutTeamProduct = await productRepository.findByCode(PRODUCT_CODES.CAPCUTTEAM);
    let capcutTeamCount = 0;
    if (capcutTeamProduct && capcutTeamProduct.type === ProductType.DIGITAL_GOOD) {
        capcutTeamCount = await inventoryRepository.countAvailable(capcutTeamProduct.id);
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
                `🎬 NETFLIX EXTRA 4K • 55K/1 (Còn ${netflixCount})`,
                CALLBACK_ACTIONS.SELECT_NETFLIX
            ),
        ],
        [
            Markup.button.callback(
                `✂️ CAPCUT PRO 1 TUẦN • 5K/1 (Còn ${capcutCount})`,
                CALLBACK_ACTIONS.SELECT_CAPCUT
            ),
        ],
        [
            Markup.button.callback(
                `✂️ CAPCUT PRO 14 NGÀY • 10K/1 (Còn ${capcut14Count})`,
                CALLBACK_ACTIONS.SELECT_CAPCUT14DAYS
            ),
        ],
        [
            Markup.button.callback(
                `✂️ CAPCUT PRO TEAMS 1 THÁNG • 16K/1 (Còn ${capcutTeamCount})`,
                CALLBACK_ACTIONS.SELECT_CAPCUTTEAM
            ),
        ],
        [
            Markup.button.callback(
                `🤖 CHATGPT PLUS 1 THÁNG • 20K/1 (Còn ${chatGPTCount})`,
                CALLBACK_ACTIONS.SELECT_CHATGPT
            ),
        ],
        [
            Markup.button.callback(
                `📧 GMAIL INAP CHPLAY LIVE 15 PHÚT • 1K/1 (Còn ${gmailCount})`,
                CALLBACK_ACTIONS.SELECT_GMAIL
            ),
        ],
        [
            Markup.button.callback(
                `📹 VEO3 UTRAL 45K CREDITS • 35K/1 (Còn ${veo3Count})`,
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
