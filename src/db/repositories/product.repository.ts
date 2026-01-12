import { prisma } from '../client';
import { Product, Variant } from '@prisma/client';

export class ProductRepository {
    async findByCode(code: string): Promise<Product | null> {
        return prisma.product.findUnique({
            where: { code, isActive: true },
        });
    }

    async findAllActive(): Promise<Product[]> {
        return prisma.product.findMany({
            where: { isActive: true },
            include: {
                variants: {
                    where: { isActive: true },
                    orderBy: { priceVnd: 'asc' },
                },
            },
        });
    }

    async findAll(): Promise<Product[]> {
        return prisma.product.findMany({
            orderBy: { createdAt: 'asc' },
        });
    }

    async findById(id: string): Promise<Product | null> {
        return prisma.product.findUnique({
            where: { id },
        });
    }
}

export class VariantRepository {
    async findByCode(code: string): Promise<Variant | null> {
        return prisma.variant.findUnique({
            where: { code, isActive: true },
        });
    }

    async findByProduct(productId: string): Promise<Variant[]> {
        return prisma.variant.findMany({
            where: { productId, isActive: true },
            orderBy: { priceVnd: 'asc' },
        });
    }

    async findById(id: string): Promise<Variant | null> {
        return prisma.variant.findUnique({
            where: { id },
        });
    }
}

export const productRepository = new ProductRepository();
export const variantRepository = new VariantRepository();
