import { PrismaClient, ProductType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // // Create Canva product
    // const canvaProduct = await prisma.product.upsert({
    //     where: { code: 'CANVA' },
    //     update: {},
    //     create: {
    //         code: 'CANVA',
    //         name: 'Canva Pro',
    //         type: ProductType.SERVICE,
    //         isActive: true,
    //     },
    // });

    // // Create Canva variants
    // const canvaVariants = [
    //     { code: 'CANVA_1M', name: '1 tháng', durationMonths: 1, priceVnd: 50000 },
    //     { code: 'CANVA_3M', name: '3 tháng', durationMonths: 3, priceVnd: 140000 },
    //     { code: 'CANVA_6M', name: '6 tháng', durationMonths: 6, priceVnd: 270000 },
    //     { code: 'CANVA_12M', name: '12 tháng', durationMonths: 12, priceVnd: 500000 },
    // ];

    // for (const variant of canvaVariants) {
    //     await prisma.variant.upsert({
    //         where: { code: variant.code },
    //         update: {},
    //         create: {
    //             ...variant,
    //             productId: canvaProduct.id,
    //             isActive: true,
    //         },
    //     });
    // }

    // console.log(`✅ Created Canva product with ${canvaVariants.length} variants`);

    // // Create Netflix product
    // const netflixProduct = await prisma.product.upsert({
    //     where: { code: 'NETFLIX' },
    //     update: {},
    //     create: {
    //         code: 'NETFLIX',
    //         name: 'Netflix Premium',
    //         type: ProductType.DIGITAL_GOOD,
    //         isActive: true,
    //     },
    // });

    // // Create Netflix variants
    // const netflixVariants = [
    //     { code: 'NETFLIX_1M', name: '1 tháng', durationMonths: 1, priceVnd: 80000 },
    // ];

    // for (const variant of netflixVariants) {
    //     await prisma.variant.upsert({
    //         where: { code: variant.code },
    //         update: {},
    //         create: {
    //             ...variant,
    //             productId: netflixProduct.id,
    //             isActive: true,
    //         },
    //     });
    // }

    // console.log(`✅ Created Netflix product with ${netflixVariants.length} variants`);

    // // Create 50 Netflix inventory accounts
    // const sampleInventory = [];
    // for (let i = 1; i <= 50; i++) {
    //     sampleInventory.push({
    //         username: `netflix_account${i}@example.com`,
    //         password: `NetflixPass${i}${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    //         expiryDate: '2026-12-31',
    //     });
    // }

    // for (const item of sampleInventory) {
    //     await prisma.inventoryItem.create({
    //         data: {
    //             productId: netflixProduct.id,
    //             payload: item,
    //             status: 'AVAILABLE',
    //         },
    //     });
    // }

    // console.log(`✅ Created ${sampleInventory.length} Netflix inventory items`);
    // console.log('🎉 Seeding completed!');

    // // Thêm sau phần Netflix product

    // Create Capcut product
    const capcutProduct = await prisma.product.upsert({
        where: { code: 'CAPCUT' },
        update: {},
        create: {
            code: 'CAPCUT',
            name: 'Capcut Pro',
            type: ProductType.DIGITAL_GOOD,
            isActive: true,
        },
    });

    // Create Capcut variants
    const capcutVariants = [
        { code: 'CAPCUT_1W', name: '1 tuần', durationMonths: 0.25, priceVnd: 5000 },
    ];

    for (const variant of capcutVariants) {
        await prisma.variant.upsert({
            where: { code: variant.code },
            update: {},
            create: {
                ...variant,
                productId: capcutProduct.id,
                isActive: true,
            },
        });
    }

    console.log(`✅ Created Capcut product with ${capcutVariants.length} variants`);

    // Create 30 Capcut inventory accounts
    const capcutInventory = [];
    for (let i = 1; i <= 30; i++) {
        capcutInventory.push({
            username: `capcut_account${i}@example.com`,
            password: `CapcutPass${i}${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            expiryDate: '1 tuần',
        });
    }

    for (const item of capcutInventory) {
        await prisma.inventoryItem.create({
            data: {
                productId: capcutProduct.id,
                payload: item,
                status: 'AVAILABLE',
            },
        });
    }

    console.log(`✅ Created ${capcutInventory.length} Capcut inventory items`);

}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
