import { Context, Markup } from 'telegraf';
import { CALLBACK_ACTIONS, BOT_MESSAGES } from '../../shared/constants';

export async function handleStart(ctx: Context) {
    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('🟦 Canva', CALLBACK_ACTIONS.SELECT_CANVA),
            Markup.button.callback('🎬 Netflix', CALLBACK_ACTIONS.SELECT_NETFLIX),
        ],
        [Markup.button.callback('☎️ Hỗ trợ', CALLBACK_ACTIONS.SUPPORT)],
    ]);

    await ctx.reply(BOT_MESSAGES.WELCOME, {
        parse_mode: 'Markdown',
        ...keyboard,
    });
}

export async function handleSupport(ctx: Context) {
    await ctx.reply(BOT_MESSAGES.SUPPORT, { parse_mode: 'Markdown' });
}
