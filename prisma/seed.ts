import { PrismaClient, ProductType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create Canva product
    const canvaProduct = await prisma.product.upsert({
        where: { code: 'CANVA' },
        update: {},
        create: {
            code: 'CANVA',
            name: 'Canva Pro',
            type: ProductType.SERVICE,
            isActive: true,
        },
    });

    // Create Canva variants
    const canvaVariants = [
        { code: 'CANVA_1M', name: '1 tháng', durationMonths: 1, priceVnd: 50000 },
        { code: 'CANVA_3M', name: '3 tháng', durationMonths: 3, priceVnd: 140000 },
        { code: 'CANVA_6M', name: '6 tháng', durationMonths: 6, priceVnd: 270000 },
        { code: 'CANVA_12M', name: '12 tháng', durationMonths: 12, priceVnd: 500000 },
    ];

    for (const variant of canvaVariants) {
        await prisma.variant.upsert({
            where: { code: variant.code },
            update: {},
            create: {
                ...variant,
                productId: canvaProduct.id,
                isActive: true,
            },
        });
    }

    console.log(`✅ Created Canva product with ${canvaVariants.length} variants`);

    // Create Netflix product
    const netflixProduct = await prisma.product.upsert({
        where: { code: 'NETFLIX' },
        update: {},
        create: {
            code: 'NETFLIX',
            name: 'Netflix Premium',
            type: ProductType.DIGITAL_GOOD,
            isActive: true,
        },
    });

    // Create Netflix variants
    const netflixVariants = [
        { code: 'NETFLIX_1M', name: '1 tháng', durationMonths: 1, priceVnd: 80000 },
    ];

    for (const variant of netflixVariants) {
        await prisma.variant.upsert({
            where: { code: variant.code },
            update: {},
            create: {
                ...variant,
                productId: netflixProduct.id,
                isActive: true,
            },
        });
    }

    console.log(`✅ Created Netflix product with ${netflixVariants.length} variants`);

    // Optional: Create sample inventory for Netflix (for testing)
    const sampleInventory = [
        {
            username: 'netflix_demo1@example.com',
            password: 'DemoPass123',
            expiryDate: '2026-12-31',
        },
        {
            username: 'netflix_demo2@example.com',
            password: 'DemoPass456',
            expiryDate: '2026-12-31',
        },
    ];

    for (const item of sampleInventory) {
        await prisma.inventoryItem.create({
            data: {
                productId: netflixProduct.id,
                payload: item,
                status: 'AVAILABLE',
            },
        });
    }

    console.log(`✅ Created ${sampleInventory.length} Netflix inventory items`);
    console.log('🎉 Seeding completed!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
