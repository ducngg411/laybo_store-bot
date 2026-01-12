import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
    BOT_TOKEN: z.string().min(1, 'BOT_TOKEN is required'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    ADMIN_CHAT_ID: z.string().min(1, 'ADMIN_CHAT_ID is required'),
    ADMIN_USER_ID: z.string().default('1673823142'), // Admin user ID for permission check
    SEPAY_WEBHOOK_SECRET: z.string().optional(),
    SEPAY_ACCOUNT_NUMBER: z.string().default('0123456789'),
    SEPAY_ACCOUNT_NAME: z.string().default('NGUYEN VAN A'),
    SEPAY_BANK_CODE: z.string().default('MB'),
    SEPAY_TEMPLATE: z.string().default('compact'),
    BASE_URL: z.string().url().optional(),
    ORDER_EXPIRE_MINUTES: z.string().default('2'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
}

export const config = {
    bot: {
        token: parsed.data.BOT_TOKEN,
        adminChatId: parsed.data.ADMIN_CHAT_ID,
        adminUserId: parsed.data.ADMIN_USER_ID,
    },
    database: {
        url: parsed.data.DATABASE_URL,
    },
    sepay: {
        webhookSecret: parsed.data.SEPAY_WEBHOOK_SECRET,
        accountNumber: parsed.data.SEPAY_ACCOUNT_NUMBER,
        accountName: parsed.data.SEPAY_ACCOUNT_NAME,
        bankCode: parsed.data.SEPAY_BANK_CODE,
        template: parsed.data.SEPAY_TEMPLATE,
    },
    app: {
        baseUrl: parsed.data.BASE_URL || '',
        orderExpireMinutes: parseInt(parsed.data.ORDER_EXPIRE_MINUTES, 10),
        nodeEnv: parsed.data.NODE_ENV,
        port: parseInt(parsed.data.PORT, 10),
    },
} as const;
