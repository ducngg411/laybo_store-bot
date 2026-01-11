import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
});

export async function connectDatabase() {
    try {
        await prisma.$connect();
        // Test connection
        await prisma.$queryRaw`SELECT 1`;
        console.log('✅ Database connected');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        throw error;
    }
}

export async function disconnectDatabase() {
    await prisma.$disconnect();
}
