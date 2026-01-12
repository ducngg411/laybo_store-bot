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

    // // Create Capcut product
    // const chatGPTProduct = await prisma.product.upsert({
    //     where: { code: 'CHATGPT' },
    //     update: {},
    //     create: {
    //         code: 'CHATGPT',
    //         name: 'Capcut Pro',
    //         type: ProductType.DIGITAL_GOOD,
    //         isActive: true,
    //     },
    // });

    // // Create Capcut variants
    // const chatGPTVariants = [
    //     { code: 'CHATGPT_1W', name: '1 tuần', durationMonths: 0.25, priceVnd: 5000 },
    // ];

    // for (const variant of chatGPTVariants) {
    //     await prisma.variant.upsert({
    //         where: { code: variant.code },
    //         update: {},
    //         create: {
    //             ...variant,
    //             productId: chatGPTProduct.id,
    //             isActive: true,
    //         },
    //     });
    // }

    // console.log(`✅ Created Capcut product with ${chatGPTVariants.length} variants`);

    // // Create 30 Capcut inventory accounts
    // const chatGPTInventory = [];
    // for (let i = 1; i <= 30; i++) {
    //     chatGPTInventory.push({
    //         username: `chatGPT_account${i}@example.com`,
    //         password: `CapcutPass${i}${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    //         expiryDate: '1 tuần',
    //     });
    // }

    // for (const item of chatGPTInventory) {
    //     await prisma.inventoryItem.create({
    //         data: {
    //             productId: chatGPTProduct.id,
    //             payload: item,
    //             status: 'AVAILABLE',
    //         },
    //     });
    // }

    // console.log(`✅ Created ${chatGPTInventory.length} Capcut inventory items`);

    // Create ChatGPT product
    const chatGPTProduct = await prisma.product.upsert({
        where: { code: 'CHATGPT' },
        update: {},
        create: {
            code: 'CHATGPT',
            name: 'ChatGPT Plus',
            type: ProductType.DIGITAL_GOOD,
            isActive: true,
        },
    });

    // Create ChatGPT variants
    const chatGPTVariants = [
        { code: 'CHATGPT_1M', name: '1 tháng', durationMonths: 1, priceVnd: 45000 },
    ];

    for (const variant of chatGPTVariants) {
        await prisma.variant.upsert({
            where: { code: variant.code },
            update: {},
            create: {
                ...variant,
                productId: chatGPTProduct.id,
                isActive: true,
            },
        });
    }

    console.log(`✅ Created ChatGPT product with ${chatGPTVariants.length} variants`);

    // Create 30 ChatGPT inventory accounts
    const chatGPTInventory = [];
    for (let i = 1; i <= 30; i++) {
        chatGPTInventory.push({
            username: `chatgpt_account${i}@example.com`,
            password: `ChatGPTPass${i}${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            expiryDate: '1 tháng',
        });
    }

    for (const item of chatGPTInventory) {
        await prisma.inventoryItem.create({
            data: {
                productId: chatGPTProduct.id,
                payload: item,
                status: 'AVAILABLE',
            },
        });
    }

    console.log(`✅ Created ${chatGPTInventory.length} ChatGPT inventory items`);

    // // Create Gmail product
    // const gmailProduct = await prisma.product.upsert({
    //     where: { code: 'GMAIL' },
    //     update: {},
    //     create: {
    //         code: 'GMAIL',
    //         name: 'Gmail Inapp CHPLAY',
    //         type: ProductType.DIGITAL_GOOD,
    //         isActive: true,
    //     },
    // });

    // // Create Capcut variants
    // const gmailVariants = [
    //     { code: 'GMAIL_15m', name: 'Gmail Inapp 15 phút', durationMonths: 0.25, priceVnd: 5000 },
    // ];

    // for (const variant of gmailVariants) {
    //     await prisma.variant.upsert({
    //         where: { code: variant.code },
    //         update: {},
    //         create: {
    //             ...variant,
    //             productId: gmailProduct.id,
    //             isActive: true,
    //         },
    //     });
    // }

    // console.log(`✅ Created Gmail product with ${gmailVariants.length} variants`);

    // // Create 30 ChatGPT inventory accounts
    // const gmailInventory = [];
    // for (let i = 1; i <= 30; i++) {
    //     gmailInventory.push({
    //         username: `gmail_account${i}@example.com`,
    //         password: `GmailPass${i}${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    //         expiryDate: '15 phút',
    //     });
    // }

    // for (const item of gmailInventory) {
    //     await prisma.inventoryItem.create({
    //         data: {
    //             productId: gmailProduct.id,
    //             payload: item,
    //             status: 'AVAILABLE',
    //         },
    //     });
    // }

    // console.log(`✅ Created ${gmailInventory.length} Gmail inventory items`);

    // Create VEO3 product
    const VEO3Product = await prisma.product.upsert({
        where: { code: 'VEO3' },
        update: {},
        create: {
            code: 'VEO3',
            name: 'VEO3 UTRAL 45K CREDITS',
            type: ProductType.DIGITAL_GOOD,
            isActive: true,
        },
    });

    // Create Capcut variants
    const VEO3Variants = [
        { code: 'VEO3_45k', name: 'VEO3 UTRAL 45K CREDITS', durationMonths: 0.25, priceVnd: 45000 },
    ];

    for (const variant of VEO3Variants) {
        await prisma.variant.upsert({
            where: { code: variant.code },
            update: {},
            create: {
                ...variant,
                productId: VEO3Product.id,
                isActive: true,
            },
        });
    }

    console.log(`✅ Created VEO3 product with ${VEO3Variants.length} variants`);

    // Create 30 ChatGPT inventory accounts
    const VEO3Inventory = [];
    for (let i = 1; i <= 30; i++) {
        VEO3Inventory.push({
            username: `veo3_account${i}@example.com`,
            password: `VEO3Pass${i}${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            expiryDate: '1 tháng',
        });
    }

    for (const item of VEO3Inventory) {
        await prisma.inventoryItem.create({
            data: {
                productId: VEO3Product.id,
                payload: item,
                status: 'AVAILABLE',
            },
        });
    }

    console.log(`✅ Created ${VEO3Inventory.length} VEO3 inventory items`);

}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
